const User = require('../models/User');

/**
 * Admin User IDs Cache
 * Caches admin _id list for 60 seconds to avoid repetitive User.find({ role: 'admin' })
 * queries across notifications for uploads, edits, deletes, leaves, and enquiries.
 */

let cachedAdminIds = null;
let cacheExpiry = 0;

/**
 * Retrieve cached admin user IDs or query MongoDB if cache expired.
 * @returns {Promise<Array<string|ObjectId>>} Array of admin user IDs
 */
async function getAdminUserIds() {
  const now = Date.now();
  if (cachedAdminIds && now < cacheExpiry) {
    return cachedAdminIds;
  }

  try {
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    cachedAdminIds = admins.map((admin) => admin._id);
    cacheExpiry = now + 60 * 1000; // 60s TTL
    return cachedAdminIds;
  } catch (error) {
    // If cache lookup failed but we have a stale cache, fallback to it
    if (cachedAdminIds) return cachedAdminIds;
    throw error;
  }
}

/**
 * Invalidate admin user cache (e.g., when an admin user is added/removed)
 */
function invalidateAdminCache() {
  cachedAdminIds = null;
  cacheExpiry = 0;
}

module.exports = {
  getAdminUserIds,
  invalidateAdminCache,
};
