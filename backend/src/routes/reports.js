const express = require('express');
const { query } = require('express-validator');
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

// All report routes require admin authentication
router.use(authenticate, requireAdmin);

// GET /api/reports/dashboard
router.get('/dashboard', reportController.getDashboardStats);

// GET /api/reports/monthly-summary
router.get('/monthly-summary', reportController.getMonthlySummary);

// GET /api/reports/fee-group-summary
router.get('/fee-group-summary', reportController.getFeeGroupSummary);

// GET /api/reports/outstanding
router.get(
  '/outstanding',
  [
    query('status').optional().isIn(['ALL', 'ACTIVE', 'INACTIVE', 'all', 'active', 'inactive']).withMessage('Status must be ALL, ACTIVE, or INACTIVE'),
    validateRequest
  ],
  reportController.getOutstandingReport
);

// GET /api/reports/collection
router.get(
  '/collection',
  [
    query('startDate').optional().isISO8601().withMessage('startDate must be valid ISO8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be valid ISO8601 date'),
    validateRequest
  ],
  reportController.getCollectionReport
);

// GET /api/reports/former-students
router.get('/former-students', reportController.getFormerStudentsReport);

// GET /api/reports/export/outstanding
router.get(
  '/export/outstanding',
  [
    query('status').optional().isIn(['ALL', 'ACTIVE', 'INACTIVE', 'all', 'active', 'inactive']).withMessage('Status must be ALL, ACTIVE, or INACTIVE'),
    validateRequest
  ],
  reportController.exportOutstandingCSV
);

// GET /api/reports/export/collection
router.get(
  '/export/collection',
  [
    query('startDate').optional().isISO8601().withMessage('startDate must be valid ISO8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be valid ISO8601 date'),
    validateRequest
  ],
  reportController.exportCollectionCSV
);

module.exports = router;
