const isExpoPushToken = (token) => typeof token === 'string' && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token);

module.exports = { isExpoPushToken };
