const { prisma, Prisma } = require('../prisma');
const { successResponse, errorResponse } = require('../utils/response');
const { getNepaliMonth } = require('../utils/nepaliCalendar');
const { convertToCsv, sendCsvResponse } = require('../utils/csv');

/**
 * GET /api/reports/dashboard
 * Summary statistics for admin dashboard
 */
async function getDashboardStats(req, res) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const startOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
  const endOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

  // Run aggregations in parallel
  const [
    totalActiveStudents,
    totalInactiveStudents,
    allStudents,
    currentMonthCharges,
    currentMonthPayments,
    recentTransactions,
    topDuesStudents
  ] = await Promise.all([
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    prisma.student.count({ where: { status: 'INACTIVE' } }),
    prisma.student.findMany({
      select: {
        id: true,
        status: true,
        outstandingBalance: true
      }
    }),
    prisma.ledgerEntry.findMany({
      where: {
        debit: { gt: 0 },
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      },
      select: { debit: true }
    }),
    prisma.ledgerEntry.findMany({
      where: {
        entryType: 'PAYMENT',
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      },
      select: { credit: true }
    }),
    prisma.ledgerEntry.findMany({
      take: 30,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            roomNumber: true
          }
        },
        recorder: {
          select: {
            username: true
          }
        }
      }
    }),
    prisma.student.findMany({
      where: {
        outstandingBalance: { gt: 0 }
      },
      take: 10,
      orderBy: {
        outstandingBalance: 'desc'
      },
      select: {
        id: true,
        studentId: true,
        fullName: true,
        roomNumber: true,
        phone: true,
        status: true,
        outstandingBalance: true
      }
    })
  ]);

  let totalOutstandingAll = new Prisma.Decimal('0.00');
  let totalOutstandingActive = new Prisma.Decimal('0.00');
  let totalOutstandingInactive = new Prisma.Decimal('0.00');
  let studentsWithDues = 0;

  for (const s of allStudents) {
    const bal = new Prisma.Decimal(s.outstandingBalance || 0);
    totalOutstandingAll = totalOutstandingAll.plus(bal);

    if (s.status === 'ACTIVE') {
      totalOutstandingActive = totalOutstandingActive.plus(bal);
      if (bal.greaterThan(0)) {
        studentsWithDues += 1;
      }
    } else {
      totalOutstandingInactive = totalOutstandingInactive.plus(bal);
    }
  }

  let currentMonthCharged = new Prisma.Decimal('0.00');
  for (const c of currentMonthCharges) {
    currentMonthCharged = currentMonthCharged.plus(new Prisma.Decimal(c.debit));
  }

  let currentMonthCollected = new Prisma.Decimal('0.00');
  for (const p of currentMonthPayments) {
    currentMonthCollected = currentMonthCollected.plus(new Prisma.Decimal(p.credit));
  }

  return successResponse(res, {
    totalActiveStudents,
    totalInactiveStudents,
    studentsWithDues,
    totalOutstanding: totalOutstandingAll.toFixed(2),
    totalOutstandingAll: totalOutstandingAll.toFixed(2),
    totalOutstandingActive: totalOutstandingActive.toFixed(2),
    totalOutstandingInactive: totalOutstandingInactive.toFixed(2),
    currentMonthCharged: currentMonthCharged.toFixed(2),
    thisMonthCharged: currentMonthCharged.toFixed(2),
    currentMonthCollected: currentMonthCollected.toFixed(2),
    thisMonthCollected: currentMonthCollected.toFixed(2),
    currentMonthNepali: getNepaliMonth(currentYear, currentMonth + 1),
    recentTransactions: (() => {
      const unique = [];
      const seen = new Set();
      for (const tx of (recentTransactions || [])) {
        if (!tx || !tx.id || seen.has(tx.id)) continue;
        const timeKey = tx.createdAt ? Math.floor(new Date(tx.createdAt).getTime() / 120000) : 0;
        const debitVal = parseFloat(tx.debit || 0).toFixed(2);
        const creditVal = parseFloat(tx.credit || 0).toFixed(2);
        const contentKey = `${tx.studentId}_${tx.entryType}_${debitVal}_${creditVal}_${(tx.description || '').trim()}_${timeKey}`;
        if (seen.has(contentKey)) continue;
        seen.add(tx.id);
        seen.add(contentKey);
        unique.push({
          id: tx.id,
          studentId: tx.studentId,
          studentName: tx.student?.fullName || 'Student',
          studentCode: tx.student?.studentId || '',
          roomNumber: tx.student?.roomNumber || '',
          student: tx.student,
          date: tx.date,
          createdAt: tx.createdAt,
          entryType: tx.entryType,
          type: tx.entryType,
          debit: parseFloat(tx.debit || 0),
          credit: parseFloat(tx.credit || 0),
          amount: parseFloat(tx.credit > 0 ? tx.credit : tx.debit),
          balanceAfter: parseFloat(tx.balanceAfter || 0),
          description: tx.description,
          referenceNumber: tx.referenceNumber,
          receiptNumber: tx.receiptNumber,
          paymentMethod: tx.paymentMethod,
          recordedBy: tx.recorder?.username || null
        });
        if (unique.length >= 10) break;
      }
      return unique;
    })(),
    topDuesStudents: (topDuesStudents || []).map((s) => ({
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      roomNumber: s.roomNumber,
      phone: s.phone,
      status: s.status,
      outstandingBalance: parseFloat(s.outstandingBalance || 0)
    })),
    topOutstandingStudents: (topDuesStudents || []).map((s) => ({
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      roomNumber: s.roomNumber,
      phone: s.phone,
      status: s.status,
      outstandingBalance: parseFloat(s.outstandingBalance || 0)
    }))
  });
}

