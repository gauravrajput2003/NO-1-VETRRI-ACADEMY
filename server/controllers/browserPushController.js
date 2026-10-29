const Subscription = require('../models/BrowserPushSubscription');
const { configured, validSubscription } = require('../services/browserPushService');
exports.config = (_req, res) => res.json({ success: true, enabled: configured(), publicKey: configured() ? process.env.WEB_PUSH_PUBLIC_KEY : null });
exports.subscribe = async (req, res) => {
  if (!configured()) return res.status(503).json({ success: false, message: 'Browser notifications are not configured.' });
  if (!req.sessionId) return res.status(409).json({ success: false, message: 'Sign in again to enable browser notifications.' });
  if (!validSubscription(req.body)) return res.status(400).json({ success: false, message: 'Invalid browser subscription.' });
  try {
    await Subscription.findOneAndUpdate({ endpoint: req.body.endpoint }, { $set: {
      userId: req.user._id, sessionId: req.sessionId, tokenVersion: req.user.tokenVersion || 0,
      endpoint: req.body.endpoint, keys: { p256dh: req.body.keys.p256dh, auth: req.body.keys.auth },
    } }, { upsert: true, runValidators: true });
    res.json({ success: true });
  } catch { res.status(503).json({ success: false, message: 'Unable to register browser notifications.' }); }
};
exports.unsubscribe = async (req, res) => {
  try {
    await Subscription.deleteMany({ userId: req.user._id, endpoint: req.body.endpoint });
    res.json({ success: true });
  } catch { res.status(503).json({ success: false, message: 'Unable to remove browser notifications.' }); }
};
