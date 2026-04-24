const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, refreshAccessToken } = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ─── Dynamic Auth Middleware for Registration ──────────────────────────────────
const registerGuard = (req, res, next) => {
  if (req.body.role === 'teacher' || req.body.role === 'admin') {
    return verifyToken(req, res, (err) => {
      if (err) return next(err); // if verifyToken calls next(err) due to error handling
      // verifyToken normally just calls next(), so we intercept it by passing a custom next
      isAdmin(req, res, next);
    });
  }
  // Public access for students
  next();
};

// POST /api/auth/register
router.post('/register', authLimiter, registerGuard, register);

// POST /api/auth/login/:role  (role = student | teacher | admin)
router.post('/login/:role', authLimiter, login);

// POST /api/auth/logout
router.post('/logout', verifyToken, logout);

// GET /api/auth/me
router.get('/me', verifyToken, getMe);

// POST /api/auth/refresh
router.post('/refresh', refreshAccessToken);

module.exports = router;
