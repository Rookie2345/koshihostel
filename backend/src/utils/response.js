/**
 * Standard API Response Utilities
 */

function successResponse(res, data = null, statusCode = 200, message = null) {
  const payload = { success: true };
  if (message) {
    payload.message = message;
  }
  if (data !== null) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
}

function errorResponse(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
  const payload = {
    success: false,
    error: message
  };
  if (errors && errors.length > 0) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  successResponse,
  errorResponse
};
