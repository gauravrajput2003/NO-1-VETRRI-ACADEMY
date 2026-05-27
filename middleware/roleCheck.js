// Role-based access control middleware

// Allow only specific roles
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
};

// Admin only
const adminOnly = allowRoles('admin');

// Teacher or Admin
const teacherOrAdmin = allowRoles('teacher', 'admin');

// Student only
const studentOnly = allowRoles('student');

// Teacher only
const teacherOnly = allowRoles('teacher');

module.exports = { allowRoles, adminOnly, teacherOrAdmin, studentOnly, teacherOnly };
