const User = require('../models/User');
const AdmissionForm = require('../models/AdmissionForm');
const LoginLog = require('../models/LoginLog');
const { generateToken, generateRefreshToken, setCookieToken, clearCookieToken } = require('../utils/generateToken');
const { sendWelcomeEmail } = require('../utils/email');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const UserSession = require('../models/UserSession');
const Course = require('../models/Course');
const { isExpoPushToken } = require('../utils/pushToken');
const { buildLoginLookup } = require('../utils/loginLookup');

const normalizeBoard = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const key = raw.toLowerCase().replace(/\s+/g, ' ');
  const boardMap = {
    cbse: 'CBSE',
    'state board': 'State Board',
    stateboard: 'State Board',
    'arts college': 'Arts College',
    artscollege: 'Arts College',
    'eng college': 'Eng College',
    engcollege: 'Eng College',
    tnpsc: 'TNPSC',
    trb: 'TRB',
    tet: 'TET',
  };

  return boardMap[key] || raw;
};

// ─── Unified Register ───────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { role } = req.body;
    
    // Fallback protection against manual injection attempts
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    if (role === 'student') {
      const { name, mobile, email, password, grade, course, board } = req.body;
      const normalizedBoard = normalizeBoard(board);

      const userExists = await User.findOne({ mobile });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'Mobile number already registered.' });
      }

      const user = await User.create({
        name,
        mobile,
        email: email || undefined,
        password,
        role: 'student',
        grade,
        board: normalizedBoard,
        firstLogin: true,
        admissionFormFilled: false,
      });

      user.profilePic = User.getDiceBearUrl(user._id);
      await user.save({ validateBeforeSave: false });

      sendWelcomeEmail(user);

      const token = generateToken(user._id, user.role, user.tokenVersion || 0);
      setCookieToken(res, token);

      return res.status(201).json({
        success: true,
        message: 'Registration successful!',
        token,
        user: {
          _id: user._id,
        mustChangePassword: Boolean(user.mustChangePassword),
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          role: user.role,
          grade: user.grade,
          board: user.board,
          profilePic: user.profilePic,
          firstLogin: user.firstLogin,
          admissionFormFilled: user.admissionFormFilled,
        },
      });
    }

    if (role === 'teacher') {
      const { name, mobile, email, password, qualification, subjects, experience, teacherBio } = req.body;

      // Because only admins can run this, we implicitly approve the teacher logic.
      const userExists = await User.findOne({ $or: [{ mobile }, { email }] });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'Mobile or email already registered.' });
      }

      const teacher = await User.create({
        name,
        mobile,
        email,
        password,
        role: 'teacher',
        qualification,
        subjects: subjects || [],
        experience,
        teacherBio,
        isApproved: true, // Automatically approved because it's created by admin
      });

      teacher.profilePic = User.getDiceBearUrl(teacher._id);
      await teacher.save({ validateBeforeSave: false });

      return res.status(201).json({
        success: true,
        message: 'Teacher created successfully.',
        password, // Optionally returning the raw pass just once for frontend consumption or omitting. We omit for safety typically, but frontend can just use its state.
      });
    }

  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const role = req.params.role || req.body.role;
    const { identifier, password } = req.body;

    const rawId = String(identifier || '').trim();
    if (!rawId || typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required.' });
    }

    const { exactQuery, formattedQuery } = buildLoginLookup(rawId, role);
    let user = await User.findOne(exactQuery).maxTimeMS(8000);
    if (!user && formattedQuery) {
      const matches = await User.find(formattedQuery).limit(2).maxTimeMS(8000);
      if (matches.length > 1) {
        return res.status(400).json({ success: false, message: 'More than one account uses this mobile number. Please use your registered email or contact the academy.' });
      }
      user = matches[0];
    }

    // Keep form errors out of the session-refresh flow used by published clients.
    if (!user) {
      const field = rawId.includes('@') ? 'email address' : 'phone number';
      return res.status(400).json({ success: false, code: 'ACCOUNT_NOT_REGISTERED', message: 'This ' + field + ' is not registered' + (role ? ' for this account type' : '') + '. Please check it or contact the academy.' });
    }
    if (!(await user.matchPassword(password))) {
      return res.status(400).json({ success: false, code: 'INVALID_PASSWORD', message: 'Incorrect password. Please try again or use Forgot Password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    if (user.role === 'teacher' && user.isApproved === false) {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
    }

    // Ensure DiceBear profile pic is set
    if (!user.profilePic) {
      user.profilePic = User.getDiceBearUrl(user._id);
    }

    const sessionId = new mongoose.Types.ObjectId();
    const token = generateToken(user._id, user.role, user.tokenVersion || 0, sessionId);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0, sessionId);
    const refreshClaims = jwt.decode(refreshToken);

    user.isOnline = true;
    const isFirstLogin = user.firstLogin;
    if (user.firstLogin) user.firstLogin = false;
    await user.save({ validateBeforeSave: false });
    await UserSession.create({ _id: sessionId, userId: user._id,
      refreshHash: createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: new Date(refreshClaims.exp * 1000) });

    setCookieToken(res, token);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      refreshToken,
      user: {
        _id: user._id,
        mustChangePassword: Boolean(user.mustChangePassword),
        name: user.name,
        displayName: user.displayName || user.name,
        mobile: role !== 'student' ? user.mobile : undefined,
        email: user.email,
        role: user.role,
        grade: user.grade,
        board: user.board,
        profilePic: user.profilePic,
        subjects: user.subjects,
        firstLogin: isFirstLogin,
        admissionFormFilled: user.admissionFormFilled,
        assignedTeachers: user.assignedTeachers,
        loginStreak: user.loginStreak,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Retired public reset: identifiers alone never authorize a password change.
const forgotPasswordPublic = async (_req, res) => res.status(410).json({
  success: false,
  code: 'ADMIN_ASSISTED_RECOVERY_REQUIRED',
  message: 'Please contact your academy admin for password recovery. Update the app to request a temporary password.',
});

const logoutAll = async (req, res) => {
  try {
    await UserSession.updateMany({ userId: req.user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 },
      $set: { ...require('../utils/recoveryDevices').revokedDeviceFields(), refreshToken: '', isOnline: false } });
    const sockets = req.app?.get('io')?.sockets?.sockets;
    if (sockets) for (const socket of sockets.values()) {
      if (String(socket.authUser?._id || socket.userId) === String(req.user._id)) socket.disconnect(true);
    }
    res.clearCookie('token');
    res.json({ success: true, message: 'All sessions and recovery devices revoked. Sign in again.' });
  } catch { res.status(503).json({ success: false, message: 'Unable to revoke sessions. Please retry.' }); }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    clearCookieToken(res);

    // Update logoutTime in LoginLog
    const today = new Date().toISOString().split('T')[0];
    const log = await LoginLog.findOne({ userId: req.user._id, date: today });
    if (log && !log.logoutTime) {
      const duration = Math.round((Date.now() - log.loginTime.getTime()) / 60000);
      log.logoutTime = new Date();
      log.sessionDuration = duration;
      await log.save();
    }

    if (req.sessionId) {
      await UserSession.updateOne({ _id: req.sessionId, userId: req.user._id }, { $set: { revokedAt: new Date() } });
      const sockets = req.app?.get('io')?.sockets?.sockets;
      if (sockets) for (const socket of sockets.values()) {
        if (String(socket.authClaims?.sid) === String(req.sessionId)) socket.disconnect(true);
      }
      const active = await UserSession.exists({ userId: req.user._id, revokedAt: null, expiresAt: { $gt: new Date() } });
      if (!active) await User.findByIdAndUpdate(req.user._id, { isOnline: false, lastSeen: new Date() });
    } else {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: '', isOnline: false, lastSeen: new Date() });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Me ───────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password -refreshToken')
    .populate('course', 'title category')
    .populate('assignedTeachers', 'name qualification subjects profilePic displayName teacherBio');

  res.status(200).json({ success: true, user });
};

