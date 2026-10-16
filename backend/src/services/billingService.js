const { prisma, Prisma } = require('../prisma');
const { getNepaliMonth } = require('../utils/nepaliCalendar');
const { recalculateBalance } = require('./balanceService');
const { logAudit } = require('./auditService');

/**
 * Preview monthly billing for a given year, month, and target filter.
 *
 * @param {object} params
 * @param {number} params.year - Gregorian year
 * @param {number} params.month - Gregorian month (1-12)
 * @param {string} [params.target='ALL'] - 'ALL' | 'GROUP' | 'SELECTED'
 * @param {string} [params.feeGroupId] - Fee group ID if target is 'GROUP'
 * @param {string[]} [params.studentIds] - Array of student IDs if target is 'SELECTED'
 * @param {object} [params.adjustments] - Map of { [studentId]: adjustedAmount }
 * @returns {Promise<object>} Preview results with eligible and excluded students
 */
async function previewBilling({
  year,
  month,
  target = 'ALL',
  feeGroupId = null,
  studentIds = [],
  adjustments = {}
}) {
  const nepaliMonth = getNepaliMonth(year, month);

  // Check if a billing period already exists
  const existingPeriod = await prisma.billingPeriod.findUnique({
    where: {
      year_month: {
        year: Number(year),
        month: Number(month)
      }
    },
    include: {
      ledgerEntries: {
        where: {
          entryType: 'MONTHLY_FEE'
        },
        select: {
          studentId: true
        }
      }
    }
  });

  const alreadyBilledStudentIds = new Set(
    existingPeriod ? existingPeriod.ledgerEntries.map((e) => e.studentId) : []
  );

  // Build query filter based on target
  const studentWhere = {
    status: 'ACTIVE'
  };

  if (target === 'GROUP') {
    if (!feeGroupId) {
      throw new Error('feeGroupId is required when target is GROUP');
    }
    studentWhere.currentFeeGroupId = feeGroupId;
  } else if (target === 'SELECTED') {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error('studentIds array is required when target is SELECTED');
    }
    studentWhere.id = { in: studentIds };
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      currentFeeGroup: true
    },
    orderBy: {
      roomNumber: 'asc'
    }
  });

  const eligible = [];
  const excluded = [];
  let totalAmount = new Prisma.Decimal('0.00');
  const feeGroupBreakdown = {};

  for (const student of students) {
    if (alreadyBilledStudentIds.has(student.id)) {
      excluded.push({
        studentId: student.id,
        studentCode: student.studentId,
        name: student.fullName,
        roomNumber: student.roomNumber,
        reason: `Already billed for ${nepaliMonth}`
      });
      continue;
    }

    // Determine billing fee amount
    let feeAmount;
    if (adjustments && adjustments[student.id] !== undefined) {
      feeAmount = new Prisma.Decimal(adjustments[student.id]);
    } else if (student.monthlyFee && new Prisma.Decimal(student.monthlyFee).greaterThan(0)) {
      feeAmount = new Prisma.Decimal(student.monthlyFee);
    } else if (student.currentFeeGroup?.monthlyAmount) {
      feeAmount = new Prisma.Decimal(student.currentFeeGroup.monthlyAmount);
    } else {
      excluded.push({
        studentId: student.id,
        studentCode: student.studentId,
        name: student.fullName,
        roomNumber: student.roomNumber,
        reason: 'No fee assigned or fee amount is zero'
      });
      continue;
    }

    if (feeAmount.lessThanOrEqualTo(0)) {
      excluded.push({
        studentId: student.id,
        studentCode: student.studentId,
        name: student.fullName,
        roomNumber: student.roomNumber,
        reason: 'Computed fee amount is zero or negative'
      });
      continue;
    }

    totalAmount = totalAmount.plus(feeAmount);

    const groupName = student.currentFeeGroup?.name || 'Custom/No Group';
    if (!feeGroupBreakdown[groupName]) {
      feeGroupBreakdown[groupName] = { count: 0, total: new Prisma.Decimal('0.00') };
    }
    feeGroupBreakdown[groupName].count += 1;
    feeGroupBreakdown[groupName].total = feeGroupBreakdown[groupName].total.plus(feeAmount);

    eligible.push({
      studentId: student.id,
      studentCode: student.studentId,
      name: student.fullName,
      roomNumber: student.roomNumber,
      feeGroupId: student.currentFeeGroupId,
      feeGroupName: groupName,
      feeAmount: feeAmount.toFixed(2),
      isAdjusted: adjustments && adjustments[student.id] !== undefined
    });
  }

  const breakdownFormatted = Object.keys(feeGroupBreakdown).map((groupName) => ({
    feeGroupName: groupName,
    count: feeGroupBreakdown[groupName].count,
    total: feeGroupBreakdown[groupName].total.toFixed(2)
  }));

  return {
    year: Number(year),
    month: Number(month),
    nepaliMonth,
    target,
    totalEligible: eligible.length,
    totalExcluded: excluded.length,
    totalAmount: totalAmount.toFixed(2),
    breakdown: breakdownFormatted,
    eligible,
    excluded
  };
}

/**
 * Generate monthly hostel fee charges for eligible students.
 * Transactional and idempotent.
 *
 * @param {object} params
 * @param {number} params.year - Gregorian year
 * @param {number} params.month - Gregorian month (1-12)
 * @param {string} [params.target='ALL']
 * @param {string} [params.feeGroupId]
 * @param {string[]} [params.studentIds]
 * @param {object} [params.adjustments]
 * @param {string} adminUserId - User generating the billing
 * @returns {Promise<object>} Results of the generation
 */
