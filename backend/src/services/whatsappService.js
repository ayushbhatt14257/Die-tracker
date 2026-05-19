const axios = require('axios');

const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

const sendWhatsAppMessage = async (to, message) => {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    console.log(`[WhatsApp SKIPPED - no token] To: ${to}\n${message}`);
    return;
  }
  try {
    await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`[WhatsApp SENT] To: ${to}`);
  } catch (err) {
    console.error(`[WhatsApp ERROR] ${err?.response?.data?.error?.message || err.message}`);
  }
};

const sendToAllNumbers = async (message) => {
  const numbers = [
    process.env.WHATSAPP_NUMBER_1,
    process.env.WHATSAPP_NUMBER_2,
    process.env.WHATSAPP_NUMBER_3,
    process.env.WHATSAPP_NUMBER_4,
    process.env.WHATSAPP_NUMBER_5,
  ].filter(Boolean);
  await Promise.all(numbers.map(n => sendWhatsAppMessage(n, message)));
};

const buildIssueMessage = (die, part, stageName, operatorName, description) =>
  `🔴 *[ISSUE REPORTED]*\n*${die.dieId} · ${die.modelName} · ${part.name}*\nStage: ${stageName}\nOperator: ${operatorName}\nProblem: ${description}\nTime: ${new Date().toLocaleString('en-IN')}\n\n_Action needed immediately._`;

const buildWarningMessage = (die, part, elapsedHours) =>
  `⚠️ *[DIE WARNING - ${Math.round(elapsedHours)}h elapsed]*\n*${die.dieId} · ${die.modelName} · ${part.name}*\nTotal elapsed: ${elapsedHours.toFixed(1)}h / 36h budget\nRemaining: ${(36 - elapsedHours).toFixed(1)}h\n\n_Check progress now._`;

const buildCriticalMessage = (die, part, elapsedHours) =>
  `🚨 *[OVERDUE - BUDGET EXCEEDED]*\n*${die.dieId} · ${die.modelName} · ${part.name}*\nElapsed: ${elapsedHours.toFixed(1)}h (${(elapsedHours - 36).toFixed(1)}h over budget)\nCurrently at: Stage ${part.currentStage}\n\n_Immediate action required._`;

const buildMouldingMessage = (die, sentBy) =>
  `🚚 *[DISPATCHED TO GR1 MOULDING]*\n*${die.dieId} · ${die.modelName}*\nSent by: ${sentBy} (GR2 Tool Room)\nTime: ${new Date().toLocaleString('en-IN')}\n\n_Die is in transit. GR1 receiver to mark received._`;

const buildGR1ReceivedMessage = (die, receivedBy) =>
  `✅ *[RECEIVED AT GR1 MOULDING]*\n*${die.dieId} · ${die.modelName}*\nReceived by: ${receivedBy}\nTotal production time: ${die.totalHours ? die.totalHours.toFixed(1) + 'h' : 'N/A'}\nTime: ${new Date().toLocaleString('en-IN')}\n\n_Die is now in GR1 Moulding. Production flow complete._`;

module.exports = {
  sendToAllNumbers,
  buildIssueMessage,
  buildWarningMessage,
  buildCriticalMessage,
  buildMouldingMessage,
  buildGR1ReceivedMessage,
};
