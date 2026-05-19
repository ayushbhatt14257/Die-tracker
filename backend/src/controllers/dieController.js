const Die = require('../models/Die');
const Holiday = require('../models/Holiday');
const { sendSuccess, sendError } = require('../utils/response');
const {
  STAGES, STAGE_NAMES, VMC_MIN_HOURS,
  getPartElapsedHours, getPartStatus, getStageElapsedHours, getETA,
} = require('../utils/stageUtils');
const {
  sendToAllNumbers, buildIssueMessage, buildMouldingMessage, buildGR1ReceivedMessage,
} = require('../services/whatsappService');

const fetchHolidays = async () => Holiday.find({}).lean();

const enrichPart = (part, holidays = []) => ({
  ...part.toObject(),
  elapsedHours: getPartElapsedHours(part, holidays),
  stageElapsedHours: getStageElapsedHours(part),
  status: getPartStatus(part, holidays),
  eta: getETA(part, holidays),
  canMarkVmcDone: part.currentStage === 3 && getStageElapsedHours(part) >= VMC_MIN_HOURS,
  vmcMinHours: VMC_MIN_HOURS,
});

// Compute overall status from enriched parts (holiday-aware)
const computeOverallStatus = (dieStatus, enrichedParts) => {
  if (dieStatus === 'in_transit') return 'in_transit';
  if (dieStatus === 'in_moulding') return 'in_moulding';
  if (dieStatus === 'completed') return 'completed';

  const activeParts = enrichedParts.filter(p => !p.isCompleted);
  if (activeParts.length === 0) return 'ok';

  const hasOver = activeParts.some(p => p.status === 'over');
  const hasSlow = activeParts.some(p => p.status === 'slow');
  if (hasOver) return 'over';
  if (hasSlow) return 'slow';
  return 'ok';
};

const enrichDie = (die, holidays = []) => {
  const dieObj = die.toObject({ virtuals: true });
  const enrichedParts = die.parts.map(p => enrichPart(p, holidays));
  dieObj.parts = enrichedParts;
  dieObj.overallStatus = computeOverallStatus(dieObj.status, enrichedParts);
  return dieObj;
};

