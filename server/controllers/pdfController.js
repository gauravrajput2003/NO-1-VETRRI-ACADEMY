const PdfProgress = require('../models/PdfProgress');
const PdfBookmark = require('../models/PdfBookmark');
const PdfNote = require('../models/PdfNote');
const PdfAnalytics = require('../models/PdfAnalytics');
const StudyMaterial = require('../models/StudyMaterial');
const cloudinaryService = require('../services/cloudinaryService');

// ─── Helper: Generate unique session ID ────────────────────────────────────────
const generateSessionId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Save/update reading progress
// @route   POST /api/pdf/progress
// @access  Authenticated
const saveProgress = async (req, res) => {
  try {
    const { materialId, lastPage, totalPages } = req.body;

    if (!materialId || !lastPage) {
      return res.status(400).json({
        success: false,
        message: 'materialId and lastPage are required.',
      });
    }

    const completedPercentage = totalPages
      ? Math.min(Math.round((lastPage / totalPages) * 100), 100)
      : 0;

    const progress = await PdfProgress.findOneAndUpdate(
      { userId: req.user._id, materialId },
      {
        lastPage,
        totalPages: totalPages || 0,
        completedPercentage,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get reading progress for a material
// @route   GET /api/pdf/progress/:materialId
// @access  Authenticated
const getProgress = async (req, res) => {
  try {
    const progress = await PdfProgress.findOne({
      userId: req.user._id,
      materialId: req.params.materialId,
    });

    res.status(200).json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKMARKS
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Add a page bookmark
// @route   POST /api/pdf/bookmarks
// @access  Authenticated
const addBookmark = async (req, res) => {
  try {
    const { materialId, pageNumber, label } = req.body;

    if (!materialId || !pageNumber) {
      return res.status(400).json({
        success: false,
        message: 'materialId and pageNumber are required.',
      });
    }

    // Check for duplicate
    const existing = await PdfBookmark.findOne({
      userId: req.user._id,
      materialId,
      pageNumber,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This page is already bookmarked.',
        bookmark: existing,
      });
    }

    const bookmark = await PdfBookmark.create({
      userId: req.user._id,
      materialId,
      pageNumber,
      label: label || `Page ${pageNumber}`,
    });

    res.status(201).json({ success: true, bookmark });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove a bookmark
// @route   DELETE /api/pdf/bookmarks/:bookmarkId
// @access  Authenticated
const removeBookmark = async (req, res) => {
  try {
    const bookmark = await PdfBookmark.findOneAndDelete({
      _id: req.params.bookmarkId,
      userId: req.user._id,
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: 'Bookmark not found.',
      });
    }

    res.status(200).json({ success: true, message: 'Bookmark removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all bookmarks for a specific material
// @route   GET /api/pdf/bookmarks/:materialId
// @access  Authenticated
const getBookmarks = async (req, res) => {
  try {
    const bookmarks = await PdfBookmark.find({
      userId: req.user._id,
      materialId: req.params.materialId,
    }).sort({ pageNumber: 1 });

    res.status(200).json({ success: true, bookmarks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all bookmarks across all materials
// @route   GET /api/pdf/bookmarks/all
// @access  Authenticated
const getAllUserBookmarks = async (req, res) => {
  try {
    const bookmarks = await PdfBookmark.find({ userId: req.user._id })
      .populate('materialId', 'title subject thumbnailUrl type')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, bookmarks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Add a note to a page
// @route   POST /api/pdf/notes
// @access  Authenticated
const addNote = async (req, res) => {
  try {
    const { materialId, pageNumber, noteText, color } = req.body;

    if (!materialId || !pageNumber || !noteText) {
      return res.status(400).json({
        success: false,
        message: 'materialId, pageNumber, and noteText are required.',
      });
    }

    if (noteText.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Note text cannot exceed 2000 characters.',
      });
    }

    const note = await PdfNote.create({
      userId: req.user._id,
      materialId,
      pageNumber,
      noteText,
      color: color || 'yellow',
    });

    res.status(201).json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a note
// @route   PUT /api/pdf/notes/:noteId
// @access  Authenticated
const updateNote = async (req, res) => {
  try {
    const { noteText, color } = req.body;

    const note = await PdfNote.findOne({
      _id: req.params.noteId,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.',
      });
    }

    if (noteText !== undefined) {
      if (noteText.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Note text cannot exceed 2000 characters.',
        });
      }
      note.noteText = noteText;
    }
    if (color) note.color = color;

    await note.save();

    res.status(200).json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a note
// @route   DELETE /api/pdf/notes/:noteId
// @access  Authenticated
const deleteNote = async (req, res) => {
  try {
    const note = await PdfNote.findOneAndDelete({
      _id: req.params.noteId,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.',
      });
    }

    res.status(200).json({ success: true, message: 'Note deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all notes for a material
// @route   GET /api/pdf/notes/:materialId
// @access  Authenticated
const getMaterialNotes = async (req, res) => {
  try {
    const notes = await PdfNote.find({
      userId: req.user._id,
      materialId: req.params.materialId,
    }).sort({ pageNumber: 1, createdAt: 1 });

    res.status(200).json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get notes for a specific page
// @route   GET /api/pdf/notes/:materialId/:pageNumber
// @access  Authenticated
const getPageNotes = async (req, res) => {
  try {
    const notes = await PdfNote.find({
      userId: req.user._id,
      materialId: req.params.materialId,
      pageNumber: parseInt(req.params.pageNumber, 10),
    }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Track PDF open event
// @route   POST /api/pdf/analytics/open
// @access  Authenticated
const trackOpen = async (req, res) => {
  try {
    const { materialId, deviceType } = req.body;

    if (!materialId) {
      return res.status(400).json({
        success: false,
        message: 'materialId is required.',
      });
    }

    const sessionId = generateSessionId();

    await PdfAnalytics.create({
      studentId: req.user._id,
      materialId,
      openedAt: new Date(),
      deviceType: deviceType || 'mobile',
      sessionId,
    });

    res.status(201).json({ success: true, sessionId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Track PDF close event
// @route   POST /api/pdf/analytics/close
// @access  Authenticated
const trackClose = async (req, res) => {
  try {
    const { sessionId, lastPage, totalTimeSpent, completedPercentage } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId is required.',
      });
    }

    const analytics = await PdfAnalytics.findOneAndUpdate(
      { sessionId },
      {
        closedAt: new Date(),
        lastPage: lastPage || 1,
        totalTimeSpent: totalTimeSpent || 0,
        completedPercentage: completedPercentage || 0,
      },
      { new: true }
    );

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
      });
    }

    res.status(200).json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get teacher analytics dashboard
// @route   GET /api/pdf/analytics/teacher
// @access  Teacher/Admin
const getTeacherAnalytics = async (req, res) => {
  try {
    const { period } = req.query; // '7d', '30d', 'all'

    // Get teacher's materials
    const teacherMaterials = await StudyMaterial.find({
      teacher: req.user._id,
    }).select('_id title subject thumbnailUrl');

    const materialIds = teacherMaterials.map((m) => m._id);

    if (materialIds.length === 0) {
      return res.status(200).json({
        success: true,
        analytics: {
          totalOpens: 0,
          uniqueStudents: 0,
          avgCompletion: 0,
          mostReadMaterial: null,
          materialBreakdown: [],
        },
      });
    }

    // Build date filter
    let dateFilter = {};
    if (period === '7d') {
      dateFilter = { openedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (period === '30d') {
      dateFilter = { openedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    // Aggregation pipeline
    const pipeline = [
      {
        $match: {
          materialId: { $in: materialIds },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$materialId',
          totalOpens: { $sum: 1 },
          uniqueStudents: { $addToSet: '$studentId' },
          avgTimeSpent: { $avg: '$totalTimeSpent' },
          avgCompletion: { $avg: '$completedPercentage' },
          lastAccess: { $max: '$openedAt' },
        },
      },
      {
        $project: {
          totalOpens: 1,
          uniqueStudentCount: { $size: '$uniqueStudents' },
          avgTimeSpent: { $round: ['$avgTimeSpent', 0] },
          avgCompletion: { $round: ['$avgCompletion', 1] },
          lastAccess: 1,
        },
      },
      { $sort: { totalOpens: -1 } },
    ];

    const materialStats = await PdfAnalytics.aggregate(pipeline);

    // Build material breakdown with titles
    const materialMap = {};
    teacherMaterials.forEach((m) => {
      materialMap[m._id.toString()] = m;
    });

    const materialBreakdown = materialStats.map((stat) => ({
      material: materialMap[stat._id.toString()] || { title: 'Unknown' },
      totalOpens: stat.totalOpens,
      uniqueStudents: stat.uniqueStudentCount,
      avgTimeSpent: stat.avgTimeSpent,
      avgCompletion: stat.avgCompletion,
      lastAccess: stat.lastAccess,
    }));

    // Summary stats
    const totalOpens = materialStats.reduce((sum, s) => sum + s.totalOpens, 0);
    const allUniqueStudents = new Set();
    const allAnalytics = await PdfAnalytics.find({
      materialId: { $in: materialIds },
      ...dateFilter,
    }).select('studentId');
    allAnalytics.forEach((a) => allUniqueStudents.add(a.studentId.toString()));

    const avgCompletion = materialStats.length
      ? Math.round(materialStats.reduce((sum, s) => sum + s.avgCompletion, 0) / materialStats.length)
      : 0;

    const mostReadMaterial = materialBreakdown.length > 0 ? materialBreakdown[0] : null;

    res.status(200).json({
      success: true,
      analytics: {
        totalOpens,
        uniqueStudents: allUniqueStudents.size,
        avgCompletion,
        mostReadMaterial,
        materialBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed analytics for a specific material
// @route   GET /api/pdf/analytics/material/:materialId
// @access  Teacher/Admin
const getMaterialAnalytics = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.materialId);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found.',
      });
    }

    // Only allow the material's teacher or admin
    if (
      req.user.role !== 'admin' &&
      material.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view analytics for this material.',
      });
    }

    // Per-student aggregation
    const studentStats = await PdfAnalytics.aggregate([
      { $match: { materialId: material._id } },
      {
        $group: {
          _id: '$studentId',
          totalOpens: { $sum: 1 },
          totalTimeSpent: { $sum: '$totalTimeSpent' },
          maxPage: { $max: '$lastPage' },
          maxCompletion: { $max: '$completedPercentage' },
          lastAccess: { $max: '$openedAt' },
          devices: { $addToSet: '$deviceType' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $project: {
          studentName: '$student.name',
          studentGrade: '$student.grade',
          totalOpens: 1,
          totalTimeSpent: 1,
          maxPage: 1,
          maxCompletion: { $round: ['$maxCompletion', 1] },
          lastAccess: 1,
          devices: 1,
        },
      },
      { $sort: { totalTimeSpent: -1 } },
    ]);

    // Most bookmarked pages for this material
    const bookmarkStats = await PdfBookmark.aggregate([
      { $match: { materialId: material._id } },
      { $group: { _id: '$pageNumber', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      material: {
        _id: material._id,
        title: material.title,
        subject: material.subject,
        totalPages: material.totalPages,
      },
      studentStats,
      bookmarkStats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNED URL
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Get a signed/secured PDF URL
// @route   GET /api/pdf/signed-url/:materialId
// @access  Authenticated
const getSignedPdfUrl = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.materialId);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found.',
      });
    }

    // Check if material is locked for this student
    if (req.user.role === 'student') {
      const studentId = req.user._id.toString();
      const isUnlocked = material.unlockedFor.some(
        (id) => id.toString() === studentId
      );
      const isLocked = material.lockedFor.some(
        (id) => id.toString() === studentId
      );

      if (material.lockedForAll && !isUnlocked) {
        return res.status(403).json({
          success: false,
          message: 'This material is locked. Contact your teacher.',
        });
      }

      if (!material.lockedForAll && isLocked) {
        return res.status(403).json({
          success: false,
          message: 'This material is locked for you.',
        });
      }
    }

    // Generate signed URL or return existing URL (protected by JWT)
    let url = material.fileUrl;
    let expiresAt = null;

    if (material.publicId && cloudinaryService.getSignedUrl) {
      const signedUrl = cloudinaryService.getSignedUrl(
        material.publicId,
        material.resourceType || 'raw',
        900 // 15 minutes
      );
      if (signedUrl) {
        url = signedUrl;
        expiresAt = new Date(Date.now() + 900 * 1000);
      }
    }

    res.status(200).json({
      success: true,
      url,
      expiresAt,
      material: {
        _id: material._id,
        title: material.title,
        totalPages: material.totalPages,
        thumbnailUrl: material.thumbnailUrl,
        type: material.type,
        fileSize: material.fileSize,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  saveProgress,
  getProgress,
  addBookmark,
  removeBookmark,
  getBookmarks,
  getAllUserBookmarks,
  addNote,
  updateNote,
  deleteNote,
  getMaterialNotes,
  getPageNotes,
  trackOpen,
  trackClose,
  getTeacherAnalytics,
  getMaterialAnalytics,
  getSignedPdfUrl,
};
