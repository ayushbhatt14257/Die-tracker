const cron = require('node-cron');
const Die = require('../models/Die');
const Holiday = require('../models/Holiday');
const { getPartElapsedHours, getHolidayHoursBetweenSync } = require('../utils/stageUtils');
const { sendToAllNumbers, buildWarningMessage, buildCriticalMessage } = require('./whatsappService');

const runAlertCheck = async () => {
  try {
    const activeDies = await Die.find({ status: 'active' });
    const holidays = await Holiday.find({}).lean();

    for (const die of activeDies) {
      let changed = false;

      for (const part of die.parts) {
        if (part.isCompleted || !part.clockStartedAt) continue;

        const elapsed = getPartElapsedHours(part, holidays);

        if (elapsed >= 36 && !part.alert36Sent) {
          await sendToAllNumbers(buildCriticalMessage(die, part, elapsed));
          part.alert36Sent = true;
          changed = true;
        } else if (elapsed >= 30 && !part.alert30Sent) {
          await sendToAllNumbers(buildWarningMessage(die, part, elapsed));
          part.alert30Sent = true;
          changed = true;
        }
      }

      if (changed) await die.save();
    }
  } catch (err) {
    console.error('[Alert cron error]', err.message);
  }
};

const startAlertCron = () => {
  cron.schedule('*/5 * * * *', runAlertCheck);
  console.log('[Alert cron] Started — checks every 5 minutes');
};

module.exports = { startAlertCron, runAlertCheck };
