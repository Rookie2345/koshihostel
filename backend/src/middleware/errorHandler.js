const { Prisma } = require('../prisma');
const { errorResponse } = require('../utils/response');

/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  // Log error in development or for server debugging
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.url}:`, err);
  }

  // Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const fields = err.meta?.target ? (Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target) : 'field';
        return errorResponse(res, `A record with this ${fields} already exists`, 409);
      }
      case 'P2025': {
        const cause = err.meta?.cause || 'Requested record was not found';
        return errorResponse(res, cause, 404);
      }
      case 'P2003': {
        return errorResponse(res, 'Foreign key constraint violation: referenced record does not exist', 400);
      }
      case 'P2014': {
        return errorResponse(res, 'The change violates a required relation between records', 400);
      }
      default:
        return errorResponse(res, `Database error: ${err.message}`, 400);
    }
  }

  // Handle Prisma Validation Errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return errorResponse(res, 'Database validation error: Invalid input data', 400);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid authorization token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Authorization token has expired', 401);
  }

  // Handle SyntaxError (e.g. malformed JSON in request body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'Malformed JSON in request body', 400);
  }

  // Handle Custom Status errors
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, message, status);
}

module.exports = {
  errorHandler
};
