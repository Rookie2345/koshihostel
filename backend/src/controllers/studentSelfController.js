const { prisma } = require('../prisma');
const { successResponse, errorResponse } = require('../utils/response');
const { getRunningBalance, recalculateBalance } = require('../services/balanceService');

/**
 * GET /api/me/profile
 * Get authenticated student's own profile
 */
async function getMyProfile(req, res) {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      loginEnabled: true,
      createdAt: true,
      student: {
        include: {
          currentFeeGroup: {
            select: {
              id: true,
              name: true,
              monthlyAmount: true,
              description: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  if (user.role === 'ADMIN' && !user.student) {
    return successResponse(res, {
      id: user.id,
      username: user.username,
      role: user.role,
      loginEnabled: user.loginEnabled,
      createdAt: user.createdAt,
      isAdmin: true
    });
  }

  if (!user.student) {
    return errorResponse(res, 'No student profile associated with this account', 404);
  }

  return successResponse(res, {
    account: {
      userId: user.id,
      username: user.username,
      role: user.role
    },
    student: user.student
  });
}

/**
 * GET /api/me/ledger
 * Get authenticated student's own paginated ledger entries
 */
async function getMyLedger(req, res) {
  const studentId = req.user.studentId;

  if (!studentId) {
    return errorResponse(res, 'No student record associated with this account', 404);
  }

  const { startDate, endDate, entryType, page = 1, limit = 50 } = req.query;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
  const skip = (parsedPage - 1) * parsedLimit;

  const whereClause = { studentId };

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
 * GET /api/me/statement
 * Get authenticated student's own financial statement
 */
async function getMyStatement(req, res) {
  const studentId = req.user.studentId;

  if (!studentId) {
    return errorResponse(res, 'No student record associated with this account', 404);
  }

  const { startDate, endDate, entryType } = req.query;

  // Recalculate balance for exact precision
  await recalculateBalance(studentId);

  const statement = await getRunningBalance(studentId, {
    startDate,
    endDate,
    entryType
  });

  return successResponse(res, statement);
}

module.exports = {
  getMyProfile,
  getMyLedger,
  getMyStatement
};
