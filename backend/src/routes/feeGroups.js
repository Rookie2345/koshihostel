const express = require('express');
const { body, param, query } = require('express-validator');
const feeGroupController = require('../controllers/feeGroupController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

// All fee group routes require admin authentication
router.use(authenticate, requireAdmin);

// GET /api/fee-groups
router.get(
  '/',
  [
    query('includeInactive').optional().isBoolean().withMessage('includeInactive must be boolean'),
    validateRequest
  ],
  feeGroupController.listFeeGroups
);

// POST /api/fee-groups
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Fee group name is required'),
    body('monthlyAmount').isDecimal().withMessage('Monthly amount must be a valid decimal number'),
    body('description').optional().trim(),
    validateRequest
  ],
  feeGroupController.createFeeGroup
);

// PUT /api/fee-groups/:id
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid fee group ID'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('monthlyAmount').optional().isDecimal().withMessage('Monthly amount must be a valid decimal number'),
    body('description').optional().trim(),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    validateRequest
  ],
  feeGroupController.updateFeeGroup
);

// DELETE /api/fee-groups/:id (soft delete)
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid fee group ID'),
    validateRequest
  ],
  feeGroupController.deleteFeeGroup
);

// GET /api/fee-groups/:id/students
router.get(
  '/:id/students',
  [
    param('id').isUUID().withMessage('Invalid fee group ID'),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'active', 'inactive']).withMessage('Status must be ACTIVE or INACTIVE'),
    validateRequest
  ],
  feeGroupController.getFeeGroupStudents
);

module.exports = router;
