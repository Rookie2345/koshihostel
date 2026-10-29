const bcrypt = require('bcryptjs');
const { prisma, Prisma } = require('../prisma');
const { successResponse, errorResponse } = require('../utils/response');
const { generateStudentId } = require('../services/studentIdService');
const { getRunningBalance, recalculateBalance } = require('../services/balanceService');
const { logAudit } = require('../services/auditService');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

/**
 * GET /api/students
 * List students with filters, search, and pagination
 */
async function listStudents(req, res) {
  const {
    status,
    feeGroupId,
    search,
    page = 1,
    limit = 20,
    sortBy = 'fullName',
    sortOrder = 'asc'
  } = req.query;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const whereClause = {};

  if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
    whereClause.status = status.toUpperCase();
  }

  if (feeGroupId) {
    whereClause.currentFeeGroupId = feeGroupId;
  }

  if (search) {
    const term = search.trim();
    whereClause.OR = [
      { fullName: { contains: term, mode: 'insensitive' } },
      { studentId: { contains: term, mode: 'insensitive' } },
      { roomNumber: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } }
    ];
  }

  const allowedSortFields = ['fullName', 'studentId', 'roomNumber', 'admissionDate', 'outstandingBalance', 'createdAt'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'fullName';
  const sortDirection = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const [total, students] = await Promise.all([
    prisma.student.count({ where: whereClause }),
    prisma.student.findMany({
      where: whereClause,
      include: {
        currentFeeGroup: {
          select: {
            id: true,
            name: true,
            monthlyAmount: true
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            loginEnabled: true
          }
        }
      },
      orderBy: { [sortField]: sortDirection },
      skip,
      take: parsedLimit
    })
  ]);

  return successResponse(res, {
    students,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  });
}

/**
 * GET /api/students/:id
 * Get single student details
 */
async function getStudent(req, res) {
  const { id } = req.params;

  const student = await prisma.student.findFirst({
    where: {
      OR: [{ id }, { studentId: id }]
    },
    include: {
      currentFeeGroup: true,
      user: {
        select: {
          id: true,
          username: true,
          loginEnabled: true,
          createdAt: true
        }
      },
      feeHistories: {
        include: {
          feeGroup: {
            select: { name: true }
          },
          creator: {
            select: { username: true }
          }
        },
        orderBy: { effectiveFrom: 'desc' }
      }
    }
  });

  if (!student) {
    return errorResponse(res, 'Student not found', 404);
  }

  return successResponse(res, student);
}

/**
 * POST /api/students
 * Create new student and login user account in a transaction
 */
