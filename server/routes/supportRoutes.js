const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { uploadChatFile } = require('../middleware/upload');
const {
  createTicket,
  getMyTickets,
  getTicketDetail,
  getAdminTickets,
  updateTicketStatus,
  deleteTicket,
  uploadSupportAttachment,
} = require('../controllers/supportController');

// ─── Student & Teacher Routes ────────────────────────────────────────────────
router.post('/tickets', verifyToken, createTicket);
router.get('/my-tickets', verifyToken, getMyTickets);
router.get('/tickets/:id', verifyToken, getTicketDetail);
router.post('/upload-attachment', verifyToken, uploadChatFile.single('file'), uploadSupportAttachment);

// ─── Admin Only Routes ───────────────────────────────────────────────────────
router.get('/admin/tickets', verifyToken, adminOnly, getAdminTickets);
router.patch('/admin/tickets/:id', verifyToken, adminOnly, updateTicketStatus);
router.delete('/admin/tickets/:id', verifyToken, adminOnly, deleteTicket);

module.exports = router;
