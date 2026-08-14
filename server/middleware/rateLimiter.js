const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');


// ─────────────────────────────────────────────
// AUTH / LOGIN RATE LIMITER
// ─────────────────────────────────────────────
//
// Allows up to 10 FAILED login attempts per
// IP + email combination every 15 minutes.
//
// Successful logins are NOT counted.
//
// This prevents brute-force attacks without
// unnecessarily blocking normal users.
// ─────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 100,

  keyGenerator: (req) => {
    const email = String(
      req.body?.email || ''
    )
      .trim()
      .toLowerCase();

    const ip = ipKeyGenerator(req.ip);

    return `${ip}:${email}`;
  },

  skipSuccessfulRequests: true,

  message: {
    success: false,
    message:
      'Too many failed login attempts. Please try again after 15 minutes.',
  },

  standardHeaders: true,
  legacyHeaders: false,
});


// ─────────────────────────────────────────────
// GENERAL API RATE LIMITER
// ─────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs:
    parseInt(
      process.env.RATE_LIMIT_WINDOW_MS,
      10
    ) ||
    15 * 60 * 1000,

  max:
    parseInt(
      process.env.RATE_LIMIT_MAX,
      10
    ) || 600,

  keyGenerator: (req) => {
    const authHeader =
      req.headers.authorization;

    if (
      authHeader &&
      typeof authHeader === 'string'
    ) {
      return authHeader;
    }

    return ipKeyGenerator(req.ip);
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
// ENQUIRY FORM LIMITER
// ─────────────────────────────────────────────

const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,

  max: 5,

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