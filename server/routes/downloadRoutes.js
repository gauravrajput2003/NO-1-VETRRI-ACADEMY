const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getDownloadableResources,
  getNcertResources,
} = require('../controllers/downloadController');

// All authenticated users can access the download center
router.get('/resources', verifyToken, getDownloadableResources);
router.get('/ncert', verifyToken, getNcertResources);

module.exports = router;
