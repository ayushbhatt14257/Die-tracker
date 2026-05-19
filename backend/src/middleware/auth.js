const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (!token) return sendError(res, 'Not authenticated', 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) return sendError(res, 'Account not found or deactivated', 401);

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired token', 401);
  }
};

// Restrict to specific roles
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return sendError(res, 'You do not have permission to perform this action', 403);
  }
  next();
};

module.exports = { protect, authorize };
