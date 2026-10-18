const RETENTION_SECONDS = 7 * 24 * 60 * 60;
const retentionCutoff = (now = new Date()) => new Date(+now - RETENTION_SECONDS * 1000);
const announcementExpiry = (createdAt = new Date()) => new Date(+new Date(createdAt) + RETENTION_SECONDS * 1000);
module.exports = { RETENTION_SECONDS, retentionCutoff, announcementExpiry };
