/**
 * ─── Expo Push Notification Service ─────────────────────────────────────────
 *
 * Sends push notifications via Expo's managed push API:
 *   POST https://exp.host/--/api/v2/push/send
 *
 * - Handles batching in chunks of 100 (Expo's per-request limit)
 * - Removes dead tokens (DeviceNotRegistered) from the DB automatically
 * - Logs per-token errors without crashing the caller
 * - Does NOT require Firebase project setup for Expo Go / dev builds.
 *   For production AAB (Play Store), FCM credentials ARE required — see README.
 *
 * Usage:
 *   const { sendPushNotifications } = require('./pushService');
 *   await sendPushNotifications(expoPushTokens, { title, body, data });
 */

const User = require('../models/User');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo limit per request

/**
 * Send push notifications to an array of Expo push tokens.
 *
 * @param {string[]} tokens   Array of "ExponentPushToken[xxx]" strings
 * @param {object}   payload  { title, body, data?, sound?, badge? }
 * @returns {Promise<{ sent: number, failed: number, deadTokens: string[] }>}
 */
const sendPushNotifications = async (tokens, payload) => {
  // Filter to valid Expo push token format
  const validTokens = (tokens || []).filter(
    (t) => typeof t === 'string' && t.startsWith('ExponentPushToken[')
  );

  if (validTokens.length === 0) {
    return { sent: 0, failed: 0, deadTokens: [] };
  }

  const { title, body, data = {}, sound = 'default', badge } = payload;
  let sent = 0;
  let failed = 0;
  const deadTokens = [];

  // Process in batches of 100
  for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
    const batch = validTokens.slice(i, i + BATCH_SIZE);

    const messages = batch.map((token) => ({
      to: token,
      title,
      body,
      data,
      sound,
      ...(badge !== undefined && { badge }),
      // Android channel (matches the HIGH importance channel set up on client)
      channelId: 'vettri-default',
      priority: 'high',
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.error(`[Push] Expo API error: ${response.status} ${response.statusText}`);
        failed += batch.length;
        continue;
      }

      const result = await response.json();
      const ticketData = result.data || [];

      // Inspect per-ticket results
      ticketData.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          const token = batch[idx];
          const details = ticket.details || {};

          if (details.error === 'DeviceNotRegistered') {
            // Token is no longer valid — queue for removal
            deadTokens.push(token);
            console.warn(`[Push] DeviceNotRegistered for token: ${token}`);
          } else {
            console.warn(`[Push] Ticket error for token ${token}:`, ticket.message, details);
          }
        }
      });
    } catch (err) {
      console.error('[Push] Network error sending batch:', err.message);
      failed += batch.length;
    }
  }

  // Remove dead tokens from the DB to keep the token list clean
  if (deadTokens.length > 0) {
    try {
      await User.updateMany(
        { expoPushToken: { $in: deadTokens } },
        { $unset: { expoPushToken: '' } }
      );
      console.log(`[Push] Removed ${deadTokens.length} dead push token(s) from DB`);
    } catch (err) {
      console.error('[Push] Failed to remove dead tokens:', err.message);
    }
  }

  return { sent, failed, deadTokens };
};

module.exports = { sendPushNotifications };
