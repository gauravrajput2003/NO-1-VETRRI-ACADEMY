const User = require('../models/User');
const PushDelivery = require('../models/PushDelivery');

async function getPushDiagnostics() {
  const [coverage, deliveries, recentFailures] = await Promise.all([
    User.aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: '$role', users: { $sum: 1 },
        registered: { $sum: { $cond: [{ $regexMatch: {
          input: { $convert: { input: '$expoPushToken', to: 'string', onError: '', onNull: '' } },
          regex: '^(ExponentPushToken|ExpoPushToken)\\[[A-Za-z0-9_-]+\\]$',
        } }, 1, 0] } },
      } },
    ]),
    PushDelivery.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 86400000) } } },
      { $group: { _id: { status: '$status', errorCode: '$errorCode' }, count: { $sum: 1 } } },
    ]),
    PushDelivery.find({ status: 'failed' }).select('status errorCode attempts createdAt updatedAt').sort({ updatedAt: -1 }).limit(20).lean(),
  ]);
  return { coverage, last24Hours: deliveries, recentFailures, expoAccessTokenConfigured: Boolean(process.env.EXPO_ACCESS_TOKEN) };
}

module.exports = { getPushDiagnostics };