async function createStudent(req, res) {
  const {
    fullName,
    roomNumber,
    phone,
    email,
    address,
    admissionDate,
    currentFeeGroupId,
    monthlyFee: explicitMonthlyFee,
    password,
    notes
  } = req.body;

  const admissionDateObj = admissionDate ? new Date(admissionDate) : new Date();
  const admissionYear = admissionDateObj.getFullYear();

  // Validate fee group if provided
  let feeGroup = null;
  if (currentFeeGroupId) {
    feeGroup = await prisma.feeGroup.findUnique({
      where: { id: currentFeeGroupId }
    });
    if (!feeGroup) {
      return errorResponse(res, 'Specified fee group does not exist', 400);
    }
  }

  // Determine monthly fee
  let assignedMonthlyFee;
  if (explicitMonthlyFee !== undefined && explicitMonthlyFee !== null && explicitMonthlyFee !== '') {
    assignedMonthlyFee = new Prisma.Decimal(explicitMonthlyFee);
  } else if (feeGroup) {
    assignedMonthlyFee = new Prisma.Decimal(feeGroup.monthlyAmount);
  } else {
    assignedMonthlyFee = new Prisma.Decimal('0.00');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Generate unique sequential studentId
    const studentId = await generateStudentId(admissionYear, tx);

    // 2. Hash student initial password
    const studentPassword = password || 'hostel123';
    const passwordHash = await bcrypt.hash(studentPassword, BCRYPT_ROUNDS);

    // 3. Create User account
    const user = await tx.user.create({
      data: {
        username: studentId,
        passwordHash,
        role: 'STUDENT',
        loginEnabled: true
      }
    });

    // 4. Create Student profile
    const student = await tx.student.create({
      data: {
        studentId,
        fullName: fullName.trim(),
        roomNumber: roomNumber.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        admissionDate: admissionDateObj,
        status: 'ACTIVE',
        currentFeeGroupId: feeGroup ? feeGroup.id : null,
        monthlyFee: assignedMonthlyFee,
        outstandingBalance: new Prisma.Decimal('0.00'),
        notes: notes ? notes.trim() : null,
        userId: user.id,
        initialPassword: studentPassword
      },
      include: {
        currentFeeGroup: true,
        user: {
          select: {
            id: true,
            username: true,
            loginEnabled: true
          }
        }
      }
    });

    // 5. Create Fee History record if fee group assigned
    if (feeGroup) {
      await tx.studentFeeHistory.create({
        data: {
          studentId: student.id,
          feeGroupId: feeGroup.id,
          monthlyFee: assignedMonthlyFee,
          effectiveFrom: admissionDateObj,
          createdBy: req.user.id
        }
      });
    }

    // 6. Audit log
    await logAudit({
      userId: req.user.id,
      action: 'CREATE_STUDENT',
      entity: 'Student',
      entityId: student.id,
      newValue: {
        studentId: student.studentId,
        fullName: student.fullName,
        roomNumber: student.roomNumber,
        monthlyFee: assignedMonthlyFee.toFixed(2),
        currentFeeGroup: feeGroup?.name
      },
      ipAddress: req.ip,
      tx
    });

    return {
      student,
      initialCredentials: {
        username: user.username,
        initialPassword: studentPassword
      }
    };
  });

  return successResponse(res, result, 201, 'Student profile and login account created successfully');
}

/**
 * PUT /api/students/:id
 * Update student profile details
 */
async function updateStudent(req, res) {
  const { id } = req.params;
  const { fullName, roomNumber, phone, email, address, notes, admissionDate } = req.body;

  const existingStudent = await prisma.student.findUnique({
    where: { id }
  });

  if (!existingStudent) {
    return errorResponse(res, 'Student not found', 404);
  }

  const updateData = {};
  if (fullName !== undefined) updateData.fullName = fullName.trim();
  if (roomNumber !== undefined) updateData.roomNumber = roomNumber.trim();
  if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
  if (email !== undefined) updateData.email = email ? email.trim() : null;
  if (address !== undefined) updateData.address = address ? address.trim() : null;
  if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
  if (admissionDate !== undefined) updateData.admissionDate = new Date(admissionDate);

  const updatedStudent = await prisma.student.update({
    where: { id },
    data: updateData,
    include: {
      currentFeeGroup: true,
      user: {
        select: {
          id: true,
          username: true,
          loginEnabled: true
        }
      }
    }
  });

  await logAudit({
    userId: req.user.id,
    action: 'UPDATE_STUDENT',
    entity: 'Student',
    entityId: id,
    oldValue: existingStudent,
    newValue: updatedStudent,
    ipAddress: req.ip
  });

  return successResponse(res, updatedStudent, 200, 'Student updated successfully');
}

/**
 * POST /api/students/:id/deactivate
 * Mark student INACTIVE and record departureDate
 */
async function deactivateStudent(req, res) {
  const { id } = req.params;
  const { departureDate } = req.body;

  const student = await prisma.student.findUnique({
    where: { id }
  });

  if (!student) {
    return errorResponse(res, 'Student not found', 404);
  }

  if (student.status === 'INACTIVE') {
    return errorResponse(res, 'Student is already inactive', 400);
  }

  const departure = departureDate ? new Date(departureDate) : new Date();

  const updatedStudent = await prisma.$transaction(async (tx) => {
    const s = await tx.student.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        departureDate: departure
      }
    });

    // Close any open fee history
    await tx.studentFeeHistory.updateMany({
      where: {
        studentId: id,
        effectiveTo: null
      },
      data: {
        effectiveTo: departure
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'DEACTIVATE_STUDENT',
      entity: 'Student',
      entityId: id,
      oldValue: { status: student.status, departureDate: student.departureDate },
      newValue: { status: 'INACTIVE', departureDate: departure },
      ipAddress: req.ip,
      tx
    });

    return s;
  });

  return successResponse(res, updatedStudent, 200, 'Student deactivated successfully');
}

