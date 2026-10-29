const { prisma, Prisma } = require('../prisma');
const { successResponse, errorResponse } = require('../utils/response');
const { recalculateBalance } = require('../services/balanceService');
const { logAudit } = require('../services/auditService');

/**
 * GET /api/payments
 * List payments with filters and pagination
 */
async function listPayments(req, res) {
  const {
    studentId,
    startDate,
    endDate,
    paymentMethod,
    search,
    entryType = 'PAYMENT',
    page = 1,
    limit = 20
  } = req.query;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const whereClause = {};

  if (entryType === 'ALL') {
    whereClause.entryType = { in: ['PAYMENT', 'CREDIT', 'REFUND', 'ADJUSTMENT', 'REVERSAL'] };
  } else if (entryType) {
    whereClause.entryType = entryType;
  }

  if (studentId) {
    whereClause.studentId = studentId;
  }

  if (paymentMethod) {
    whereClause.paymentMethod = paymentMethod.toUpperCase();
  }

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = new Date(startDate);
    if (endDate) whereClause.date.lte = new Date(endDate);
  }

  if (search) {
    const term = search.trim();
    whereClause.OR = [
      { receiptNumber: { contains: term, mode: 'insensitive' } },
      { referenceNumber: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { student: { fullName: { contains: term, mode: 'insensitive' } } },
      { student: { studentId: { contains: term, mode: 'insensitive' } } }
    ];
  }

  const [total, payments] = await Promise.all([
    prisma.ledgerEntry.count({ where: whereClause }),
    prisma.ledgerEntry.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            roomNumber: true,
            status: true
          }
        },
        recorder: {
          select: {
            id: true,
            username: true
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
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: parsedLimit
    })
  ]);

  return successResponse(res, {
    payments,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  });
}

/**
 * GET /api/payments/:id
 * Single payment ledger entry
 */
async function getPayment(req, res) {
  const { id } = req.params;

  const payment = await prisma.ledgerEntry.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          studentId: true,
          fullName: true,
          roomNumber: true,
          status: true,
          outstandingBalance: true
        }
      },
      recorder: {
        select: {
          id: true,
          username: true
        }
      },
      reversedEntry: true,
      reversals: true
    }
  });

  if (!payment) {
    return errorResponse(res, 'Payment entry not found', 404);
  }

  return successResponse(res, payment);
}

/**
 * POST /api/payments
 * Record payment received from student
 */
async function recordPayment(req, res) {
  const {
    studentId,
    amount,
    date,
    paymentMethod = 'CASH',
    referenceNumber,
    receiptNumber,
    notes,
    description
  } = req.body;

  const amountDecimal = new Prisma.Decimal(amount);
  if (amountDecimal.lessThanOrEqualTo(0)) {
    return errorResponse(res, 'Payment amount must be greater than zero', 400);
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student) {
    return errorResponse(res, 'Student not found', 404);
  }

  const paymentDate = date ? new Date(date) : new Date();
  const desc = description
    ? description.trim()
    : `Payment received via ${paymentMethod}${receiptNumber ? ` (Receipt #${receiptNumber})` : ''}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Calculate provisional balance
    const currentBalance = new Prisma.Decimal(student.outstandingBalance || 0);
    const provisionalBalanceAfter = currentBalance.minus(amountDecimal);

    // 2. Create LedgerEntry for payment
    const entry = await tx.ledgerEntry.create({
      data: {
        studentId,
        date: paymentDate,
        entryType: 'PAYMENT',
        debit: new Prisma.Decimal('0.00'),
        credit: amountDecimal,
        balanceAfter: provisionalBalanceAfter,
        description: desc,
        referenceNumber: referenceNumber ? referenceNumber.trim() : null,
        receiptNumber: receiptNumber ? receiptNumber.trim() : null,
        paymentMethod,
        recordedBy: req.user.id,
        notes: notes ? notes.trim() : null
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            roomNumber: true
          }
        }
      }
    });

    // 3. Recalculate balance for student
    const updatedBalance = await recalculateBalance(studentId, tx);

    // 4. Audit Log
    await logAudit({
      userId: req.user.id,
      action: 'RECORD_PAYMENT',
      entity: 'LedgerEntry',
      entityId: entry.id,
      newValue: {
        studentId,
        studentName: student.fullName,
        amount: amountDecimal.toFixed(2),
        paymentMethod,
        receiptNumber,
        newBalance: updatedBalance.toFixed(2)
      },
      ipAddress: req.ip,
      tx
    });

    return {
      entry,
      newOutstandingBalance: updatedBalance.toFixed(2)
    };
  });

  return successResponse(res, result, 201, 'Payment recorded successfully');
}

