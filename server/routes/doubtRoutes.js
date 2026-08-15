const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { uploadDoubtAttachment } = require('../middleware/upload');
const { generalLimiter } = require('../middleware/rateLimiter');
const {
  getTeacherSearch,
  uploadDoubtAttachment: uploadAttachmentController,
  createDoubt,
  listDoubts,
  getDoubtDetail,
  addReply,
  updateDoubtStatus,
  reassignTeachers,
  deleteAbusiveContent,
  getDashboardMetrics,
  getRetentionSettings,
  updateRetentionSettings,
  exportDoubts,
  downloadAttachment,
  downloadReplyAttachment,
} = require('../controllers/doubtController');

router.use(verifyToken);

router.get('/teachers/search', getTeacherSearch);
router.post('/attachments', generalLimiter, uploadDoubtAttachment.single('file'), uploadAttachmentController);

router.get('/dashboard/metrics', getDashboardMetrics);
router.get('/admin/retention', getRetentionSettings);
router.put('/admin/retention', updateRetentionSettings);
router.get('/admin/export', exportDoubts);

router.post('/', generalLimiter, createDoubt);
router.get('/', listDoubts);
router.get(
  '/:id/attachments/:attachmentIndex/download',
  downloadAttachment
);

router.get(
  '/:doubtId/replies/:replyId/attachments/:attachmentIndex/download',
  downloadReplyAttachment
);
router.get('/:id', getDoubtDetail);
router.post('/:id/replies', generalLimiter, addReply);
router.patch('/:id/status', updateDoubtStatus);
router.patch('/:id/assign', reassignTeachers);
router.delete('/:id/content', deleteAbusiveContent);

module.exports = router;
