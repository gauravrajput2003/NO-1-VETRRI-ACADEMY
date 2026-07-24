const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotifications } = require('./pushService');
const { errorCrit } = require('../utils/logger');

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

    // 2. Fetch User for Expo Push Token
    const user = await User.findById(recipientId).select('expoPushToken');

    // 3. Emit Socket.io event if user is online
    if (io) {
      // populate sender for immediate UI display if senderId exists
      let populatedNotif = notification;
      if (senderId) {
        populatedNotif = await Notification.findById(notification._id).populate('sender', 'name displayName profilePic');
      }
      io.to(`user:${recipientId}`).emit('notification:new', populatedNotif);
    }

    // 4. Send Expo Push Notification
    if (user && user.expoPushToken) {
      await sendPushNotifications([user.expoPushToken], {
        title,
        body: message,
        data: { ...data, type, link, notificationId: notification._id.toString() },
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
    const results = await Promise.all(
      recipientIds.map((recipientId) =>
        sendNotification({
          recipientId,
          senderId,
          type,
          title,
          message,
          link,
          data,
          referenceId,
          referenceType,
          io,
        })
      )
    );

    return { success: true, results };
  } catch (error) {
    errorCrit(`[NotificationService] Error sending bulk notifications:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
  sendBulkNotifications
};
