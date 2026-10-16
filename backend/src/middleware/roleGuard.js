const { errorResponse } = require('../utils/response');

/**
 * Require ADMIN role middleware
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  if (req.user.role !== 'ADMIN') {
    return errorResponse(res, 'Access denied: Administrator privileges required', 403);
  }

  next();
}

/**
 * Require STUDENT or ADMIN role middleware
 * If the user is a student, ensures they are accessing their own student record.
 */
function requireStudentOrAdmin(req, res, next) {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (req.user.role === 'STUDENT') {
    const targetStudentId = req.params.id || req.params.studentId || req.query.studentId || req.body.studentId;
    const ownStudentId = req.user.student?.id;
    const ownStudentCode = req.user.student?.studentId;

    if (!targetStudentId || (targetStudentId !== ownStudentId && targetStudentId !== ownStudentCode)) {
      return errorResponse(res, 'Access denied: You may only view your own student data', 403);
    }

    return next();
  }

  return errorResponse(res, 'Access denied', 403);
}

module.exports = {
  requireAdmin,
  requireStudentOrAdmin
};
