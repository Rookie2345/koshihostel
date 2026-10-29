const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
  ],
  authController.login
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validateRequest
  ],
  authController.refreshToken
);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/change-password (authenticated user)
router.post(
  '/change-password',
  [
    authenticate,
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
    validateRequest
  ],
  authController.changePassword
);

// PUT /api/auth/profile (authenticated user updates username and/or password)
router.put(
  '/profile',
  [
    authenticate,
    validateRequest
  ],
  authController.updateProfile
);

// POST /api/auth/admin/reset-student-password (admin only)
router.post(
  '/admin/reset-student-password',
  [
    authenticate,
    requireAdmin,
    body('userId').trim().notEmpty().withMessage('User ID is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
    validateRequest
  ],
  authController.resetStudentPassword
);

module.exports = router;
