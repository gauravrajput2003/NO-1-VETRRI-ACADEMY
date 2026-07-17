const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleCheck');
const { askVettriAI } = require('../controllers/aiController');

// Allow admin too so administrators can test the assistant
router.post('/ask', verifyToken, allowRoles('student', 'teacher', 'admin'), askVettriAI);

module.exports = router;
