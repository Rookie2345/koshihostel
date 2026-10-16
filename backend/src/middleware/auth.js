const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma');
const { errorResponse } = require('../utils/response');

/**
 * JWT Authentication Middleware
 * Validates Bearer token from Authorization header.
 * Attaches authenticated user object to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication token required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 'Invalid authorization format', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return errorResponse(res, 'JWT_SECRET is not configured on server', 500);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token has expired', 401);
      }
      return errorResponse(res, 'Invalid or corrupted token', 401);
    }

    // Verify active user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            status: true
          }
        }
      }
    });

    if (!user) {
      return errorResponse(res, 'User account no longer exists', 401);
    }

    if (!user.loginEnabled) {
      return errorResponse(res, 'User account has been disabled', 403);
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      loginEnabled: user.loginEnabled,
      student: user.student || null,
      studentId: user.student?.id || null
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticate
};
