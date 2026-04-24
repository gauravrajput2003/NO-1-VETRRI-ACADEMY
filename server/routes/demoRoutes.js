const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { createDemoBooking, getDemoBookings, updateDemoBooking } = require('../controllers/demoController');

// Public route — no auth for booking
router.post('/', createDemoBooking);
router.get('/', verifyToken, adminOnly, getDemoBookings);
router.patch('/:id', verifyToken, adminOnly, updateDemoBooking);

module.exports = router;
