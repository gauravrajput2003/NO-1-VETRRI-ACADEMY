const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { teacherOrAdmin } = require('../middleware/roleCheck');
const pdfController = require('../controllers/pdfController');

// All routes require authentication
router.use(verifyToken);

// ─── Progress ──────────────────────────────────────────────────────────────────
router.post('/progress', pdfController.saveProgress);
router.get('/progress/:materialId', pdfController.getProgress);

// ─── Bookmarks ─────────────────────────────────────────────────────────────────
router.post('/bookmarks', pdfController.addBookmark);
router.delete('/bookmarks/:bookmarkId', pdfController.removeBookmark);
router.get('/bookmarks/all', pdfController.getAllUserBookmarks);
router.get('/bookmarks/:materialId', pdfController.getBookmarks);

// ─── Notes ─────────────────────────────────────────────────────────────────────
router.post('/notes', pdfController.addNote);
router.put('/notes/:noteId', pdfController.updateNote);
router.delete('/notes/:noteId', pdfController.deleteNote);
router.get('/notes/:materialId/:pageNumber', pdfController.getPageNotes);
router.get('/notes/:materialId', pdfController.getMaterialNotes);

// ─── Analytics ─────────────────────────────────────────────────────────────────
router.post('/analytics/open', pdfController.trackOpen);
router.post('/analytics/close', pdfController.trackClose);
router.get('/analytics/teacher', teacherOrAdmin, pdfController.getTeacherAnalytics);
router.get('/analytics/material/:materialId', teacherOrAdmin, pdfController.getMaterialAnalytics);

// ─── Signed URL ────────────────────────────────────────────────────────────────
router.get('/signed-url/:materialId', pdfController.getSignedPdfUrl);

module.exports = router;