async function generateBilling(
  { year, month, target = 'ALL', feeGroupId = null, studentIds = [], adjustments = {} },
  adminUserId
) {
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const nepaliMonth = getNepaliMonth(parsedYear, parsedMonth);

  // Billing date set to 1st day of the billing month
  const billingDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));

  return await prisma.$transaction(async (tx) => {
    // 1. Find or create BillingPeriod
    let billingPeriod = await tx.billingPeriod.findUnique({
      where: {
        year_month: {
          year: parsedYear,
          month: parsedMonth
        }
      }
    });

    if (!billingPeriod) {
      billingPeriod = await tx.billingPeriod.create({
        data: {
          year: parsedYear,
          month: parsedMonth,
          nepaliMonth,
          generatedBy: adminUserId,
          totalStudents: 0,
          totalAmount: new Prisma.Decimal('0.00'),
          status: 'CONFIRMED'
        }
      });
    }

    // 2. Fetch already billed students for this period
    const existingEntries = await tx.ledgerEntry.findMany({
      where: {
        billingPeriodId: billingPeriod.id,
        entryType: 'MONTHLY_FEE'
      },
      select: {
        studentId: true
      }
    });

    const alreadyBilled = new Set(existingEntries.map((e) => e.studentId));

    // 3. Resolve student filter
    const studentWhere = { status: 'ACTIVE' };
    if (target === 'GROUP') {
      studentWhere.currentFeeGroupId = feeGroupId;
    } else if (target === 'SELECTED') {
      studentWhere.id = { in: studentIds };
    }

    const candidateStudents = await tx.student.findMany({
      where: studentWhere,
      include: {
        currentFeeGroup: true
      }
    });

    const charged = [];
    const skipped = [];
    const failed = [];

    for (const student of candidateStudents) {
      if (alreadyBilled.has(student.id)) {
        skipped.push({
          studentId: student.id,
          studentCode: student.studentId,
          name: student.fullName,
          reason: `Already billed in period ${nepaliMonth}`
        });
        continue;
      }

      // Determine fee amount
      let feeAmount;
      if (adjustments && adjustments[student.id] !== undefined) {
        feeAmount = new Prisma.Decimal(adjustments[student.id]);
      } else if (student.monthlyFee && new Prisma.Decimal(student.monthlyFee).greaterThan(0)) {
        feeAmount = new Prisma.Decimal(student.monthlyFee);
      } else if (student.currentFeeGroup?.monthlyAmount) {
        feeAmount = new Prisma.Decimal(student.currentFeeGroup.monthlyAmount);
      } else {
        skipped.push({
          studentId: student.id,
          studentCode: student.studentId,
          name: student.fullName,
          reason: 'No fee group assigned or fee is zero'
        });
        continue;
      }

      if (feeAmount.lessThanOrEqualTo(0)) {
        skipped.push({
          studentId: student.id,
          studentCode: student.studentId,
          name: student.fullName,
          reason: 'Fee amount is non-positive'
        });
        continue;
      }

      try {
        // Calculate provisional balanceAfter (will be fully verified in recalculateBalance)
        const currentBalance = new Prisma.Decimal(student.outstandingBalance || 0);
        const newBalance = currentBalance.plus(feeAmount);

        // Create LedgerEntry
        const entry = await tx.ledgerEntry.create({
          data: {
            studentId: student.id,
            billingPeriodId: billingPeriod.id,
            date: billingDate,
            entryType: 'MONTHLY_FEE',
            debit: feeAmount,
            credit: new Prisma.Decimal('0.00'),
            balanceAfter: newBalance,
            description: `Hostel Fee for ${nepaliMonth}`,
            recordedBy: adminUserId,
            notes: `Generated via Billing Run (${target})`
          }
        });

        // Recalculate student running balance for total consistency
        await recalculateBalance(student.id, tx);

        charged.push({
          studentId: student.id,
          studentCode: student.studentId,
          name: student.fullName,
          roomNumber: student.roomNumber,
          amount: feeAmount.toFixed(2),
          ledgerEntryId: entry.id
        });
      } catch (err) {
        failed.push({
          studentId: student.id,
          studentCode: student.studentId,
          name: student.fullName,
          error: err.message
        });
      }
    }

    // 4. Update BillingPeriod totals
    const allPeriodEntries = await tx.ledgerEntry.findMany({
      where: {
        billingPeriodId: billingPeriod.id,
        entryType: 'MONTHLY_FEE'
      },
      select: {
        debit: true
      }
    });

    let totalPeriodAmount = new Prisma.Decimal('0.00');
    for (const item of allPeriodEntries) {
      totalPeriodAmount = totalPeriodAmount.plus(new Prisma.Decimal(item.debit));
    }

    const updatedPeriod = await tx.billingPeriod.update({
      where: { id: billingPeriod.id },
      data: {
        totalStudents: allPeriodEntries.length,
        totalAmount: totalPeriodAmount
      }
    });

    // 5. Audit Log
    await logAudit({
      userId: adminUserId,
      action: 'BILLING_GENERATE',
      entity: 'BillingPeriod',
      entityId: updatedPeriod.id,
      newValue: {
        year: parsedYear,
        month: parsedMonth,
        nepaliMonth,
        chargedCount: charged.length,
        totalAmount: totalPeriodAmount.toFixed(2)
      },
      tx
    });

    return {
      success: true,
      billingPeriod: updatedPeriod,
      nepaliMonth,
      chargedCount: charged.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      charged,
      skipped,
      failed
    };
  });
}

module.exports = {
  getNepaliMonth,
  previewBilling,
  generateBilling
};
