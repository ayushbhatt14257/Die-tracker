const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const { validate } = require('../middleware/validate');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '8h' });

// POST /api/auth/login
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username: username.toLowerCase(), isActive: true }).select('+password');
    if (!user) return sendError(res, 'Invalid username or password', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return sendError(res, 'Invalid username or password', 401);

    const token = signToken(user._id);

    return sendSuccess(res, 'Login successful', {
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        assignedMachine: user.assignedMachine,
      },
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  return sendSuccess(res, 'User fetched', {
    id: req.user._id,
    username: req.user.username,
    name: req.user.name,
    role: req.user.role,
    assignedMachine: req.user.assignedMachine,
  });
};

module.exports = { login, loginValidation, getMe };
