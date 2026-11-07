const cache = require('../utils/cache');

// Each backend process connects to one academy database.
const KEY = 'admin-dashboard-stats';
const TTL_SECONDS = 45;
const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const dashboardWrites = /^\/api\/(?:auth\/register$|admin\/(?:students|teachers|fees|leaves|materials)(?:\/|$)|classes(?:\/schedule(?:\/|$)|\/generate-year$)|demo(?:\/|$)|enquiries(?:\/|$)|(?:student|teacher)\/leave$|teacher\/materials(?:\/|$))/;

function invalidateAfterWrite(req, res, next) {
  if (writeMethods.has(req.method) && dashboardWrites.test(req.path)) {
    res.once('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) cache.del(KEY);
    });
  }
  next();
}

module.exports = {
  getStats: load => cache.getOrSet(KEY, TTL_SECONDS, load),
  invalidateAfterWrite,
};