/**
 * GET /api/reports/monthly-summary
 * Charges vs Collections by month for the last 12 months
 */
async function getMonthlySummary(req, res) {
  const now = new Date();
  const summary = [];

  // Generate date ranges for the last 12 calendar months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const [charges, collections] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: {
          debit: { gt: 0 },
          date: { gte: monthStart, lte: monthEnd }
        },
        select: { debit: true }
      }),
      prisma.ledgerEntry.findMany({
        where: {
          entryType: 'PAYMENT',
          date: { gte: monthStart, lte: monthEnd }
        },
        select: { credit: true }
      })
    ]);

    let totalCharged = new Prisma.Decimal('0.00');
    for (const c of charges) {
      totalCharged = totalCharged.plus(new Prisma.Decimal(c.debit));
    }

    let totalCollected = new Prisma.Decimal('0.00');
    for (const col of collections) {
      totalCollected = totalCollected.plus(new Prisma.Decimal(col.credit));
    }

    summary.push({
      year,
      month,
      nepaliMonth: getNepaliMonth(year, month),
      monthName: getNepaliMonth(year, month),
      totalCharged: totalCharged.toFixed(2),
      charged: parseFloat(totalCharged.toFixed(2)),
      totalCollected: totalCollected.toFixed(2),
      collected: parseFloat(totalCollected.toFixed(2)),
      netDifference: totalCharged.minus(totalCollected).toFixed(2),
      chargeCount: charges.length,
      collectionCount: collections.length
    });
  }

  return successResponse(res, summary);
}

/**
 * GET /api/reports/fee-group-summary
 * Summary per fee group (student count, monthly expected, total outstanding)
 */
async function getFeeGroupSummary(req, res) {
  const groups = await prisma.feeGroup.findMany({
    include: {
      students: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          monthlyFee: true,
          outstandingBalance: true
        }
      }
    },
    orderBy: { monthlyAmount: 'asc' }
  });

  const summary = groups.map((g) => {
    let monthlyExpected = new Prisma.Decimal('0.00');
    let totalOutstanding = new Prisma.Decimal('0.00');

    for (const student of g.students) {
      const fee = student.monthlyFee
        ? new Prisma.Decimal(student.monthlyFee)
        : new Prisma.Decimal(g.monthlyAmount);
      monthlyExpected = monthlyExpected.plus(fee);
      totalOutstanding = totalOutstanding.plus(new Prisma.Decimal(student.outstandingBalance || 0));
    }

    return {
      feeGroupId: g.id,
      name: g.name,
      monthlyAmount: g.monthlyAmount,
      isActive: g.isActive,
      studentCount: g.students.length,
      monthlyExpected: monthlyExpected.toFixed(2),
      totalOutstanding: totalOutstanding.toFixed(2)
    };
  });

  return successResponse(res, summary);
}

/**
 * GET /api/reports/outstanding
 * All students with balance > 0 (filterable active/inactive)
 */
