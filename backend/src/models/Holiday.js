const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Holiday date is required'],
    unique: true,
  },
  description: {
    type: String,
    trim: true,
    default: 'Holiday',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdByName: String,
}, { timestamps: true });

// Index for fast lookup
holidaySchema.index({ date: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
