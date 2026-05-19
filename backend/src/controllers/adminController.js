const User = require('../models/User');
const Die = require('../models/Die');
const Holiday = require('../models/Holiday');
const { sendSuccess, sendError } = require('../utils/response');

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return sendSuccess(res, 'Users fetched', users);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/admin/users
const createUser = async (req, res) => {
  try {
    const { username, password, name, role, assignedMachine } = req.body;
    const user = await User.create({ username, password, name, role, assignedMachine });
    return sendSuccess(res, 'User created', user, null, 201);
  } catch (err) {
    if (err.code === 11000) return sendError(res, 'Username already exists');
    return sendError(res, err.message, 500);
  }
};

// PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { name, role, assignedMachine, isActive } = req.body;
    const update = { name, role, assignedMachine, isActive };

    if (req.body.password) {
      const bcrypt = require('bcryptjs');
      update.password = await bcrypt.hash(req.body.password, 12);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!user) return sendError(res, 'User not found', 404);
    return sendSuccess(res, 'User updated', user);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/admin/report
const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const dies = await Die.find({ createdAt: { $gte: start, $lte: end } }).populate('createdBy', 'name');

    const summary = {
      total: dies.length,
      completed: dies.filter(d => d.status === 'in_moulding' || d.status === 'completed').length,
      active: dies.filter(d => d.status === 'active').length,
      onTime: 0,
      overBudget: 0,
      avgHours: 0,
    };

    const completedWithTime = dies.filter(d => d.totalHours);
    summary.onTime = completedWithTime.filter(d => d.totalHours <= 36).length;
    summary.overBudget = completedWithTime.filter(d => d.totalHours > 36).length;
    if (completedWithTime.length > 0)
      summary.avgHours = completedWithTime.reduce((a, d) => a + d.totalHours, 0) / completedWithTime.length;

    return sendSuccess(res, 'Monthly report fetched', { summary, dies });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/admin/holidays
const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    return sendSuccess(res, 'Holidays fetched', holidays);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/admin/holidays
const addHoliday = async (req, res) => {
  try {
    const { date, description } = req.body;
    if (!date) return sendError(res, 'Date is required');

    // Reject past dates
    const holidayDate = new Date(date);
    holidayDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (holidayDate < today) return sendError(res, 'Cannot add holiday for a past date');

    const holiday = await Holiday.create({
      date: holidayDate,
      description: description || 'Holiday',
      createdBy: req.user._id,
      createdByName: req.user.name,
    });

    return sendSuccess(res, 'Holiday added — timer will pause for this date', holiday, null, 201);
  } catch (err) {
    if (err.code === 11000) return sendError(res, 'A holiday already exists for this date');
    return sendError(res, err.message, 500);
  }
};

// DELETE /api/admin/holidays/:id
const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) return sendError(res, 'Holiday not found', 404);
    return sendSuccess(res, 'Holiday removed');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = { getUsers, createUser, updateUser, getMonthlyReport, getHolidays, addHoliday, deleteHoliday };
