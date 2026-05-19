const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `${field} already exists`, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    return sendError(res, message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') return sendError(res, 'Invalid token', 401);
  if (err.name === 'TokenExpiredError') return sendError(res, 'Token expired', 401);

  return sendError(res, err.message || 'Server error', err.statusCode || 500);
};

const notFound = (req, res) => sendError(res, `Route ${req.path} not found`, 404);

module.exports = { errorHandler, notFound };
