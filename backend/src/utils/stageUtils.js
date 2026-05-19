const Holiday = require('../models/Holiday');

const STAGES = {
  1: 'Camcut / Design',
  2: 'Programming',
  3: 'VMC Machining',
  4: 'Wirecut',
  5: 'Tool Room',
};

const STAGE_NAMES = {
  1: 'design',
  2: 'programming',
  3: 'vmc',
  4: 'wirecut',
  5: 'toolroom',
};

const VMC_MIN_HOURS = parseFloat(process.env.VMC_MIN_HOURS) || 14;
const ALERT_WARNING = parseFloat(process.env.ALERT_WARNING_HOURS) || 30;
const ALERT_CRITICAL = parseFloat(process.env.ALERT_CRITICAL_HOURS) || 36;

// Calculate how many hours of holidays fall between start and now
const getHolidayHoursBetween = async (startDate, endDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = endDate || new Date();

  // Find all holidays between start and end dates
  const holidays = await Holiday.find({
    date: { $gte: new Date(start.toDateString()), $lte: end },
  });

  let pausedHours = 0;
  for (const holiday of holidays) {
    const holidayStart = new Date(holiday.date);
    holidayStart.setHours(0, 0, 0, 0);
    const holidayEnd = new Date(holiday.date);
    holidayEnd.setHours(23, 59, 59, 999);

    // Overlap between [start, end] and [holidayStart, holidayEnd]
    const overlapStart = new Date(Math.max(start, holidayStart));
    const overlapEnd = new Date(Math.min(end, holidayEnd));

    if (overlapEnd > overlapStart) {
      pausedHours += (overlapEnd - overlapStart) / 3600000;
    }
  }

  return pausedHours;
};

// Sync version for virtual fields (uses pre-fetched holidays array)
const getHolidayHoursBetweenSync = (startDate, endDate, holidays) => {
  if (!startDate || !holidays || holidays.length === 0) return 0;
  const start = new Date(startDate);
  const end = endDate || new Date();

  let pausedHours = 0;
  for (const holiday of holidays) {
    const holidayStart = new Date(holiday.date);
    holidayStart.setHours(0, 0, 0, 0);
    const holidayEnd = new Date(holiday.date);
    holidayEnd.setHours(23, 59, 59, 999);

    const overlapStart = new Date(Math.max(start, holidayStart));
    const overlapEnd = new Date(Math.min(end, holidayEnd));

    if (overlapEnd > overlapStart) {
      pausedHours += (overlapEnd - overlapStart) / 3600000;
    }
  }
  return pausedHours;
};

// Elapsed hours since clock started, minus holiday hours
const getPartElapsedHours = (part, holidays = []) => {
  if (!part.clockStartedAt) return 0;
  const raw = (Date.now() - new Date(part.clockStartedAt).getTime()) / 3600000;
  const holidayHours = getHolidayHoursBetweenSync(part.clockStartedAt, new Date(), holidays);
  return Math.max(0, raw - holidayHours);
};

const getPartStatus = (part, holidays = []) => {
  if (part.isCompleted) return 'done';
  const hours = getPartElapsedHours(part, holidays);
  if (hours === 0) return 'ok';
  if (hours > ALERT_CRITICAL) return 'over';
  if (hours > ALERT_WARNING) return 'slow';
  return 'ok';
};

const getStageElapsedHours = (part) => {
  if (!part.currentStageStartedAt) return 0;
  return (Date.now() - new Date(part.currentStageStartedAt).getTime()) / 3600000;
};

const getETA = (part, holidays = []) => {
  if (!part.clockStartedAt || part.isCompleted) return null;
  const elapsed = getPartElapsedHours(part, holidays);
  const remaining = Math.max(0, ALERT_CRITICAL - elapsed);
  return new Date(Date.now() + remaining * 3600000);
};

module.exports = {
  STAGES,
  STAGE_NAMES,
  VMC_MIN_HOURS,
  ALERT_WARNING,
  ALERT_CRITICAL,
  getPartElapsedHours,
  getPartStatus,
  getStageElapsedHours,
  getETA,
  getHolidayHoursBetween,
  getHolidayHoursBetweenSync,
};