async function getOutstandingReport(req, res) {
  const { status = 'ALL', minAmount = '0.01', sortBy = 'outstandingBalance', sortOrder = 'desc' } = req.query;

  const whereClause = {
    outstandingBalance: {
      gt: new Prisma.Decimal(minAmount)
    }
  };

  if (status !== 'ALL' && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
    whereClause.status = status.toUpperCase();
  }

  const allowedSorts = ['outstandingBalance', 'fullName', 'roomNumber', 'studentId'];
  const sortField = allowedSorts.includes(sortBy) ? sortBy : 'outstandingBalance';
  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const students = await prisma.student.findMany({
    where: whereClause,
    include: {
      currentFeeGroup: {
        select: { name: true }
      },
      ledgerEntries: {
        where: { entryType: 'PAYMENT' },
        orderBy: { date: 'desc' },
        take: 1,
        select: { date: true, credit: true }
      }
    },
    orderBy: { [sortField]: sortDirection }
  });

  let grandTotal = new Prisma.Decimal('0.00');
  const studentRows = students.map((s) => {
    const bal = new Prisma.Decimal(s.outstandingBalance);
    grandTotal = grandTotal.plus(bal);

    const lastPayment = s.ledgerEntries[0];

    return {
      studentId: s.id,
      studentCode: s.studentId,
      fullName: s.fullName,
      roomNumber: s.roomNumber,
      phone: s.phone || 'N/A',
      status: s.status,
      feeGroup: s.currentFeeGroup?.name || 'None',
      monthlyFee: s.monthlyFee,
      outstandingBalance: bal.toFixed(2),
      lastPaymentDate: lastPayment ? lastPayment.date : null,
      lastPaymentAmount: lastPayment ? lastPayment.credit : null
    };
  });

  return successResponse(res, {
    totalStudents: studentRows.length,
    grandTotalOutstanding: grandTotal.toFixed(2),
    students: studentRows
  });
}

/**
 * GET /api/reports/collection
 * Payments collected in date range
 */
async function getCollectionReport(req, res) {
  const { startDate, endDate, paymentMethod } = req.query;

  const whereClause = {
    entryType: 'PAYMENT'
  };

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = new Date(startDate);
    if (endDate) whereClause.date.lte = new Date(endDate);
  }

  if (paymentMethod && paymentMethod !== 'ALL') {
    whereClause.paymentMethod = paymentMethod.toUpperCase();
  }

  const payments = await prisma.ledgerEntry.findMany({
    where: whereClause,
    include: {
      student: {
        select: {
          id: true,
          studentId: true,
          fullName: true,
          roomNumber: true
        }
      },
      recorder: {
        select: {
          username: true
        }
      }
    },
    orderBy: { date: 'desc' }
  });

  let grandTotal = new Prisma.Decimal('0.00');
  const methodTotals = {
    CASH: new Prisma.Decimal('0.00'),
    BANK_TRANSFER: new Prisma.Decimal('0.00'),
    CHEQUE: new Prisma.Decimal('0.00'),
    ONLINE: new Prisma.Decimal('0.00'),
    OTHER: new Prisma.Decimal('0.00')
  };

  for (const p of payments) {
    const amount = new Prisma.Decimal(p.credit);
    grandTotal = grandTotal.plus(amount);

    const method = p.paymentMethod || 'OTHER';
    if (!methodTotals[method]) {
      methodTotals[method] = new Prisma.Decimal('0.00');
    }
    methodTotals[method] = methodTotals[method].plus(amount);
  }

  const breakdown = Object.keys(methodTotals).map((m) => ({
    method: m,
    total: methodTotals[m].toFixed(2)
  }));

  return successResponse(res, {
    totalTransactions: payments.length,
    grandTotalCollected: grandTotal.toFixed(2),
    breakdown,
    transactions: payments
  });
}

/**
 * GET /api/reports/former-students
 * Inactive students with outstanding balances
 */
async function getFormerStudentsReport(req, res) {
  const students = await prisma.student.findMany({
    where: {
      status: 'INACTIVE',
      outstandingBalance: {
        gt: new Prisma.Decimal('0.00')
      }
    },
    include: {
      currentFeeGroup: {
        select: { name: true }
      },
      ledgerEntries: {
        where: { entryType: 'PAYMENT' },
        orderBy: { date: 'desc' },
        take: 1,
        select: { date: true, credit: true }
      }
    },
    orderBy: { outstandingBalance: 'desc' }
  });

  let totalDues = new Prisma.Decimal('0.00');
  const rows = students.map((s) => {
    const bal = new Prisma.Decimal(s.outstandingBalance);
    totalDues = totalDues.plus(bal);

    return {
      id: s.id,
      studentCode: s.studentId,
      fullName: s.fullName,
      roomNumber: s.roomNumber,
      phone: s.phone || 'N/A',
      email: s.email || 'N/A',
      admissionDate: s.admissionDate,
      departureDate: s.departureDate,
      outstandingBalance: bal.toFixed(2),
      feeGroup: s.currentFeeGroup?.name || 'N/A',
      lastPaymentDate: s.ledgerEntries[0]?.date || null
    };
  });

  return successResponse(res, {
    totalFormerStudentsWithDues: rows.length,
    totalOutstanding: totalDues.toFixed(2),
    students: rows
  });
}