// ─── Refresh Access Token ─────────────────────────────────────────────────────
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = decoded.sid ? await User.findById(decoded.id)
      : await User.findOne({ _id: decoded.id, refreshToken });

    if (decoded.sid) {
      const session = await UserSession.findOne({ _id: decoded.sid, userId: decoded.id,
        refreshHash: createHash('sha256').update(refreshToken).digest('hex'), revokedAt: null });
      if (!session || session.expiresAt <= new Date()) {
        return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
      }
    }

    if (!user || !user.isActive || (decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newToken = generateToken(user._id, user.role, user.tokenVersion || 0, decoded.sid);
    setCookieToken(res, newToken);

    res.status(200).json({ success: true, token: newToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Refresh token expired or invalid.' });
  }
};

// @desc    Get courses meta (subjects and grades)
// @route   GET /api/auth/courses/meta
// @access  Public
const getCoursesMeta = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true });
    const gradesSet = new Set();
    const subjectsSet = new Set();
    
    courses.forEach(c => {
      if (c.grades) c.grades.forEach(g => gradesSet.add(g));
      if (c.subjects) c.subjects.forEach(s => subjectsSet.add(s));
    });
    
    // Defaults if empty
    const grades = gradesSet.size > 0 ? Array.from(gradesSet).sort() : ['6th', '7th', '8th', '9th', '10th', '11th', '12th'];
    const subjects = subjectsSet.size > 0 ? Array.from(subjectsSet).sort() : ['Mathematics', 'Science', 'English', 'History'];
    
    res.json({ success: true, grades, subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Save / Refresh Expo Push Token ──────────────────────────────────────────
/**
 * PUT /api/auth/push-token
 * Saves or refreshes the Expo push token for the authenticated user.
 * Called by the app on login and whenever the token refreshes.
 * Validates that the token looks like a valid Expo push token before saving.
 */
const savePushToken = async (req, res) => {
  try {
    const { expoPushToken } = req.body;

    if (!expoPushToken || typeof expoPushToken !== 'string') {
      return res.status(400).json({ success: false, message: 'expoPushToken is required' });
    }

    // Both prefixes are valid. Native FCM tokens are not Expo push tokens.
    if (!isExpoPushToken(expoPushToken)) {
      return res.status(400).json({ success: false, message: 'Invalid Expo push token format' });
    }

    // One installation must not keep receiving a previous account's private alerts.
    await User.updateMany({ _id: { $ne: req.user._id }, expoPushToken }, { $unset: { expoPushToken: '' } });
    await User.updateMany({ _id: { $ne: req.user._id }, recoveryDevices: expoPushToken }, { $pull: { recoveryDevices: expoPushToken } });
    await User.updateMany({ _id: { $ne: req.user._id }, recoveryReadyDevices: expoPushToken }, { $pull: { recoveryReadyDevices: expoPushToken } });
    await User.updateMany({ _id: { $ne: req.user._id }, 'recoveryRegistrations.token': expoPushToken }, { $pull: { recoveryRegistrations: { token: expoPushToken } } });
    // Version predicate prevents a request authenticated before revocation from re-enrolling.
    const saved = await User.findOneAndUpdate({ _id: req.user._id, tokenVersion: req.user.tokenVersion || 0 }, [
      { $set: { expoPushToken, recoveryRegistrations: { $concatArrays: [
        { $filter: { input: { $ifNull: ['$recoveryRegistrations', []] }, as: 'device', cond: { $ne: ['$$device.token', expoPushToken] } } },
        [{ token: expoPushToken, registeredAt: new Date(), tokenVersion: req.user.tokenVersion || 0 }],
      ] } } },
    ], { new: true });
    if (!saved) return res.status(401).json({ success: false, message: 'Session revoked. Sign in again.' });

    res.json({ success: true, message: 'Push token saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  logoutAll,
  register,
  login,
  logout,
  getMe,
  refreshAccessToken,
  getCoursesMeta,
  savePushToken,
    forgotPasswordPublic,   // ← add this

};
