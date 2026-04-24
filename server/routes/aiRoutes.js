const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleCheck');
const { askVettriAI } = require('../controllers/aiController');

router.post('/ask', verifyToken, allowRoles('student', 'teacher'), askVettriAI);

module.exports = router;
