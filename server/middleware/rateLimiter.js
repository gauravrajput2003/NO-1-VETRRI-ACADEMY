const rateLimit = require('express-rate-limit');


// ─────────────────────────────────────────────
// AUTH / LOGIN RATE LIMITER
// ─────────────────────────────────────────────
//
// 10 failed login attempts per
// IP + email combination every 2 minutes.
//
// Successful logins are NOT counted.
// ─────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,

  max: 10,

  keyGenerator: (req) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();

    const ip =
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    return `login:${ip}:${email}`;
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
    if (req.user?.id) {
      return 300;
    }

    // Unauthenticated request
    return 100;
  },

  keyGenerator: (req) => {
    // Authenticated users get their own limit
    if (req.user?.id) {
      return `user:${req.user.id}`;
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