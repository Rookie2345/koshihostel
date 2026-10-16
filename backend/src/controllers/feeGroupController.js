const { prisma, Prisma } = require('../prisma');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../services/auditService');

/**
 * GET /api/fee-groups
 * List all fee groups with student counts
 */
async function listFeeGroups(req, res) {
  const { includeInactive } = req.query;

  const whereClause = {};
  if (includeInactive !== 'true') {
    whereClause.isActive = true;
  }

  const feeGroups = await prisma.feeGroup.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          students: {
            where: { status: 'ACTIVE' }
          }
        }
      }
    },
    orderBy: { monthlyAmount: 'asc' }
  });

  const formattedGroups = feeGroups.map((g) => ({
    id: g.id,
    name: g.name,
    monthlyAmount: g.monthlyAmount,
    description: g.description,
    isActive: g.isActive,
    activeStudentCount: g._count.students,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt
  }));

  return successResponse(res, formattedGroups);
}

/**
 * POST /api/fee-groups
 * Create new fee group
 */
async function createFeeGroup(req, res) {
  const { name, monthlyAmount, description } = req.body;

  const amountDecimal = new Prisma.Decimal(monthlyAmount);
  if (amountDecimal.lessThanOrEqualTo(0)) {
    return errorResponse(res, 'Monthly amount must be greater than zero', 400);
  }

  const existing = await prisma.feeGroup.findUnique({
    where: { name: name.trim() }
  });

  if (existing) {
    return errorResponse(res, `A fee group named "${name.trim()}" already exists`, 409);
  }

  const feeGroup = await prisma.feeGroup.create({
    data: {
      name: name.trim(),
      monthlyAmount: amountDecimal,
      description: description ? description.trim() : null,
      isActive: true
    }
  });

  await logAudit({
    userId: req.user.id,
    action: 'CREATE_FEE_GROUP',
    entity: 'FeeGroup',
    entityId: feeGroup.id,
    newValue: feeGroup,
    ipAddress: req.ip
  });

  return successResponse(res, feeGroup, 201, 'Fee group created successfully');
}

/**
 * PUT /api/fee-groups/:id
 * Update fee group details (does not retroactively affect existing ledger entries)
 */
async function updateFeeGroup(req, res) {
  const { id } = req.params;
  const { name, monthlyAmount, description, isActive } = req.body;

  const feeGroup = await prisma.feeGroup.findUnique({
    where: { id }
  });

  if (!feeGroup) {
    return errorResponse(res, 'Fee group not found', 404);
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description ? description.trim() : null;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

  if (monthlyAmount !== undefined) {
    const amountDecimal = new Prisma.Decimal(monthlyAmount);
    if (amountDecimal.lessThanOrEqualTo(0)) {
      return errorResponse(res, 'Monthly amount must be greater than zero', 400);
    }
    updateData.monthlyAmount = amountDecimal;
  }

  // Check unique name if name is updated
  if (updateData.name && updateData.name !== feeGroup.name) {
    const existing = await prisma.feeGroup.findUnique({
      where: { name: updateData.name }
    });
    if (existing) {
      return errorResponse(res, `A fee group named "${updateData.name}" already exists`, 409);
    }
  }

  const updatedGroup = await prisma.feeGroup.update({
    where: { id },
    data: updateData
  });

  await logAudit({
    userId: req.user.id,
    action: 'UPDATE_FEE_GROUP',
    entity: 'FeeGroup',
    entityId: id,
    oldValue: feeGroup,
    newValue: updatedGroup,
    ipAddress: req.ip
  });

  return successResponse(res, updatedGroup, 200, 'Fee group updated successfully');
}

/**
 * DELETE /api/fee-groups/:id
 * Soft delete (set isActive=false), only if no active students
 */
async function deleteFeeGroup(req, res) {
  const { id } = req.params;

  const feeGroup = await prisma.feeGroup.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          students: {
            where: { status: 'ACTIVE' }
          }
        }
      }
    }
  });

  if (!feeGroup) {
    return errorResponse(res, 'Fee group not found', 404);
  }

  if (feeGroup._count.students > 0) {
    return errorResponse(
      res,
      `Cannot deactivate fee group: ${feeGroup._count.students} active student(s) are currently assigned to this group. Reassign them first.`,
      400
    );
  }

  const updatedGroup = await prisma.feeGroup.update({
    where: { id },
    data: { isActive: false }
  });

  await logAudit({
    userId: req.user.id,
    action: 'DEACTIVATE_FEE_GROUP',
    entity: 'FeeGroup',
    entityId: id,
    oldValue: { isActive: feeGroup.isActive },
    newValue: { isActive: false },
    ipAddress: req.ip
  });

  return successResponse(res, updatedGroup, 200, 'Fee group deactivated successfully');
}

/**
 * GET /api/fee-groups/:id/students
 * List all students in this fee group
 */
async function getFeeGroupStudents(req, res) {
  const { id } = req.params;
  const { status } = req.query;

  const feeGroup = await prisma.feeGroup.findUnique({
    where: { id }
  });

  if (!feeGroup) {
    return errorResponse(res, 'Fee group not found', 404);
  }

  const studentWhere = { currentFeeGroupId: id };
  if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
    studentWhere.status = status.toUpperCase();
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      studentId: true,
      fullName: true,
      roomNumber: true,
      status: true,
      monthlyFee: true,
      outstandingBalance: true,
      admissionDate: true,
      phone: true
    },
    orderBy: { roomNumber: 'asc' }
  });

  return successResponse(res, {
    feeGroup,
    studentCount: students.length,
    students
  });
}

module.exports = {
  listFeeGroups,
  createFeeGroup,
  updateFeeGroup,
  deleteFeeGroup,
  getFeeGroupStudents
};
