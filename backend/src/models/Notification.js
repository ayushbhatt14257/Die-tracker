const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['die_deleted'], required: true },
  message: { type: String, required: true },
  dieId: String, // human-readable die id, e.g. DIE-003
  die: { type: mongoose.Schema.Types.ObjectId, ref: 'Die' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
  isRead: { type: Boolean, default: false },
}, { timestamps: true, autoIndex: false }); // autoIndex off — see ListOption.js for why

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
