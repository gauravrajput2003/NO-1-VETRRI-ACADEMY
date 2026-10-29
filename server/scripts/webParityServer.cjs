// Local acceptance server: test notifications may address fixture accounts only.
// Production continues to use server/index.js directly.
const fs = require('node:fs');
const path = require('node:path');
const fixtures = JSON.parse(fs.readFileSync(path.join(require('node:os').tmpdir(), 'vettri-web-parity-fixtures.json'), 'utf8'));
const allowed = new Set(Object.values(fixtures.accounts).map((account) => account.id));
process.env.BACKGROUND_JOBS_ENABLED = 'false';
process.env.BIND_HOST = '127.0.0.1';
const notifications = require('../services/notificationService');
const originalSend = notifications.sendNotification;
notifications.sendNotification = async (payload) => allowed.has(String(payload.recipientId))
  ? originalSend(payload) : { success: true, skippedTestRecipient: true };
// sendBulkNotifications closes over its own sender, so filter before entering it.
const originalBulk = notifications.sendBulkNotifications;
notifications.sendBulkNotifications = (payload) => originalBulk({ ...payload, recipientIds: (payload.recipientIds || []).filter((id) => allowed.has(String(id))) });
require('../index');
