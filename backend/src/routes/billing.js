const express = require('express');
const { body, param, query } = require('express-validator');
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

// All billing routes require admin authentication
router.use(authenticate, requireAdmin);

// GET /api/billing/periods
router.get(
  '/periods',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validateRequest
  ],
  billingController.listBillingPeriods
);

// GET /api/billing/preview (and POST /api/billing/preview)
router.get('/preview', billingController.previewBilling);
router.post(
  '/preview',
  [
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required (2000-2100)'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required (1-12)'),
    body('target').optional().isIn(['ALL', 'GROUP', 'SELECTED']).withMessage('Target must be ALL, GROUP, or SELECTED'),
    body('feeGroupId').optional().isUUID().withMessage('feeGroupId must be a valid UUID'),
    body('studentIds').optional().isArray().withMessage('studentIds must be an array'),
    validateRequest
  ],
  billingController.previewBilling
);

// POST /api/billing/generate
router.post(
  '/generate',
  [
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required (2000-2100)'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required (1-12)'),
    body('target').optional().isIn(['ALL', 'GROUP', 'SELECTED']).withMessage('Target must be ALL, GROUP, or SELECTED'),
    body('feeGroupId').optional().isUUID().withMessage('feeGroupId must be a valid UUID'),
    body('studentIds').optional().isArray().withMessage('studentIds must be an array'),
    validateRequest
  ],
  billingController.generateBilling
);

// GET /api/billing/periods/:id
router.get(
  '/periods/:id',
  [
    param('id').isUUID().withMessage('Invalid billing period ID'),
    validateRequest
  ],
  billingController.getBillingPeriod
);

module.exports = router;
