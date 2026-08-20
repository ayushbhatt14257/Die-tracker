const mongoose = require('mongoose');

// Generic manageable dropdown options — used for "Sent By" names,
// "Design Planning" categories, and "Master" block types.
// Users can add/delete entries from the UI; type differentiates the list.
const listOptionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['sentBy', 'designPlanning', 'master'],
    required: true,
  },
  value: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
}, { timestamps: true });

listOptionSchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model('ListOption', listOptionSchema);
