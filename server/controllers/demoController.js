const DemoBooking = require('../models/DemoBooking');
const { sendDemoConfirmation } = require('../utils/email');

const createDemoBooking = async (req, res) => {
  try {
    const { name, phone, email, grade, course, preferredDate, preferredTime, message } = req.body;
    const booking = await DemoBooking.create({
      name, phone, email, grade, course, preferredDate, preferredTime, message,
    });
    
    res.status(201).json({ success: true, booking, message: 'Demo request received! We will contact you shortly.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDemoBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const bookings = await DemoBooking.find(filter)
      .populate('assignedTeacher', 'name displayName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    const total = await DemoBooking.countDocuments(filter);
    res.json({ success: true, bookings, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDemoBooking = async (req, res) => {
  try {
    const { status, assignedTeacher, demoLink, adminNotes } = req.body;
    const booking = await DemoBooking.findByIdAndUpdate(
      req.params.id,
      { status, assignedTeacher, demoLink, adminNotes },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (status === 'confirmed' && demoLink) {
      await sendDemoConfirmation(booking);
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createDemoBooking, getDemoBookings, updateDemoBooking };
