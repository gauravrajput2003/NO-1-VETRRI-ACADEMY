const Enquiry = require('../models/Enquiry');
const { sendEnquiryEmail } = require('../utils/email');

// @desc    Submit enquiry from landing page
// @route   POST /api/enquiries
// @access  Public
const submitEnquiry = async (req, res) => {
  try {
    const { name, phone, email, grade, course, message } = req.body;

    const enquiry = await Enquiry.create({
      name,
      phone,
      email,
      grade,
      course,
      message,
      source: 'landing_page',
    });

    // Send admin notification email
    sendEnquiryEmail(enquiry);

    const notificationService = require('../services/notificationService');
    const User = require('../models/User');
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      if (admins.length) {
        await notificationService.sendBulkNotifications({
          recipientIds: admins.map((a) => a._id),
          type: 'new_enquiry',
          title: 'New Enquiry Received',
          message: `${enquiry.name} enquired about ${enquiry.course || 'a course'}.`,
          referenceId: enquiry._id,
          referenceType: 'Enquiry',
          link: '/admin/enquiries',
          io: req.app.get('io'),
        });
      }
    } catch (notifErr) {
      console.error('[Enquiry] Notification failed:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! We will contact you within 24 hours.',
      enquiry: { _id: enquiry._id, name: enquiry.name },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all enquiries (admin)
// @route   GET /api/enquiries
// @access  Admin
const getEnquiries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const enquiries = await Enquiry.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Enquiry.countDocuments(filter);

    res.status(200).json({
      success: true,
      enquiries,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update enquiry status (admin)
// @route   PUT /api/enquiries/:id
// @access  Admin
const updateEnquiryStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes: adminNotes || '', assignedTo: req.user._id },
      { new: true }
    );

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    res.status(200).json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { submitEnquiry, getEnquiries, updateEnquiryStatus };