/**
 * GET /api/reports/export/outstanding
 * Export outstanding report as CSV
 */
async function exportOutstandingCSV(req, res) {
  const { status = 'ALL' } = req.query;

  const whereClause = {
    outstandingBalance: {
      gt: new Prisma.Decimal('0.00')
    }
  };

  if (status !== 'ALL' && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
    whereClause.status = status.toUpperCase();
  }

  const students = await prisma.student.findMany({
    where: whereClause,
    include: {
      currentFeeGroup: { select: { name: true } }
    },
    orderBy: { outstandingBalance: 'desc' }
  });

  const exportData = students.map((s) => ({
    studentCode: s.studentId,
    fullName: s.fullName,
    roomNumber: s.roomNumber,
    phone: s.phone || '',
    email: s.email || '',
    status: s.status,
    feeGroup: s.currentFeeGroup?.name || 'N/A',
    monthlyFee: new Prisma.Decimal(s.monthlyFee).toFixed(2),
    outstandingBalance: new Prisma.Decimal(s.outstandingBalance).toFixed(2),
    admissionDate: s.admissionDate.toISOString().split('T')[0]
  }));

  const fields = [
    { label: 'Student ID', value: 'studentCode' },
    { label: 'Full Name', value: 'fullName' },
    { label: 'Room', value: 'roomNumber' },
    { label: 'Phone', value: 'phone' },
    { label: 'Email', value: 'email' },
    { label: 'Status', value: 'status' },
    { label: 'Fee Group', value: 'feeGroup' },
    { label: 'Monthly Fee', value: 'monthlyFee' },
    { label: 'Outstanding Balance (NPR)', value: 'outstandingBalance' },
    { label: 'Admission Date', value: 'admissionDate' }
  ];

  const csv = convertToCsv(exportData, fields);
  const filename = `outstanding-dues-report-${new Date().toISOString().split('T')[0]}.csv`;
  return sendCsvResponse(res, filename, csv);
}

/**
 * GET /api/reports/export/collection
 * Export payments collected in date range as CSV
 */
async function exportCollectionCSV(req, res) {
  const { startDate, endDate, paymentMethod } = req.query;

  const whereClause = {
    entryType: 'PAYMENT'
  };

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = new Date(startDate);
    if (endDate) whereClause.date.lte = new Date(endDate);
  }

  if (paymentMethod && paymentMethod !== 'ALL') {
    whereClause.paymentMethod = paymentMethod.toUpperCase();
  }

  const payments = await prisma.ledgerEntry.findMany({
    where: whereClause,
    include: {
      student: {
        select: {
          studentId: true,
          fullName: true,
          roomNumber: true
        }
      },
      recorder: {
        select: {
          username: true
        }
      }
    },
    orderBy: { date: 'desc' }
  });

  const exportData = payments.map((p) => ({
    receiptNumber: p.receiptNumber || 'N/A',
    date: p.date.toISOString().split('T')[0],
    studentCode: p.student.studentId,
    studentName: p.student.fullName,
    roomNumber: p.student.roomNumber,
    amount: new Prisma.Decimal(p.credit).toFixed(2),
    paymentMethod: p.paymentMethod || 'CASH',
    referenceNumber: p.referenceNumber || '',
    recordedBy: p.recorder.username,
    description: p.description
  }));

  const fields = [
    { label: 'Receipt #', value: 'receiptNumber' },
    { label: 'Date', value: 'date' },
    { label: 'Student ID', value: 'studentCode' },
    { label: 'Student Name', value: 'studentName' },
    { label: 'Room', value: 'roomNumber' },
    { label: 'Amount (NPR)', value: 'amount' },
    { label: 'Payment Method', value: 'paymentMethod' },
    { label: 'Reference #', value: 'referenceNumber' },
    { label: 'Recorded By', value: 'recordedBy' },
    { label: 'Description', value: 'description' }
  ];

  const csv = convertToCsv(exportData, fields);
  const filename = `collection-report-${new Date().toISOString().split('T')[0]}.csv`;
  return sendCsvResponse(res, filename, csv);
}

module.exports = {
  getDashboardStats,
  getMonthlySummary,
  getFeeGroupSummary,
  getOutstandingReport,
  getCollectionReport,
  getFormerStudentsReport,
  exportOutstandingCSV,
  exportCollectionCSV
};
