const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token (30 days)
 */
const generateToken = (id, role, tokenVersion = 0, sessionId) => {
  return jwt.sign({ id, role, tokenVersion, ...(sessionId ? { sid: String(sessionId) } : {}) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * Generate JWT refresh token (60 days)
 */
const generateRefreshToken = (id, tokenVersion = 0, sessionId) => {
  return jwt.sign({ id, tokenVersion, ...(sessionId ? { sid: String(sessionId) } : {}) }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '60d',
  });
};

/**
 * Set token as httpOnly cookie
 */
const setCookieToken = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

/**
 * Clear token cookie (logout)
 */
const clearCookieToken = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
};

module.exports = { generateToken, generateRefreshToken, setCookieToken, clearCookieToken };
