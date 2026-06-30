const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');


const detectDevice = (userAgent = '') => { 
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) { 
    if (/ipad|tablet/i.test(ua)) return 'tablet';
    return 'mobile';
  }
  return 'desktop';
}; 
 

const verifyToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    req.user = user;

  
    try {
      const today = new Date().toISOString().split('T')[0]; 

      const existing = await LoginLog.findOne({ userId: user._id, date: today });

      if (!existing) {
        await LoginLog.create({
          userId: user._id,
          userRole: user.role,
          loginTime: new Date(),
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
          deviceType: detectDevice(req.headers['user-agent']),
          date: today,
        });

      
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (user.lastLoginDate === yesterdayStr) {
          newStreak = (user.loginStreak || 0) + 1;
        }

        await User.findByIdAndUpdate(user._id, {
          lastLoginDate: today,
          loginStreak: newStreak,
          longestStreak: Math.max(user.longestStreak || 0, newStreak),
          $inc: { totalLoginDays: 1 },
          isOnline: true,
        });

      }   
    } catch (logErr) {
      // Silent — don't block the request on log failure
      console.warn('Login log error:', logErr.message);
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ─── Verify Admin ───────────────────────────────────────────────────────────────
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
};

module.exports = { verifyToken, detectDevice, isAdmin };
