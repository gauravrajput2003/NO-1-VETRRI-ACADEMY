const User = require('../models/User');
const { uploadToCloudinary } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// ─── Get Profile ──────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken')
      .populate('course', 'title category')
      .populate('assignedTeacher', 'name displayName subjects profilePic teacherBio');
    // Return both keys for backward compatibility across client builds.
    res.json({ success: true, profile: user, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const {
      name, displayName, bio, mobile, email,
      subjects, qualification, experienceYears, teacherBio,
      institutionName, contactEmail,
    } = req.body;

    const allowedFields = {};
    const resolvedDisplayName = (displayName ?? name);
    if (resolvedDisplayName !== undefined) allowedFields.displayName = resolvedDisplayName;
    if (bio !== undefined) allowedFields.bio = bio;

    // Role-specific fields
    if (req.user.role === 'student') {
      if (mobile !== undefined) allowedFields.mobile = mobile;
      if (email !== undefined) allowedFields.email = email;
    } else if (req.user.role === 'teacher') {
      if (subjects !== undefined) allowedFields.subjects = subjects;
      if (qualification !== undefined) allowedFields.qualification = qualification;
      if (experienceYears !== undefined && experienceYears !== '') {
        allowedFields.experienceYears = parseInt(experienceYears, 10);
      }
      if (teacherBio !== undefined) allowedFields.teacherBio = teacherBio;
    } else if (req.user.role === 'admin') {
      if (institutionName !== undefined) allowedFields.institutionName = institutionName;
      if (contactEmail !== undefined) allowedFields.contactEmail = contactEmail;
    }

    const updated = await User.findByIdAndUpdate(req.user._id, allowedFields, { new: true })
      .select('-password -refreshToken');

    res.json({ success: true, profile: updated, user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Avatar ────────────────────────────────────────────────────────────
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    // Delete old Cloudinary avatar if it's a Cloudinary URL (not DiceBear)
    const user = await User.findById(req.user._id);
    if (user.profilePic && user.profilePic.includes('cloudinary.com')) {
      // Extract public_id and delete
      const parts = user.profilePic.split('/');
      const publicId = parts.slice(-2).join('/').replace(/\.[^.]+$/, '');
      try { await cloudinary.uploader.destroy(publicId); } catch {}
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'vettri-academy/avatars',
      resource_type: 'image',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: result.secure_url },
      { new: true }
    ).select('-password -refreshToken');

    res.json({ success: true, profilePic: result.secure_url, user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Update Teacher Permissions ───────────────────────────────────────
const TeacherPermissions = require('../models/TeacherPermissions');

const updateTeacherPermissions = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { canShareFiles, canSendMessages, canAccessStudentList, canUploadMaterials } = req.body;
    const io = req.app.get('io');

    const perms = await TeacherPermissions.findOneAndUpdate(
      { teacherId },
      { canShareFiles, canSendMessages, canAccessStudentList, canUploadMaterials, updatedBy: req.user._id, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    // Notify teacher in real-time
    io.to(`teacher_${teacherId}`).emit('permission:updated', {
      canShareFiles: perms.canShareFiles,
      canSendMessages: perms.canSendMessages,
      canAccessStudentList: perms.canAccessStudentList,
      canUploadMaterials: perms.canUploadMaterials,
    });

    res.json({ success: true, permissions: perms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTeacherPermissions = async (req, res) => {
  try {
    const { teacherId } = req.params;
    let perms = await TeacherPermissions.findOne({ teacherId });
    if (!perms) {
      perms = { teacherId, canShareFiles: true, canSendMessages: true, canAccessStudentList: true, canUploadMaterials: true };
    }
    res.json({ success: true, permissions: perms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllTeacherPermissions = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', isActive: true }).select('name displayName profilePic');
    const allPerms = await TeacherPermissions.find();
    const permsMap = new Map(allPerms.map((p) => [p.teacherId.toString(), p]));

    const result = teachers.map((t) => ({
      teacher: t,
      permissions: permsMap.get(t._id.toString()) || {
        canShareFiles: true, canSendMessages: true, canAccessStudentList: true, canUploadMaterials: true,
      },
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  changePassword,
  updateTeacherPermissions,
  getTeacherPermissions,
  getAllTeacherPermissions,
};