// GET /api/dies
const getDies = async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 20, search = '', statusFilter = '' } = req.query;
    const holidays = await fetchHolidays();

    const query = {};
    if (status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { modelName: { $regex: search, $options: 'i' } },
        { dieId: { $regex: search, $options: 'i' } },
      ];
    }

    let dies = await Die.find(query)
      .populate('parts.assignedOperator', 'name role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    let enriched = dies.map(d => enrichDie(d, holidays));

    // Apply sub-filter AFTER enrichment using holiday-aware overallStatus
    if (statusFilter && ['onTrack', 'delayed', 'overdue'].includes(statusFilter)) {
      const map = { onTrack: 'ok', delayed: 'slow', overdue: 'over' };
      enriched = enriched.filter(d => d.overallStatus === map[statusFilter]);
    }

    const total = enriched.length;
    return sendSuccess(res, 'Dies fetched', enriched, { total, page: Number(page), pages: 1 });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/dies/:id
const getDie = async (req, res) => {
  try {
    const holidays = await fetchHolidays();
    const die = await Die.findById(req.params.id).populate('parts.assignedOperator', 'name role');
    if (!die) return sendError(res, 'Die not found', 404);
    return sendSuccess(res, 'Die fetched', enrichDie(die, holidays));
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/dies
const createDie = async (req, res) => {
  try {
    const { modelName, designOption, blockType, parts: partNames, priority, notes } = req.body;
    if (!partNames || partNames.length === 0) return sendError(res, 'At least one part is required');

    const allowedParts = ['Pocket', 'Cavity', 'Insert'];
    const invalidParts = partNames.filter(p => !allowedParts.includes(p));
    if (invalidParts.length > 0) return sendError(res, `Invalid parts: ${invalidParts.join(', ')}`);

    const parts = partNames.map(name => ({
      name,
      currentStage: 1,
      currentStageStartedAt: new Date(),
      stageLog: [{
        stage: 1, stageName: STAGES[1], action: 'started',
        performedBy: req.user._id, performedByName: req.user.name, timestamp: new Date(),
      }],
    }));

    const die = await Die.create({
      modelName, designOption, blockType, parts,
      priority: priority || 'normal', notes: notes || '',
      createdBy: req.user._id, createdByName: req.user.name,
    });

    const holidays = await fetchHolidays();
    return sendSuccess(res, `Die ${die.dieId} created`, enrichDie(die, holidays), null, 201);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const findDieAndPart = async (dieId, partId) => {
  const die = await Die.findById(dieId);
  if (!die) return { error: 'Die not found' };
  const part = die.parts.id(partId);
  if (!part) return { error: 'Part not found' };
  return { die, part };
};

// POST /api/dies/:id/parts/:partId/advance
const advancePart = async (req, res) => {
  try {
    const { die, part, error } = await findDieAndPart(req.params.id, req.params.partId);
    if (error) return sendError(res, error, 404);

    const { machine } = req.body;
    const user = req.user;
    const now = new Date();
    const currentStage = part.currentStage;

    if (part.isCompleted) return sendError(res, 'Part already completed');
    if (currentStage >= 5) return sendError(res, 'Part is at final stage — use complete endpoint');

    if (currentStage === 3) {
      const stageHours = getStageElapsedHours(part);
      if (stageHours < VMC_MIN_HOURS)
        return sendError(res, `Minimum VMC time not reached. ${(VMC_MIN_HOURS - stageHours).toFixed(1)}h remaining.`);
    }

    const stageKey = STAGE_NAMES[currentStage];
    if (stageKey && part.currentStageStartedAt)
      part.stageTimes[stageKey] = (now - part.currentStageStartedAt) / 3600000;

    part.stageLog.push({
      stage: currentStage, stageName: STAGES[currentStage], action: 'completed',
      performedBy: user._id, performedByName: user.name, timestamp: now,
      hoursAtThisStage: part.stageTimes[stageKey] || 0,
    });

    const nextStage = currentStage + 1;
    part.currentStage = nextStage;
    part.currentStageStartedAt = now;
    if (nextStage === 3) part.clockStartedAt = now;
    if (nextStage === 3 && machine) part.assignedMachine = machine;
    part.assignedOperator = user._id;

    part.stageLog.push({
      stage: nextStage, stageName: STAGES[nextStage], action: 'started',
      performedBy: user._id, performedByName: user.name, timestamp: now,
    });

    await die.save();
    const holidays = await fetchHolidays();
    return sendSuccess(res, `${part.name} moved to ${STAGES[nextStage]}`, enrichDie(die, holidays));
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/dies/:id/parts/:partId/complete-toolroom
const completePartToolroom = async (req, res) => {
  try {
    const { die, part, error } = await findDieAndPart(req.params.id, req.params.partId);
    if (error) return sendError(res, error, 404);

    if (part.currentStage !== 5) return sendError(res, 'Part is not at Tool Room stage');
    if (part.isCompleted) return sendError(res, 'Part already completed');

    const now = new Date();
    if (part.currentStageStartedAt)
      part.stageTimes.toolroom = (now - part.currentStageStartedAt) / 3600000;

    part.stageLog.push({
      stage: 5, stageName: STAGES[5], action: 'completed',
      performedBy: req.user._id, performedByName: req.user.name,
      timestamp: now, hoursAtThisStage: part.stageTimes.toolroom,
    });

    part.isCompleted = true;
    part.completedAt = now;

    const allDone = die.parts.every(p => p.isCompleted || p._id.equals(part._id));
    if (allDone) {
      die.allPartsCompletedAt = now;
      const firstClock = die.parts
        .filter(p => p.clockStartedAt)
        .map(p => new Date(p.clockStartedAt).getTime())
        .sort((a, b) => a - b)[0];
      if (firstClock) die.totalHours = (now - firstClock) / 3600000;
    }

    await die.save();
    const holidays = await fetchHolidays();
    return sendSuccess(res, `${part.name} completed at Tool Room`, enrichDie(die, holidays));
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/dies/:id/send-to-moulding — Tool Room dispatches to GR1
const sendToMoulding = async (req, res) => {
  try {
    const die = await Die.findById(req.params.id);
    if (!die) return sendError(res, 'Die not found', 404);
    if (die.status !== 'active') return sendError(res, 'Die is not in active status');

    const pendingParts = die.parts.filter(p => !p.isCompleted);
    if (pendingParts.length > 0)
      return sendError(res, `${pendingParts.map(p => p.name).join(', ')} not yet complete`);

    die.status = 'in_transit';
    die.sentToGR1At = new Date();
    die.sentToGR1By = req.user.name;
    die.sentToMouldingAt = die.sentToGR1At;
    die.sentToMouldingBy = req.user.name;

    await die.save();
    await sendToAllNumbers(buildMouldingMessage(die, req.user.name));

    const holidays = await fetchHolidays();
    return sendSuccess(res, `${die.dieId} dispatched to GR1 Moulding`, enrichDie(die, holidays));
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/dies/:id/receive-gr1 — GR1 marks received
const receiveAtGR1 = async (req, res) => {
  try {
    const die = await Die.findById(req.params.id);
    if (!die) return sendError(res, 'Die not found', 404);
    if (!['in_transit', 'in_moulding'].includes(die.status)) return sendError(res, 'Die cannot be received at GR1 in its current status');

    die.status = 'in_moulding';
    die.receivedAtGR1At = new Date();
    die.receivedAtGR1By = req.user.name;

    await die.save();
    await sendToAllNumbers(buildGR1ReceivedMessage(die, req.user.name));

    const holidays = await fetchHolidays();
    return sendSuccess(res, `${die.dieId} received at GR1 — flow complete`, enrichDie(die, holidays));
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/dies/:id/parts/:partId/issues
const reportIssue = async (req, res) => {
  try {
    const { die, part, error } = await findDieAndPart(req.params.id, req.params.partId);
    if (error) return sendError(res, error, 404);

    const { description } = req.body;
    if (!description?.trim()) return sendError(res, 'Issue description is required');

    const issue = {
      reportedBy: req.user._id, reportedByName: req.user.name,
      stage: part.currentStage, stageName: STAGES[part.currentStage],
      description: description.trim(),
    };
    part.issues.push(issue);
    await die.save();

    const message = buildIssueMessage(die, part, STAGES[part.currentStage], req.user.name, description);
    await sendToAllNumbers(message);

    const lastIssue = part.issues[part.issues.length - 1];
    lastIssue.whatsappSent = true;
    await die.save();

    const holidays = await fetchHolidays();
    return sendSuccess(res, 'Issue reported and WhatsApp sent', enrichDie(die, holidays));
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// PATCH resolve issue
const resolveIssue = async (req, res) => {
  try {
    const { die, part, error } = await findDieAndPart(req.params.id, req.params.partId);
    if (error) return sendError(res, error, 404);

    const issue = part.issues.id(req.params.issueId);
    if (!issue) return sendError(res, 'Issue not found', 404);

    issue.isResolved = true;
    issue.resolvedBy = req.user.name;
    issue.resolvedAt = new Date();
    await die.save();

    const holidays = await fetchHolidays();
    return sendSuccess(res, 'Issue resolved', enrichDie(die, holidays));
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/dies/moulding
const getMouldingDies = async (req, res) => {
  try {
    const holidays = await fetchHolidays();
    const dies = await Die.find({ status: { $in: ['in_transit', 'in_moulding'] } })
      .sort({ sentToGR1At: -1 });
    return sendSuccess(res, 'Moulding dies fetched', dies.map(d => enrichDie(d, holidays)));
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/dies/stats
const getStats = async (req, res) => {
  try {
    const holidays = await fetchHolidays();
    const [active, inTransit, inMoulding, completed] = await Promise.all([
      Die.find({ status: 'active' }),
      Die.countDocuments({ status: 'in_transit' }),
      Die.countDocuments({ status: 'in_moulding' }),
      Die.countDocuments({ status: 'completed' }),
    ]);

    let onTrack = 0, delayed = 0, overdue = 0;
    active.forEach(die => {
      const enriched = enrichDie(die, holidays);
      if (enriched.overallStatus === 'ok') onTrack++;
      else if (enriched.overallStatus === 'slow') delayed++;
      else if (enriched.overallStatus === 'over') overdue++;
    });

    return sendSuccess(res, 'Stats fetched', {
      active: active.length, inTransit, inMoulding, completed, onTrack, delayed, overdue,
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  getDies, getDie, createDie, advancePart, completePartToolroom,
  sendToMoulding, receiveAtGR1, reportIssue, resolveIssue, getMouldingDies, getStats,
};
