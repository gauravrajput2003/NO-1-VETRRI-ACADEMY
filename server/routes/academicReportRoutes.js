const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { performance, marks } = require('../controllers/academicReportController');
router.use(verifyToken);
router.get('/teacher-performance', performance);
router.get('/class-marks', marks);
module.exports = router;
