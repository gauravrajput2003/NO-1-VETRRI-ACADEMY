const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { teacherOrAdmin } = require('../middleware/roleCheck');
const pdfController = require('../controllers/pdfController');

router.use(verifyToken);

router.post('/progress', pdfController.saveProgress);
router.get('/progress/:materialId', pdfController.getProgress);

router.post('/bookmarks', pdfController.addBookmark);
router.delete('/bookmarks/:bookmarkId', pdfController.removeBookmark);
router.get('/bookmarks/all', pdfController.getAllUserBookmarks);
router.get('/bookmarks/:materialId', pdfController.getBookmarks);

router.post('/notes', pdfController.addNote);
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
