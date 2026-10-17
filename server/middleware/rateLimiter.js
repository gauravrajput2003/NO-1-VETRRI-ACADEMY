const rateLimit = require('express-rate-limit');
const { createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { buildLoginLookup } = require('../utils/loginLookup');

const authenticatedIds = new WeakMap();
function getAuthenticatedId(req) {
  if (req.user?.id) return req.user.id;
  if (authenticatedIds.has(req)) return authenticatedIds.get(req);
  let id = null;
  // The global limiter runs before route authentication. Verify the JWT here
  // instead of treating every logged-in parent's requests as anonymous IP traffic.
  const header = req.headers?.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (typeof decoded.id === 'string') id = decoded.id;
    } catch { /* Invalid/expired tokens retain the anonymous IP limit. */ }
  }
  authenticatedIds.set(req, id);
  return id;
}


// ─────────────────────────────────────────────
// AUTH / LOGIN RATE LIMITER
// ─────────────────────────────────────────────
//
// 10 failed login attempts per
// IP + normalized login identifier combination every 2 minutes.
//
// Successful logins are NOT counted.
// ─────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,

  max: 10,

  keyGenerator: (req) => {
    const identifier = req.body?.identifier ?? req.body?.email ?? req.body?.mobile ?? '';
    const key = buildLoginLookup(identifier).key;
    const digest = createHash('sha256').update(key).digest('hex');

    const ip =
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    return `login:${ip}:${digest}`;
  },

  skipSuccessfulRequests: true,

  message: {
    success: false,
    message:
      'Too many failed login attempts. Please try again after 2 minutes.',
  },

  standardHeaders: true,
  legacyHeaders: false,
});


// ─────────────────────────────────────────────
// GENERAL API RATE LIMITER
// ─────────────────────────────────────────────
//
// Authenticated user:
//     300 requests / minute
//
// Unauthenticated:
//     100 requests / minute per IP
//
// Health, preview and download are excluded.
// ─────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,

  limit: (req) => {
    // Authenticated user
    if (getAuthenticatedId(req)) {
      return 300;
    }

    // Unauthenticated request
    return 100;
  },

  keyGenerator: (req) => {
    // Authenticated users get their own limit
    const userId = getAuthenticatedId(req);
    if (userId) {
      return `user:${userId}`;
    }

    // Unauthenticated users are limited by IP
    const ip =
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    return `ip:${ip}`;
  },

  skip: (req) => {
    return (
      req.path === '/api/health' ||
      // Login has its own failed-attempt limiter. Successful parents must not
      // exhaust a shared carrier/school IP's general request allowance.
      /^\/api\/auth\/login(?:\/(?:student|teacher|admin))?\/?$/.test(req.path) ||
      req.path.includes('/download') ||
      req.path.includes('/preview')
    );
  },

  message: {
    success: false,
    message:
      'Too many requests. Please try again later.',
  },

  standardHeaders: true,
  legacyHeaders: false,
});


// ─────────────────────────────────────────────
// ENQUIRY FORM RATE LIMITER
// ─────────────────────────────────────────────
//
// 5 enquiry submissions per IP per hour.
// ─────────────────────────────────────────────

const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,

  max: 5,

  keyGenerator: (req) => {
    const ip =
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    return `enquiry:${ip}`;
  },

  message: {
    success: false,
    message:
      'Too many enquiry submissions. Please try again later.',
  },

  standardHeaders: true,
  legacyHeaders: false,
});


module.exports = {
  authLimiter,
  generalLimiter,
  enquiryLimiter,
};
