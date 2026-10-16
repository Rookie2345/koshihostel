const express = require('express');
const { body, param, query } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

// All payment routes require admin authentication
router.use(authenticate, requireAdmin);

// GET /api/payments
router.get(
  '/',
  [
    query('studentId').optional().isUUID().withMessage('studentId must be a valid UUID'),
    query('startDate').optional().isISO8601().withMessage('startDate must be valid ISO8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be valid ISO8601 date'),
    query('paymentMethod').optional().isIn(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER']).withMessage('Invalid paymentMethod'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validateRequest
  ],
  paymentController.listPayments
);

// POST /api/payments — record payment
router.post(
  '/',
  [
    body('studentId').isUUID().withMessage('studentId must be a valid UUID'),
    body('amount').isDecimal().withMessage('amount must be a valid decimal number'),
    body('date').optional().isISO8601().withMessage('date must be valid ISO8601 date'),
    body('paymentMethod').optional().isIn(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER']).withMessage('Invalid payment method'),
    body('referenceNumber').optional().trim(),
    body('receiptNumber').optional().trim(),
    body('notes').optional().trim(),
    validateRequest
  ],
  paymentController.recordPayment
);

// POST /api/payments/adjustment — record credit/refund/adjustment
router.post(
  '/adjustment',
  [
    body('studentId').isUUID().withMessage('studentId must be a valid UUID'),
    body('amount').isDecimal().withMessage('amount must be a valid decimal number'),
    body('type').isIn(['CREDIT', 'REFUND', 'ADJUSTMENT']).withMessage('type must be CREDIT, REFUND, or ADJUSTMENT'),
    body('date').optional().isISO8601().withMessage('date must be valid ISO8601 date'),
    body('description').optional().trim(),
    body('notes').optional().trim(),
    body('isDebit').optional().isBoolean().withMessage('isDebit must be boolean'),
    validateRequest
  ],
  paymentController.recordAdjustment
);

// GET /api/payments/:id
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid payment ID'),
    validateRequest
  ],
  paymentController.getPayment
);

// POST /api/payments/:id/reverse — reverse a transaction
router.post(
  '/:id/reverse',
  [
    param('id').isUUID().withMessage('Invalid payment ID'),
    body('reason').optional().trim(),
    validateRequest
  ],
  paymentController.reversePayment
);

module.exports = router;
