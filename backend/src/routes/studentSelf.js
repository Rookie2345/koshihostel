const express = require('express');
const { query } = require('express-validator');
const studentSelfController = require('../controllers/studentSelfController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

// All self-service routes require authentication
router.use(authenticate);

// GET /api/me/profile — student profile
router.get('/profile', studentSelfController.getMyProfile);

// GET /api/me/ledger — own ledger entries
router.get(
  '/ledger',
  [
    query('startDate').optional().isISO8601().withMessage('startDate must be valid ISO8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be valid ISO8601 date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validateRequest
  ],
  studentSelfController.getMyLedger
);

// GET /api/me/statement — own financial statement
router.get(
  '/statement',
  [
    query('startDate').optional().isISO8601().withMessage('startDate must be valid ISO8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be valid ISO8601 date'),
    validateRequest
  ],
  studentSelfController.getMyStatement
);

module.exports = router;
