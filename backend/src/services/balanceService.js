const { prisma, Prisma } = require('../prisma');

/**
 * Recalculate the running balance for all ledger entries of a student
 * and persist the updated balanceAfter on each entry and the student's outstandingBalance.
 *
 * @param {string} studentId - UUID of the student
 * @param {object} [tx] - Prisma client or transaction instance
 * @returns {Promise<Prisma.Decimal>} Updated outstanding balance
 */
async function recalculateBalance(studentId, tx = prisma) {
  // Fetch all ledger entries in chronological order
  const entries = await tx.ledgerEntry.findMany({
    where: { studentId },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  let runningBalance = new Prisma.Decimal('0.00');

  for (const entry of entries) {
    const debit = new Prisma.Decimal(entry.debit);
    const credit = new Prisma.Decimal(entry.credit);
    runningBalance = runningBalance.plus(debit).minus(credit);

    // If balanceAfter does not match the computed running balance, update it
    const currentBalanceAfter = new Prisma.Decimal(entry.balanceAfter || 0);
    if (!currentBalanceAfter.equals(runningBalance)) {
      await tx.ledgerEntry.update({
        where: { id: entry.id },
        data: {
          balanceAfter: runningBalance
        }
      });
    }
  }

  // Update student's stored outstanding balance
  await tx.student.update({
    where: { id: studentId },
    data: {
      outstandingBalance: runningBalance
    }
  });

  return runningBalance;
}

/**
 * Retrieve the full chronological ledger and running balance statement for a student.
 *
 * @param {string} studentId - UUID of the student
 * @param {object} [options] - Optional filter and pagination options
 * @param {object} [tx] - Prisma client or transaction instance
 * @returns {Promise<object>} Statement summary and itemized entries
 */
async function getRunningBalance(studentId, options = {}, tx = prisma) {
  const { startDate, endDate, entryType } = options;

  const whereClause = { studentId };

  if (entryType) {
    whereClause.entryType = entryType;
  }

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) {
      whereClause.date.gte = new Date(startDate);
    }
    if (endDate) {
      whereClause.date.lte = new Date(endDate);
    }
  }

  // Fetch student details
  const student = await tx.student.findUnique({
    where: { id: studentId },
    include: {
      currentFeeGroup: {
        select: {
          id: true,
          name: true,
          monthlyAmount: true
        }
      }
    }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Fetch all entries for accurate financial aggregates
  const allEntries = await tx.ledgerEntry.findMany({
    where: { studentId },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  let totalDebits = new Prisma.Decimal('0.00');
  let totalCredits = new Prisma.Decimal('0.00');
  let totalCharged = new Prisma.Decimal('0.00');
  let totalPaid = new Prisma.Decimal('0.00');
  let totalCreditNotes = new Prisma.Decimal('0.00');
  let totalRefunded = new Prisma.Decimal('0.00');
  let lastPaymentDate = null;
  let lastPaymentAmount = null;

  for (const entry of allEntries) {
    const debit = new Prisma.Decimal(entry.debit);
    const credit = new Prisma.Decimal(entry.credit);

    totalDebits = totalDebits.plus(debit);
    totalCredits = totalCredits.plus(credit);

    if (entry.entryType === 'MONTHLY_FEE') {
      totalCharged = totalCharged.plus(debit);
    } else if (entry.entryType === 'PAYMENT') {
      totalPaid = totalPaid.plus(credit);
      lastPaymentDate = entry.date;
      lastPaymentAmount = credit.toFixed(2);
    } else if (entry.entryType === 'CREDIT') {
      totalCreditNotes = totalCreditNotes.plus(credit);
    } else if (entry.entryType === 'REFUND') {
      totalRefunded = totalRefunded.plus(debit);
    } else if (entry.entryType === 'ADJUSTMENT') {
      if (debit.greaterThan(0)) {
        totalCharged = totalCharged.plus(debit);
      }
      if (credit.greaterThan(0)) {
        totalCreditNotes = totalCreditNotes.plus(credit);
      }
    }
  }

  const computedOutstanding = totalDebits.minus(totalCredits);

  // Fetch filtered entries for display
  const filteredEntries = await tx.ledgerEntry.findMany({
    where: whereClause,
    include: {
      recorder: {
        select: {
          id: true,
          username: true
        }
      },
      billingPeriod: {
        select: {
          id: true,
          nepaliMonth: true,
          year: true,
          month: true
        }
      },
      reversedEntry: {
        select: {
          id: true,
          entryType: true,
          debit: true,
          credit: true
        }
      }
    },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  return {
    student: {
      id: student.id,
      studentId: student.studentId,
      fullName: student.fullName,
      roomNumber: student.roomNumber,
      status: student.status,
      monthlyFee: student.monthlyFee,
      feeGroup: student.currentFeeGroup
    },
    summary: {
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      totalCharged: totalCharged.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalCreditNotes: totalCreditNotes.toFixed(2),
      totalRefunded: totalRefunded.toFixed(2),
      outstandingBalance: computedOutstanding.toFixed(2),
      lastPaymentDate,
      lastPaymentAmount
    },
    entries: filteredEntries
  };
}

module.exports = {
  recalculateBalance,
  getRunningBalance
};
