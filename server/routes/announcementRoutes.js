const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { createAnnouncement, getAnnouncements, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
  
router.post('/', verifyToken, adminOnly, createAnnouncement);
router.get('/', verifyToken, getAnnouncements);
router.patch('/:id', verifyToken, adminOnly, updateAnnouncement);
router.delete('/:id', verifyToken, adminOnly, deleteAnnouncement);

module.exports = router;
