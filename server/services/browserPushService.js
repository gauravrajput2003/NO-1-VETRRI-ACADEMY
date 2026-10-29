const webPush = require('web-push');
const Subscription = require('../models/BrowserPushSubscription');
const UserSession = require('../models/UserSession');

const subject = () => process.env.WEB_PUSH_SUBJECT || (process.env.WEB_PUSH_EMAIL ? `mailto:${process.env.WEB_PUSH_EMAIL.replace(/^mailto:/, '')}` : '');
const configured = () => Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY && subject());
const validSubscription = (subscription) => {
  try {
    const url = new URL(subscription.endpoint);
    const hosts = ['fcm.googleapis.com', 'push.services.mozilla.com', 'web.push.apple.com', 'notify.windows.com'];
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
      && hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
      && subscription.endpoint.length < 4096
      && /^[A-Za-z0-9_-]{87}=?$/.test(subscription.keys?.p256dh || '')
      && /^[A-Za-z0-9_-]{22}={0,2}$/.test(subscription.keys?.auth || '');
  } catch { return false; }
};

async function sendBrowserNotification(user, notification) {
  // Recovery credentials use the separate verified-device delivery mechanism.
  if (!configured() || /password|recovery/i.test(notification.type || '')) return;
  webPush.setVapidDetails(subject(), process.env.WEB_PUSH_PUBLIC_KEY, process.env.WEB_PUSH_PRIVATE_KEY);
  const subscriptions = await Subscription.find({ userId: user._id, tokenVersion: user.tokenVersion || 0 });
  await Promise.allSettled(subscriptions.map(async (subscription) => {
    const session = await UserSession.exists({ _id: subscription.sessionId, userId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } });
    if (!session) { await Subscription.deleteOne({ _id: subscription._id }); return; }
    try {
      await webPush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys.toObject ? subscription.keys.toObject() : subscription.keys }, JSON.stringify({
        title: notification.title, body: notification.message, notificationId: String(notification._id),
        userId: String(user._id), role: user.role, link: notification.link || `/${user.role}/dashboard`,
      }), { TTL: 300, timeout: 10000 });
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) await Subscription.deleteOne({ _id: subscription._id });
    }
  }));
}
module.exports = { configured, validSubscription, sendBrowserNotification };