/**
 * POST /api/students/:id/activate
 * Reactivate student and clear departureDate
 */
async function activateStudent(req, res) {
  const { id } = req.params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: { currentFeeGroup: true }
  });

  if (!student) {
    return errorResponse(res, 'Student not found', 404);
  }

  if (student.status === 'ACTIVE') {
    return errorResponse(res, 'Student is already active', 400);
  }

  const updatedStudent = await prisma.$transaction(async (tx) => {
    const s = await tx.student.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        departureDate: null
      }
    });

    // Create new active fee history if fee group exists
    if (student.currentFeeGroupId) {
      await tx.studentFeeHistory.create({
        data: {
          studentId: id,
          feeGroupId: student.currentFeeGroupId,
          monthlyFee: student.monthlyFee,
          effectiveFrom: new Date(),
          createdBy: req.user.id
        }
      });
    }

    await logAudit({
      userId: req.user.id,
      action: 'ACTIVATE_STUDENT',
      entity: 'Student',
      entityId: id,
      oldValue: { status: student.status, departureDate: student.departureDate },
      newValue: { status: 'ACTIVE', departureDate: null },
      ipAddress: req.ip,
      tx
    });

    return s;
  });

  return successResponse(res, updatedStudent, 200, 'Student reactivated successfully');
}

/**
 * PUT /api/students/:id/fee-group
 * Assign new fee group and record StudentFeeHistory
 */
async function assignFeeGroup(req, res) {
  const { id } = req.params;
  const { feeGroupId, effectiveFrom, monthlyFee } = req.body;

  const student = await prisma.student.findUnique({
    where: { id }
  });

  if (!student) {
    return errorResponse(res, 'Student not found', 404);
  }

  const feeGroup = await prisma.feeGroup.findUnique({
    where: { id: feeGroupId }
  });

  if (!feeGroup) {
    return errorResponse(res, 'Fee group not found', 404);
  }

  const effectiveDate = effectiveFrom ? new Date(effectiveFrom) : new Date();

  let assignedAmount;
  if (monthlyFee !== undefined && monthlyFee !== null) {
    assignedAmount = new Prisma.Decimal(monthlyFee);
  } else {
    assignedAmount = new Prisma.Decimal(feeGroup.monthlyAmount);
  }

  const updatedStudent = await prisma.$transaction(async (tx) => {
    // 1. Close current open fee history record
    await tx.studentFeeHistory.updateMany({
      where: {
        studentId: id,
        effectiveTo: null
      },
      data: {
        effectiveTo: effectiveDate
      }
    });

    // 2. Create new fee history entry
    await tx.studentFeeHistory.create({
      data: {
        studentId: id,
        feeGroupId: feeGroup.id,
        monthlyFee: assignedAmount,
        effectiveFrom: effectiveDate,
        createdBy: req.user.id
      }
    });

    // 3. Update student record
    const updated = await tx.student.update({
      where: { id },
      data: {
        currentFeeGroupId: feeGroup.id,
        monthlyFee: assignedAmount
      },
      include: {
        currentFeeGroup: true
      }
    });

    // 4. Audit Log
    await logAudit({
      userId: req.user.id,
      action: 'ASSIGN_FEE_GROUP',
      entity: 'Student',
      entityId: id,
      oldValue: {
        feeGroupId: student.currentFeeGroupId,
        monthlyFee: student.monthlyFee.toString()
      },
      newValue: {
        feeGroupId: feeGroup.id,
        feeGroupName: feeGroup.name,
        monthlyFee: assignedAmount.toFixed(2),
        effectiveFrom: effectiveDate
      },
      ipAddress: req.ip,
      tx
    });

    return updated;
  });

  return successResponse(res, updatedStudent, 200, 'Fee group assigned successfully');
}

/**
 * POST /api/students/:id/toggle-login
 * Enable or disable student web access
 */
