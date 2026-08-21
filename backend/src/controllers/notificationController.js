const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(100).maxTimeMS(8000);
    const unreadCount = await Notification.countDocuments({ isRead: false }).maxTimeMS(8000);
    return sendSuccess(res, 'Notifications fetched', notifications, { unreadCount });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, { isRead: true }, { new: true }
    );
    if (!notification) return sendError(res, 'Notification not found', 404);
    return sendSuccess(res, 'Marked read', notification);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    return sendSuccess(res, 'All notifications marked read');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = { getNotifications, markRead, markAllRead };
