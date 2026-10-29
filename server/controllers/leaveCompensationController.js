const Leave = require('../models/LeaveApplication');
const notifications = require('../services/notificationService');
exports.update = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave || leave.applicantRole !== 'teacher') return res.status(404).json({ success: false, message: 'Teacher leave not found.' });
    const admin = req.user.role === 'admin';
    if (!admin && (req.user.role !== 'teacher' || String(leave.applicant) !== String(req.user._id))) return res.status(403).json({ success: false, message: 'Access denied.' });
    const status = req.body.status;
    if ((!admin && status !== 'completed_by_teacher') || (admin && !['approved_by_admin', 'expired'].includes(status))) return res.status(403).json({ success: false, message: 'This compensation transition is not permitted.' });
    if (!leave.compensationClassDate || leave.status !== 'approved') return res.status(400).json({ success: false, message: 'An approved leave with a compensation date is required.' });
    if (leave.compensationStatus === status) return res.json({ success: true, leave });
    if ((!admin && leave.compensationStatus !== 'pending') || (status === 'approved_by_admin' && leave.compensationStatus !== 'completed_by_teacher')) return res.status(409).json({ success: false, message: 'Refresh the leave record before updating compensation.' });
    leave.compensationStatus = status;
    if (admin) leave.compensationReviewedAt = new Date();
    await leave.save();
    const recipients = admin ? [leave.applicant] : (await require('../models/User').find({ role: 'admin', isActive: true }).select('_id')).map((user) => user._id);
    await notifications.sendBulkNotifications({ recipientIds: recipients, senderId: req.user._id, type: 'leave_approved', title: 'Leave compensation updated', message: `Compensation status: ${status.replace(/_/g, ' ')}.`, link: admin ? '/teacher/leave' : '/admin/leave', io: req.app.get('io') });
    res.json({ success: true, leave });
  } catch { res.status(500).json({ success: false, message: 'Unable to update compensation.' }); }
};
