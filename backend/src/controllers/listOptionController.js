const ListOption = require('../models/ListOption');
const { sendSuccess, sendError } = require('../utils/response');

const ALLOWED_TYPES = ['sentBy', 'designPlanning', 'master'];

// GET /api/list-options?type=sentBy
const getOptions = async (req, res) => {
  try {
    const { type } = req.query;
    if (!ALLOWED_TYPES.includes(type)) return sendError(res, 'Invalid list type');

    const options = await ListOption.find({ type }).sort({ value: 1 });
    return sendSuccess(res, 'Options fetched', options);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/list-options  { type, value }
const addOption = async (req, res) => {
  try {
    const { type, value } = req.body;
    if (!ALLOWED_TYPES.includes(type)) return sendError(res, 'Invalid list type');
    if (!value?.trim()) return sendError(res, 'Value is required');

    const option = await ListOption.create({
      type,
      value: value.trim(),
      createdBy: req.user._id,
      createdByName: req.user.name,
    });

    return sendSuccess(res, 'Option added', option, null, 201);
  } catch (err) {
    if (err.code === 11000) return sendError(res, 'This option already exists');
    return sendError(res, err.message, 500);
  }
};

// DELETE /api/list-options/:id
const deleteOption = async (req, res) => {
  try {
    const option = await ListOption.findByIdAndDelete(req.params.id);
    if (!option) return sendError(res, 'Option not found', 404);
    return sendSuccess(res, 'Option removed');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = { getOptions, addOption, deleteOption };
