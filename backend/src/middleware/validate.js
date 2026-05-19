const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map(e => e.msg).join(', ');
    return sendError(res, message, 422);
  }
  next();
};

module.exports = { validate };
