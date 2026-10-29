const { isExpoPushToken } = require('./pushToken');

function revokedDeviceFields() {
  return { expoPushToken: null, deviceTokens: [], recoveryDevices: [], recoveryReadyDevices: [], recoveryRegistrations: [] };
}
function recoveryReadiness(user, now = new Date()) {
  const registrations = user?.recoveryRegistrations || [];
  const tokens = [...new Set(registrations.filter(entry => isExpoPushToken(entry.token)
    && Number.isFinite(+new Date(entry.registeredAt)) && +new Date(entry.registeredAt) <= +now
    && entry.tokenVersion === (user.tokenVersion || 0)).map(entry => entry.token))];
  return { ready: tokens.length > 0, tokens, reason: tokens.length ? 'Ready: token registered by an authenticated session.'
    : registrations.length ? 'Device enrollment was revoked or is invalid. An authenticated sign-in must register a device again.'
      : 'No device registered after an authenticated sign-in. Ask the user to sign in on the updated app, or verify identity and use Copy.' };
}
module.exports = { recoveryReadiness, revokedDeviceFields };
