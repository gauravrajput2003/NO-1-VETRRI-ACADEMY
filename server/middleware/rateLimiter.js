const rateLimit = require('express-rate-limit');

// Auth rate limiter — strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 600,
  // Prefer per-user throttling for authenticated requests to avoid shared-IP spikes.
  keyGenerator: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string') {
      return authHeader;
    }
    return req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for health checks and download endpoints
    return req.path === '/api/health' || req.path.includes('/download') || req.path.includes('/preview');
  },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enquiry form limiter
const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 enquiries per hour per IP
  message: {
    success: false,
    message: 'Too many enquiry submissions. Please try again later.',
  },
});

module.exports = { authLimiter, generalLimiter, enquiryLimiter };
