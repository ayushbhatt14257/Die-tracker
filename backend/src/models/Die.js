const mongoose = require('mongoose');

// Each stage transition is recorded permanently
const stageLogSchema = new mongoose.Schema({
  stage: { type: Number, required: true, min: 1, max: 6 },
  stageName: String,
  action: { type: String, enum: ['started', 'completed'], required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: String,
  machine: String,
  timestamp: { type: Date, default: Date.now },
  hoursAtThisStage: Number,
}, { _id: false });

const issueSchema = new mongoose.Schema({
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedByName: String,
  stage: Number,
  stageName: String,
  description: String,
  isResolved: { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date,
  whatsappSent: { type: Boolean, default: false },
}, { timestamps: true });

const partSchema = new mongoose.Schema({
  name: { type: String, enum: ['Pocket', 'Cavity', 'Insert'], required: true },
  currentStage: { type: Number, default: 1, min: 1, max: 6 },
  clockStartedAt: { type: Date, default: null },
  stageTimes: {
    design: { type: Number, default: 0 },
    programming: { type: Number, default: 0 },
    vmc: { type: Number, default: 0 },
    wirecut: { type: Number, default: 0 },
    toolroom: { type: Number, default: 0 },
  },
  assignedMachine: { type: String, default: null },
  assignedOperator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  stageLog: [stageLogSchema],
  issues: [issueSchema],
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  currentStageStartedAt: { type: Date, default: null },
  alert30Sent: { type: Boolean, default: false },
  alert36Sent: { type: Boolean, default: false },
}, { _id: true });

const dieSchema = new mongoose.Schema({
  dieId: { type: String, unique: true },
  modelName: { type: String, required: [true, 'Model name is required'], trim: true },
  // Legacy fields — no longer shown on the create/edit form, kept optional for backward compatibility
  designOption: { type: String, trim: true, default: '' },
  blockType: { type: String, trim: true, default: '' },
  // Who physically sent/handed over this die (free-text, saved to a reusable dropdown list)
  sentBy: { type: String, trim: true, default: '' },
  // Whether dimension has been checked / SOP followed
  checkDimensionSOP: { type: Boolean, default: false },
  // Die planning category — multi-select (e.g. Candy, Mag-case, Converter Case…)
  designPlanning: { type: [String], default: [] },
  // Master block type — single select (e.g. IP-Block, HH-China…)
  master: { type: String, trim: true, default: '' },
  parts: [partSchema],
  status: {
    type: String,
    enum: ['active', 'in_transit', 'in_moulding', 'completed'],
    default: 'active',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
  // Soft delete — deleted dies stay in DB and surface in the Admin panel
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedByName: String,
  // GR2 → GR1 transit fields
  sentToGR1At: { type: Date, default: null },
  sentToGR1By: String,
  // GR1 received fields
  receivedAtGR1At: { type: Date, default: null },
  receivedAtGR1By: String,
  // Legacy compat
  sentToMouldingAt: { type: Date, default: null },
  sentToMouldingBy: String,
  allPartsCompletedAt: { type: Date, default: null },
  totalHours: { type: Number, default: null },
  priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  notes: { type: String, default: '' },
}, { timestamps: true });

dieSchema.pre('save', async function (next) {
  if (this.isNew && !this.dieId) {
    const count = await mongoose.model('Die').countDocuments();
    this.dieId = `DIE-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

dieSchema.index({ status: 1, createdAt: -1 });
dieSchema.index({ dieId: 1 });

dieSchema.virtual('overallStatus').get(function () {
  if (this.status === 'in_transit') return 'in_transit';
  if (this.status === 'in_moulding') return 'in_moulding';
  if (this.status === 'completed') return 'completed';

  const activePartStatuses = this.parts
    .filter(p => !p.isCompleted)
    .map(p => {
      if (!p.clockStartedAt) return 'ok';
      const hours = (Date.now() - p.clockStartedAt) / 3600000;
      if (hours > 36) return 'over';
      if (hours > 30) return 'slow';
      return 'ok';
    });

  if (activePartStatuses.includes('over')) return 'over';
  if (activePartStatuses.includes('slow')) return 'slow';
  return 'ok';
});

dieSchema.set('toJSON', { virtuals: true });
dieSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Die', dieSchema);
