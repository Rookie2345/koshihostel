const { errorResponse } = require('../utils/response');

function requireAdmin(req, res, next) {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  if (String(req.user.role).toUpperCase() !== 'ADMIN') {
    return errorResponse(res, 'Access denied: Administrator privileges required', 403);
  }

  next();
}

function requireStudentOrAdmin(req, res, next) {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  const userRole = String(req.user.role).toUpperCase();

  if (userRole === 'ADMIN') {
    return next();
  }

  if (userRole === 'STUDENT') {
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
