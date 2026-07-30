const LibraryAccess = require('../models/LibraryAccess');

const requireLibraryAccess = async (req, res, next) => {
  try {
    // Admins bypass the library access check entirely
    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const access = await LibraryAccess.findOne({ teacher: req.user._id });

    if (!access || access.approved !== true) {
      return res.status(403).json({
        success: false,
        message: 'Library access not yet approved by Admin.',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { requireLibraryAccess };
