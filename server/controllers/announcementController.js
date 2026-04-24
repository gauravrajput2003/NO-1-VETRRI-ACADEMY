const Announcement = require('../models/Announcement');

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetRole, targetCourse, targetGrade, isPinned, expiresAt } = req.body;
    const io = req.app.get('io');

    const announcement = await Announcement.create({
      title, content, targetRole, targetCourse, targetGrade,
      isPinned, expiresAt, postedBy: req.user._id,
    });

    // Emit to relevant rooms
    if (targetRole === 'all' || targetRole === 'student') {
      io.emit('announcement:new', { announcement: { ...announcement.toObject(), content: announcement.content.substring(0, 200) } });
    } else if (targetRole === 'teacher') {
      // Emit to all teacher rooms (they all listen on 'announcement:new')
      io.emit('announcement:new', { announcement: { ...announcement.toObject() } });
    }

    res.status(201).json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const filter = {
      isActive: true,
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
      targetRole: { $in: ['all', user.role] },
    };

    // If student has course/grade, filter further
    if (user.role === 'student') {
      const courseFilter = [];
      courseFilter.push({ targetCourse: null });
      if (user.course) courseFilter.push({ targetCourse: user.course?.toString() });
      if (user.grade) courseFilter.push({ targetGrade: user.grade });
      filter.$and = [
        { $or: courseFilter },
        { $or: [{ targetGrade: null }, ...(user.grade ? [{ targetGrade: user.grade }] : [])] },
      ];
    }

    const announcements = await Announcement.find(filter)
      .populate('postedBy', 'name displayName')
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({ success: true, announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createAnnouncement, getAnnouncements, updateAnnouncement, deleteAnnouncement };
