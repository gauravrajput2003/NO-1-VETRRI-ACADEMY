const express = require('express');
const router = express.Router();
const { submitEnquiry } = require('../controllers/enquiryController');
const { enquiryLimiter } = require('../middleware/rateLimiter');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateEnquiry = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// POST /api/enquiries — from landing page
router.post('/', enquiryLimiter, validateEnquiry, submitEnquiry);

module.exports = router;
