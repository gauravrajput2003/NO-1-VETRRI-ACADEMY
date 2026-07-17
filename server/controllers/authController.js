const User = require('../models/User');
const AdmissionForm = require('../models/AdmissionForm');
const LoginLog = require('../models/LoginLog');
const { generateToken, generateRefreshToken, setCookieToken, clearCookieToken } = require('../utils/generateToken');
const { sendWelcomeEmail } = require('../utils/email');
const jwt = require('jsonwebtoken');
const Course = require('../models/Course');

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

      const token = generateToken(user._id, user.role);
      setCookieToken(res, token);

      return res.status(201).json({
        success: true,
        message: 'Registration successful!',
        token,
        user: {
          _id: user._id,
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

    const baseQuery = { $or: [{ mobile: identifier }, { email: identifier }] };
    const user = role
      ? await User.findOne({ ...baseQuery, role })
      : await User.findOne(baseQuery);

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    if (!user.isApproved && role === 'teacher') {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
    }

    // Ensure DiceBear profile pic is set
    if (!user.profilePic) {
      user.profilePic = User.getDiceBearUrl(user._id);
    }

    const token = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.isOnline = true;
    const isFirstLogin = user.firstLogin;
    if (user.firstLogin) user.firstLogin = false;
    await user.save({ validateBeforeSave: false });

    setCookieToken(res, token);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      refreshToken,
      user: {
        _id: user._id,
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
        assignedTeacher: user.assignedTeacher,
        loginStreak: user.loginStreak,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
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

    await User.findByIdAndUpdate(req.user._id, { refreshToken: '', isOnline: false, lastSeen: new Date() });
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
    .populate('assignedTeacher', 'name qualification subjects profilePic displayName teacherBio');

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
    const user = await User.findOne({ _id: decoded.id, refreshToken });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newToken = generateToken(user._id, user.role);
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

    // Basic validation — Expo tokens always start with "ExponentPushToken["
    if (!expoPushToken.startsWith('ExponentPushToken[')) {
      return res.status(400).json({ success: false, message: 'Invalid Expo push token format' });
    }

    await User.findByIdAndUpdate(req.user._id, { expoPushToken });

    res.json({ success: true, message: 'Push token saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  refreshAccessToken,
  getCoursesMeta,
  savePushToken,
};