async function toggleLogin(req, res) {
  const { id } = req.params;
  const { loginEnabled } = req.body;

  const student = await prisma.student.findFirst({
    where: {
      OR: [{ id }, { studentId: id }]
    },
    include: { user: true }
  });

  if (!student) {
    return errorResponse(res, 'Student not found', 404);
  }

  const newStatus = loginEnabled !== undefined ? Boolean(loginEnabled) : !student.user.loginEnabled;

  const updatedUser = await prisma.user.update({
    where: { id: student.userId },
    data: { loginEnabled: newStatus }
  });

  await logAudit({
    userId: req.user.id,
    action: 'TOGGLE_LOGIN',
    entity: 'User',
    entityId: student.userId,
    oldValue: { loginEnabled: student.user.loginEnabled },
    newValue: { loginEnabled: newStatus },
    ipAddress: req.ip
  });

  return successResponse(
    res,
    {
      studentId: student.id,
      studentCode: student.studentId,
      loginEnabled: updatedUser.loginEnabled
    },
    200,
    `Student login ${updatedUser.loginEnabled ? 'enabled' : 'disabled'} successfully`
  );
}

/**
 * GET /api/students/:id/ledger
 * Fetch paginated ledger entries
 */
async function getStudentLedger(req, res) {
  const { id } = req.params;
  const { startDate, endDate, entryType, page = 1, limit = 50 } = req.query;

  const targetStudent = await prisma.student.findFirst({
    where: {
      OR: [{ id }, { studentId: id }]
    }
  });

  if (!targetStudent) {
    return errorResponse(res, 'Student not found', 404);
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
  const skip = (parsedPage - 1) * parsedLimit;

  const whereClause = { studentId: targetStudent.id };

  if (entryType) {
    whereClause.entryType = entryType;
  }

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = new Date(startDate);
    if (endDate) whereClause.date.lte = new Date(endDate);
  }

  const [total, entries] = await Promise.all([
    prisma.ledgerEntry.count({ where: whereClause }),
    prisma.ledgerEntry.findMany({
      where: whereClause,
      include: {
        billingPeriod: {
          select: {
            nepaliMonth: true,
            year: true,
            month: true
          }
        },
        recorder: {
          select: {
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
    student: {
      id: targetStudent.id,
      studentId: targetStudent.studentId,
      fullName: targetStudent.fullName,
      roomNumber: targetStudent.roomNumber,
      outstandingBalance: targetStudent.outstandingBalance
    },
    entries,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  });
}

/**
 * GET /api/students/:id/statement
 * Complete statement with summary and itemized entries
 */
async function getStudentStatement(req, res) {
  const { id } = req.params;
  const { startDate, endDate, entryType } = req.query;

  const targetStudent = await prisma.student.findFirst({
    where: {
      OR: [{ id }, { studentId: id }]
    }
  });

  if (!targetStudent) {
    return errorResponse(res, 'Student not found', 404);
  }

  // Recalculate balance for exact consistency
  await recalculateBalance(targetStudent.id);

  const statement = await getRunningBalance(targetStudent.id, {
    startDate,
    endDate,
    entryType
  });

  return successResponse(res, statement);
}

/**
 * POST /api/students/:id/reset-password
 * Admin resets a student's password and stores the new plaintext for display
 */
async function resetStudentPassword(req, res) {
  const { id } = req.params;
  const { password } = req.body;

  const student = await prisma.student.findFirst({
    where: { OR: [{ id }, { studentId: id }] },
    include: { user: true }
  });

  if (!student) {
    return errorResponse(res, 'Student not found', 404);
  }

  if (!student.user) {
    return errorResponse(res, 'Student has no login account', 400);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: student.user.id },
      data: {
        passwordHash,
        initialPassword: password
      }
    }),
    prisma.student.update({
      where: { id: student.id },
      data: { initialPassword: password }
    })
  ]);

  return successResponse(res, { message: 'Password reset successfully' });
}

module.exports = {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deactivateStudent,
  activateStudent,
  assignFeeGroup,
  toggleLogin,
  resetStudentPassword,
  getStudentLedger,
  getStudentStatement
};
