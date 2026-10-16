const { prisma } = require('../prisma');
const { successResponse, errorResponse } = require('../utils/response');
const billingService = require('../services/billingService');

/**
 * GET /api/billing/periods
 * List all billing periods with student count and total amounts
 */
async function listBillingPeriods(req, res) {
  const { page = 1, limit = 20 } = req.query;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [total, periods] = await Promise.all([
    prisma.billingPeriod.count(),
    prisma.billingPeriod.findMany({
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        _count: {
          select: {
            ledgerEntries: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ],
      skip,
      take: parsedLimit
    })
  ]);

  return successResponse(res, {
    periods,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  });
}

/**
 * GET /api/billing/periods/:id
 * Get single billing period details with its ledger entries
 */
async function getBillingPeriod(req, res) {
  const { id } = req.params;

  const period = await prisma.billingPeriod.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          username: true
        }
      },
      ledgerEntries: {
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              fullName: true,
              roomNumber: true,
              status: true
            }
          }
        },
        orderBy: {
          student: {
            roomNumber: 'asc'
          }
        }
      }
    }
  });

  if (!period) {
    return errorResponse(res, 'Billing period not found', 404);
  }

  return successResponse(res, period);
}

/**
 * GET or POST /api/billing/preview
 * Preview monthly billing before generation
 */
async function previewBilling(req, res) {
  const params = {
    year: req.method === 'POST' ? req.body.year : (req.query.year || req.body?.year),
    month: req.method === 'POST' ? req.body.month : (req.query.month || req.body?.month),
    target: (req.method === 'POST' ? req.body.target : (req.query.target || req.body?.target)) || 'ALL',
    feeGroupId: req.method === 'POST' ? req.body.feeGroupId : (req.query.feeGroupId || req.body?.feeGroupId),
    studentIds: req.method === 'POST' ? req.body.studentIds : (req.query.studentIds || req.body?.studentIds),
    adjustments: req.body?.adjustments || {}
  };

  if (!params.year || !params.month) {
    return errorResponse(res, 'Year and month are required', 400);
  }

  const result = await billingService.previewBilling(params);
  return successResponse(res, result);
}

/**
 * POST /api/billing/generate
 * Generate monthly charges transactionally
 */
async function generateBilling(req, res) {
  const { year, month, target = 'ALL', feeGroupId, studentIds, adjustments } = req.body;

  if (!year || !month) {
    return errorResponse(res, 'Year and month are required', 400);
  }

  const result = await billingService.generateBilling(
    {
      year,
      month,
      target,
      feeGroupId,
      studentIds,
      adjustments
    },
    req.user.id
  );

  return successResponse(res, result, 201, `Monthly billing generated for ${result.nepaliMonth}`);
}

module.exports = {
  listBillingPeriods,
  getBillingPeriod,
  previewBilling,
  generateBilling
};