/**
 * POST /api/payments/adjustment
 * Record credit, refund, or adjustment
 */
async function recordAdjustment(req, res) {
  const {
    studentId,
    amount,
    type, // 'CREDIT' | 'REFUND' | 'ADJUSTMENT'
    date,
    description,
    notes,
    isDebit = false
  } = req.body;

  if (!['CREDIT', 'REFUND', 'ADJUSTMENT'].includes(type)) {
    return errorResponse(res, 'Type must be CREDIT, REFUND, or ADJUSTMENT', 400);
  }

  const amountDecimal = new Prisma.Decimal(amount);
  if (amountDecimal.lessThanOrEqualTo(0)) {
    return errorResponse(res, 'Amount must be greater than zero', 400);
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student) {
    return errorResponse(res, 'Student not found', 404);
  }

  const adjustmentDate = date ? new Date(date) : new Date();

  let debit = new Prisma.Decimal('0.00');
  let credit = new Prisma.Decimal('0.00');
  let defaultDescription = '';

  if (type === 'CREDIT') {
    credit = amountDecimal;
    defaultDescription = 'Credit concession applied';
  } else if (type === 'REFUND') {
    debit = amountDecimal;
    defaultDescription = 'Refund payment to student';
  } else if (type === 'ADJUSTMENT') {
    if (isDebit) {
      debit = amountDecimal;
      defaultDescription = 'Debit fee adjustment';
    } else {
      credit = amountDecimal;
      defaultDescription = 'Credit fee adjustment';
    }
  }

  const desc = description ? description.trim() : defaultDescription;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create entry
    const entry = await tx.ledgerEntry.create({
      data: {
        studentId,
        date: adjustmentDate,
        entryType: type,
        debit,
        credit,
        balanceAfter: new Prisma.Decimal('0.00'), // Will be set by recalculateBalance
        description: desc,
        recordedBy: req.user.id,
        notes: notes ? notes.trim() : null
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            roomNumber: true
          }
        }
      }
    });

    // 2. Recalculate balance
    const updatedBalance = await recalculateBalance(studentId, tx);

    // 3. Audit Log
    await logAudit({
      userId: req.user.id,
      action: `RECORD_${type}`,
      entity: 'LedgerEntry',
      entityId: entry.id,
      newValue: {
        studentId,
        type,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        newBalance: updatedBalance.toFixed(2)
      },
      ipAddress: req.ip,
      tx
    });

    return {
      entry,
      newOutstandingBalance: updatedBalance.toFixed(2)
    };
  });

  return successResponse(res, result, 201, `${type} adjustment recorded successfully`);
}

/**
 * POST /api/payments/:id/reverse
 * Reverse a previous payment or ledger entry
 */
async function reversePayment(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  const originalEntry = await prisma.ledgerEntry.findUnique({
    where: { id },
    include: { student: true, reversals: true }
  });

  if (!originalEntry) {
    return errorResponse(res, 'Ledger transaction not found', 404);
  }

  if (originalEntry.entryType === 'REVERSAL') {
    return errorResponse(res, 'Cannot reverse an entry that is already a reversal', 400);
  }

  if (originalEntry.reversedBy || (originalEntry.reversals && originalEntry.reversals.length > 0)) {
    return errorResponse(res, 'This transaction has already been reversed', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Reverse debits and credits
    const reversalDebit = new Prisma.Decimal(originalEntry.credit);
    const reversalCredit = new Prisma.Decimal(originalEntry.debit);

    const desc = `Reversal of #${originalEntry.receiptNumber || originalEntry.id.substring(0, 8)} (${originalEntry.entryType}): ${reason || 'Transaction reversal'}`;

    // 1. Create reversal entry
    const reversalEntry = await tx.ledgerEntry.create({
      data: {
        studentId: originalEntry.studentId,
        date: new Date(),
        entryType: 'REVERSAL',
        debit: reversalDebit,
        credit: reversalCredit,
        balanceAfter: new Prisma.Decimal('0.00'),
        description: desc,
        recordedBy: req.user.id,
        notes: reason || 'Reversal requested by admin',
        reversedBy: originalEntry.id
      }
    });

    // 2. Mark original entry as reversed
    await tx.ledgerEntry.update({
      where: { id: originalEntry.id },
      data: {
        reversedBy: reversalEntry.id
      }
    });

    // 3. Recalculate balance
    const updatedBalance = await recalculateBalance(originalEntry.studentId, tx);

    // 4. Audit Log
    await logAudit({
      userId: req.user.id,
      action: 'REVERSE_TRANSACTION',
      entity: 'LedgerEntry',
      entityId: reversalEntry.id,
      oldValue: {
        reversedTransactionId: originalEntry.id,
        originalDebit: originalEntry.debit.toString(),
        originalCredit: originalEntry.credit.toString()
      },
      newValue: {
        reversalId: reversalEntry.id,
        reason,
        newBalance: updatedBalance.toFixed(2)
      },
      ipAddress: req.ip,
      tx
    });

    return {
      reversalEntry,
      newOutstandingBalance: updatedBalance.toFixed(2)
    };
  });

  return successResponse(res, result, 201, 'Transaction reversed successfully');
}

