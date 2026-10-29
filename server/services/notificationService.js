const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotifications } = require('./pushService');
const { errorCrit } = require('../utils/logger');
const { sendBrowserNotification } = require('./browserPushService');

/** 
 * Sends a notification via MongoDB, Socket.io, and Expo Push.
 * 
 * @param {Object} params
 * @param {string} params.recipientId - User ID of the recipient
 * @param {string} params.senderId - User ID of the sender (optional)
 * @param {string} params.type - Type of notification (e.g., 'leave_applied', 'announcement')
 * @param {string} params.title - Title of the notification
 * @param {string} params.message - Body of the notification
 * @param {string} params.link - Deep link or route to navigate to (optional)
 * @param {Object} params.data - Extra payload (optional)
 * @param {string} params.referenceId - Related document ID (optional)
 * @param {string} params.referenceType - Related document model name (optional)
 * @param {Object} io - Socket.io instance
 */
const sendNotification = async ({
  recipientId,
  senderId,
  type,
  title,
  message,
  link,
  data,
  referenceId,
  referenceType,
  io
}) => {
  try {
    // 1. Save to MongoDB
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      link,
      data,
      referenceId,
      referenceType,
    });

    // A socket/population failure must not prevent delivery to a closed app.
    if (io) {
      try {
        let populatedNotif = notification;
        if (senderId) {
          populatedNotif = await Notification.findById(notification._id).populate('sender', 'name displayName profilePic');
        }
        io.to(`user:${recipientId}`).emit('notification:new', populatedNotif);
      } catch (socketError) {
        errorCrit('[NotificationService] Socket delivery failed:', socketError.message);
      }
    }

    const user = await User.findById(recipientId).select('expoPushToken isActive tokenVersion role');
    if (user && user.isActive !== false) {
      await sendBrowserNotification(user, notification).catch(() => {});
    }
    if (user && user.isActive !== false && user.expoPushToken) {
      await sendPushNotifications([user.expoPushToken], {
        title,
        body: message,
        data: {
          ...data, type, link, notificationId: notification._id.toString(),
          ...(referenceId ? { referenceId: String(referenceId) } : {}),
          ...(referenceType ? { referenceType } : {}),
        },
      });
    }

    return { success: true, notification };
  } catch (error) {
    errorCrit(`[NotificationService] Error sending notification to ${recipientId}:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendBulkNotifications = async ({
  recipientIds = [],
  senderId,
  type,
  title,
  message,
  link,
  data,
  referenceId,
  referenceType,
  io,
}) => {
  try {
    const uniqueRecipients = [...new Set(recipientIds.filter(Boolean).map(String))];
    const results = [];
    // Bound database work for large announcements. Push sends are batched by the outbox.
    for (let offset = 0; offset < uniqueRecipients.length; offset += 25) {
      results.push(...await Promise.all(
        uniqueRecipients.slice(offset, offset + 25).map((recipientId) =>
          sendNotification({
            recipientId, senderId, type, title, message, link, data,
            referenceId, referenceType, io,
          })
        )
      ));
    }

    return { success: results.every((result) => result.success), results };
  } catch (error) {
    errorCrit(`[NotificationService] Error sending bulk notifications:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
  sendBulkNotifications
};
