const express = require('express');
const { body, param, query } = require('express-validator');
const studentController = require('../controllers/studentController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireStudentOrAdmin } = require('../middleware/roleGuard');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

// All student routes require authentication
router.use(authenticate);

// GET /api/students — list all students (admin only)
router.get(
  '/',
  requireAdmin,
  [
    query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'active', 'inactive']).withMessage('Status must be ACTIVE or INACTIVE'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500'),
    validateRequest
  ],
  studentController.listStudents
);

// POST /api/students — create student + user account (admin only)
router.post(
  '/',
  requireAdmin,
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('roomNumber').trim().notEmpty().withMessage('Room number is required'),
    body('admissionDate').optional().isISO8601().withMessage('Admission date must be a valid ISO8601 date'),
    body('currentFeeGroupId').optional().isUUID().withMessage('currentFeeGroupId must be a valid UUID'),
    body('monthlyFee').optional().isDecimal().withMessage('monthlyFee must be a valid decimal number'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address'),
    validateRequest
  ],
  studentController.createStudent
);

// GET /api/students/:id — get one student (admin or own student)
router.get(
  '/:id',
  requireStudentOrAdmin,
  [
    param('id').trim().notEmpty().withMessage('Student ID is required'),
    validateRequest
  ],
  studentController.getStudent
);

// PUT /api/students/:id — update student details (admin only)
router.put(
  '/:id',
  requireAdmin,
  [
    param('id').trim().notEmpty().withMessage('Student ID is required'),
    body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
    body('roomNumber').optional().trim().notEmpty().withMessage('Room number cannot be empty'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address'),
    validateRequest
  ],
  studentController.updateStudent
);

// POST /api/students/:id/deactivate — mark inactive (admin only)
router.post(
  '/:id/deactivate',
  requireAdmin,
  [
    param('id').trim().notEmpty().withMessage('Student ID is required'),
    body('departureDate').optional().isISO8601().withMessage('Departure date must be a valid ISO8601 date'),
    validateRequest
  ],
  studentController.deactivateStudent
);

// POST /api/students/:id/activate — mark active (admin only)
router.post(
  '/:id/activate',
  requireAdmin,
  [
    param('id').trim().notEmpty().withMessage('Student ID is required'),
    validateRequest
  ],
  studentController.activateStudent
);

// PUT /api/students/:id/fee-group — assign fee group (admin only)
router.put(
  '/:id/fee-group',
  requireAdmin,
  [
    param('id').trim().notEmpty().withMessage('Student ID is required'),
    body('feeGroupId').isUUID().withMessage('feeGroupId must be a valid UUID'),
    body('effectiveFrom').optional().isISO8601().withMessage('effectiveFrom must be a valid ISO8601 date'),
    body('monthlyFee').optional().isDecimal().withMessage('monthlyFee must be a valid decimal number'),
    validateRequest
  ],
  studentController.assignFeeGroup
);

// POST /api/students/:id/toggle-login — toggle login access (admin only)
router.post(
  '/:id/toggle-login',
  requireAdmin,
  [
    param('id').trim().notEmpty().withMessage('Student ID is required'),
    body('loginEnabled').optional().isBoolean().withMessage('loginEnabled must be a boolean'),
    validateRequest
  ],
  studentController.toggleLogin
);

// GET /api/students/:id/ledger — full ledger (admin or own student)
router.get(
  '/:id/ledger',
  requireStudentOrAdmin,
  [
    param('id').trim().notEmpty().withMessage('Student ID is required'),
    query('startDate').optional().isISO8601().withMessage('startDate must be valid ISO8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be valid ISO8601 date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validateRequest
  ],
  studentController.getStudentLedger
);

// GET /api/students/:id/statement — complete statement (admin or own student)
router.get(
  '/:id/statement',
  requireStudentOrAdmin,
  [
    param('id').trim().notEmpty().withMessage('Student ID is required'),
    query('startDate').optional().isISO8601().withMessage('startDate must be valid ISO8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be valid ISO8601 date'),
    validateRequest
  ],
  studentController.getStudentStatement
);

module.exports = router;
