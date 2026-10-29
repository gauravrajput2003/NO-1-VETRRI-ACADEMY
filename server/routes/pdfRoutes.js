const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { teacherOrAdmin } = require('../middleware/roleCheck');
const pdfController = require('../controllers/pdfController');

router.use(verifyToken);
const materialAccess = async (req, res, next, materialId) => {
  try {
    const material = await require('../models/StudyMaterial').findById(materialId);
    if (!material) return res.status(404).json({ success: false, message: 'Material not found.' });
    const allowed = req.user.role === 'admin' || (req.user.role === 'teacher' ? String(material.teacher) === String(req.user._id) : require('../utils/materialAccess').isMaterialAccessibleForStudent(material, req.user).allowed);
    if (!allowed) return res.status(403).json({ success: false, message: 'Material access denied.' });
    next();
  } catch { res.status(400).json({ success: false, message: 'Invalid material.' }); }
};
router.param('materialId', materialAccess);
router.use((req, res, next) => req.body?.materialId ? materialAccess(req, res, next, req.body.materialId) : next());

router.post('/progress', pdfController.saveProgress);
router.get('/progress/:materialId', pdfController.getProgress);

router.post('/bookmarks', pdfController.addBookmark);
router.delete('/bookmarks/:bookmarkId', pdfController.removeBookmark);
router.get('/bookmarks/all', pdfController.getAllUserBookmarks);
router.get('/bookmarks/:materialId', pdfController.getBookmarks);

router.post('/notes', pdfController.addNote);
router.get('/notes/all', async (req, res) => {
  try { const notes = await require('../models/PdfNote').find({ userId: req.user._id }).populate('materialId', 'title subject').sort({ updatedAt: -1 }); res.json({ success: true, notes }); }
  catch { res.status(500).json({ success: false, message: 'Unable to load notes.' }); }
});
router.put('/notes/:noteId', pdfController.updateNote);
router.delete('/notes/:noteId', pdfController.deleteNote);
router.get('/notes/:materialId/:pageNumber', pdfController.getPageNotes);
router.get('/notes/:materialId', pdfController.getMaterialNotes);

router.post('/analytics/open', pdfController.trackOpen);
router.post('/analytics/close', pdfController.trackClose);
router.get('/analytics/teacher', teacherOrAdmin, pdfController.getTeacherAnalytics);
router.get('/analytics/material/:materialId', teacherOrAdmin, pdfController.getMaterialAnalytics);

router.get('/signed-url/:materialId', pdfController.getSignedPdfUrl);

module.exports = router;