/**
 * PUT /api/payments/:id
 * Edit an existing ledger entry (amount, date, description, notes) and recalculate student balance
 */
async function updateLedgerEntry(req, res) {
  const { id } = req.params;
  const { amount, date, description, notes, receiptNumber, referenceNumber, paymentMethod } = req.body;

  const existing = await prisma.ledgerEntry.findUnique({
    where: { id },
    include: { student: true }
  });

  if (!existing) {
    return errorResponse(res, 'Ledger entry not found', 404);
  }

  const updateData = {};
  if (date) updateData.date = new Date(date);
  if (description !== undefined) updateData.description = description.trim();
  if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
  if (receiptNumber !== undefined) updateData.receiptNumber = receiptNumber ? receiptNumber.trim() : null;
  if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber ? referenceNumber.trim() : null;
  if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;

  if (amount !== undefined && amount !== null && amount !== '') {
    const amountDec = new Prisma.Decimal(amount);
    if (amountDec.lessThan(0)) {
      return errorResponse(res, 'Amount cannot be negative', 400);
    }
    // Update either debit or credit depending on original entry
    if (new Prisma.Decimal(existing.debit).greaterThan(0)) {
      updateData.debit = amountDec;
    } else if (new Prisma.Decimal(existing.credit).greaterThan(0)) {
      updateData.credit = amountDec;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.ledgerEntry.update({
      where: { id },
      data: updateData
    });

    const newBalance = await recalculateBalance(existing.studentId, tx);

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_LEDGER_ENTRY',
      entity: 'LedgerEntry',
      entityId: id,
      oldValue: existing,
      newValue: { ...updated, newBalance: newBalance.toFixed(2) },
      ipAddress: req.ip,
      tx
    });

    return { updated, newOutstandingBalance: newBalance.toFixed(2) };
  });

  return successResponse(res, result, 200, 'Ledger entry updated successfully');
}

/**
 * DELETE /api/payments/:id
 * Delete an entire ledger entry line and recalculate running balances
 */
async function deleteLedgerEntry(req, res) {
  const { id } = req.params;

  const existing = await prisma.ledgerEntry.findUnique({
    where: { id }
  });

  if (!existing) {
    return errorResponse(res, 'Ledger entry not found', 404);
  }

  const studentId = existing.studentId;

  await prisma.$transaction(async (tx) => {
    // Unlink any reversals referencing this entry
    await tx.ledgerEntry.updateMany({
      where: { reversedBy: id },
      data: { reversedBy: null }
    });

    await tx.ledgerEntry.delete({
      where: { id }
    });

    const newBalance = await recalculateBalance(studentId, tx);

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_LEDGER_ENTRY',
      entity: 'LedgerEntry',
      entityId: id,
      oldValue: existing,
      newValue: { deleted: true, newBalance: newBalance.toFixed(2) },
      ipAddress: req.ip,
      tx
    });
  });

  return successResponse(res, null, 200, 'Ledger entry deleted and student balance recalculated');
}

module.exports = {
  listPayments,
  getPayment,
  recordPayment,
  recordAdjustment,
  reversePayment,
  updateLedgerEntry,
  deleteLedgerEntry
};
