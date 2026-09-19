const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const TicketCounter = require('../models/TicketCounter');
const User = require('../models/User');
const { uploadToCloudinary, getResourceType } = require('../middleware/upload');
const { sendNotification, sendBulkNotifications } = require('../services/notificationService');

// ─── Map Category Codes to Friendly Labels ────────────────────────────────────
const CATEGORY_LABELS = {
  fee_issue: 'Fee Related Issue',
  study_material: 'Study Material Related',
  live_class: 'Live Class & Schedule',
  leave_attendance: 'Leave & Attendance',
  exam_scores: 'Exam & Scores Related',
  technical_app: 'App & Technical Issue',
  other: 'Other Query',
};

// ─── 1. Create Ticket (Student & Teacher) ─────────────────────────────────────
const createTicket = async (req, res) => {
  try {
    const {
      category = 'other',
      subCategory = '',
      subject = '',
      description = '',
      attachments = [],
      priority = 'medium',
    } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a query description.' });
    }

    const role = req.user.role; // 'student' or 'teacher'
    if (role !== 'student' && role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only students and teachers can submit support tickets.' });
    }

    // Generate unique sequential ticket ID (e.g. VASQ0001 or VATQ0001)
    const ticketId = await TicketCounter.getNextTicketId(role);

    // 3 days retention safety policy
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const canDeleteAfter = new Date(Date.now() + THREE_DAYS_MS);

    const categoryLabel = CATEGORY_LABELS[category] || 'General Inquiry';
    const finalSubject = subject && subject.trim() ? subject.trim() : `${categoryLabel} (${subCategory || 'General'})`;

    const ticket = await SupportTicket.create({
      ticketId,
      userId: req.user._id,
      role,
      category,
      categoryLabel,
      subCategory: subCategory.trim(),
      subject: finalSubject,
      description: description.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      priority,
      status: 'open',
      canDeleteAfter,
    });

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('userId', 'name displayName profilePic role mobile email grade')
      .lean();

    // Notify all active Admins via high-priority Push Notification + Socket.io
    const admins = await User.find({ role: 'admin' }).select('_id expoPushToken').lean();
    const adminIds = admins.map((a) => a._id);

    if (adminIds.length > 0) {
      const io = req.app.get('io');
      const senderName = req.user.displayName || req.user.name || 'User';

      await sendBulkNotifications({
        recipientIds: adminIds,
        senderId: req.user._id,
        type: 'support_ticket',
        title: `🔔 New Support Ticket: ${ticketId}`,
        message: `${senderName} (${role.toUpperCase()}) raised: ${categoryLabel}`,
        link: 'AdminQueries',
        data: {
          ticketId,
          ticketDbId: ticket._id.toString(),
          category,
          role,
          route: 'AdminQueries',
        },
        referenceId: ticket._id.toString(),
        referenceType: 'SupportTicket',
        io,
      });

      if (io) {
        io.to('admin_room').emit('support:ticket_created', populatedTicket);
      }
    }

    res.status(201).json({
      success: true,
      message: `Support ticket ${ticketId} raised successfully.`,
      ticket: populatedTicket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 2. Get My Tickets (Student & Teacher) ────────────────────────────────────
const getMyTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user._id, isDeleted: false };

    if (status && status !== 'all') {
      filter.status = status;
    }

    const tickets = await SupportTicket.find(filter)
      .populate('adminRepliedBy', 'name displayName profilePic role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await SupportTicket.countDocuments(filter);

    res.json({
      success: true,
      tickets,
      total,
      page: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 3. Get Ticket Detail (Owner or Admin) ───────────────────────────────────
const getTicketDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { ticketId: id };

    const ticket = await SupportTicket.findOne(query)
      .populate('userId', 'name displayName profilePic role mobile email grade')
      .populate('adminRepliedBy', 'name displayName profilePic role')
      .lean();

    if (!ticket || ticket.isDeleted) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    // Role check: User must own the ticket or be an admin
    if (req.user.role !== 'admin' && ticket.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const now = Date.now();
    const deleteTime = new Date(ticket.canDeleteAfter).getTime();
    const isDeletable = now >= deleteTime;
    const deletableInMs = Math.max(0, deleteTime - now);

    res.json({
      success: true,
      ticket: {
        ...ticket,
        isDeletable,
        deletableInMs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 4. Admin Only: Get All Tickets with Summary Stats ───────────────────────
const getAdminTickets = async (req, res) => {
  try {
    const { role = 'all', status = 'all', category = 'all', search = '', page = 1, limit = 50 } = req.query;
    const filter = { isDeleted: false };

    if (role !== 'all') filter.role = role;
    if (status !== 'all') filter.status = status;
    if (category !== 'all') filter.category = category;

    if (search && search.trim()) {
      const q = search.trim();
      const matchedUsers = await User.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { displayName: { $regex: q, $options: 'i' } },
          { mobile: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ],
      }).select('_id');
      const userIds = matchedUsers.map((u) => u._id);

      filter.$or = [
        { ticketId: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { categoryLabel: { $regex: q, $options: 'i' } },
        { userId: { $in: userIds } },
      ];
    }

    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'name displayName profilePic role mobile email grade')
      .populate('adminRepliedBy', 'name displayName profilePic role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await SupportTicket.countDocuments(filter);

    // Compute metrics
    const [totalCount, openCount, inProgressCount, resolvedCount, studentCount, teacherCount] = await Promise.all([
      SupportTicket.countDocuments({ isDeleted: false }),
      SupportTicket.countDocuments({ isDeleted: false, status: 'open' }),
      SupportTicket.countDocuments({ isDeleted: false, status: 'in_progress' }),
      SupportTicket.countDocuments({ isDeleted: false, status: 'resolved' }),
      SupportTicket.countDocuments({ isDeleted: false, role: 'student' }),
      SupportTicket.countDocuments({ isDeleted: false, role: 'teacher' }),
    ]);

    const now = Date.now();
    const enrichedTickets = tickets.map((t) => {
      const deleteTime = new Date(t.canDeleteAfter).getTime();
      return {
        ...t,
        isDeletable: now >= deleteTime,
        deletableInMs: Math.max(0, deleteTime - now),
      };
    });

    res.json({
      success: true,
      tickets: enrichedTickets,
      total,
      page: parseInt(page),
      counts: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        students: studentCount,
        teachers: teacherCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 5. Admin Only: Update Ticket Status & Reply ──────────────────────────────
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply, priority } = req.body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;

    if (adminReply !== undefined && adminReply.trim()) {
      ticket.adminReply = adminReply.trim();
      ticket.adminRepliedAt = new Date();
      ticket.adminRepliedBy = req.user._id;
    }

    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
    } else if (status === 'closed') {
      ticket.closedAt = new Date();
    }

    await ticket.save();

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('userId', 'name displayName profilePic role mobile email grade expoPushToken')
      .populate('adminRepliedBy', 'name displayName profilePic role')
      .lean();

    // Send push notification back to the student or teacher
    const io = req.app.get('io');
    await sendNotification({
      recipientId: ticket.userId,
      senderId: req.user._id,
      type: 'support_ticket_reply',
      title: `Support Ticket ${ticket.ticketId} Updated`,
      message: adminReply ? `Admin replied: "${adminReply.slice(0, 80)}..."` : `Ticket status is now ${ticket.status.toUpperCase()}`,
      link: 'HelpCenter',
      data: {
        ticketId: ticket.ticketId,
        ticketDbId: ticket._id.toString(),
        status: ticket.status,
        route: 'HelpCenter',
      },
      referenceId: ticket._id.toString(),
      referenceType: 'SupportTicket',
      io,
    });

    if (io) {
      io.to(`user:${ticket.userId._id}`).emit('support:ticket_updated', populatedTicket);
      io.to('admin_room').emit('support:ticket_updated', populatedTicket);
    }

    res.json({
      success: true,
      message: 'Ticket updated successfully.',
      ticket: populatedTicket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 6. Admin Only: Delete Ticket (Enforcing 3-Day Rule) ──────────────────────
const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const now = Date.now();
    const canDeleteTime = new Date(ticket.canDeleteAfter).getTime();

    // ── STRICT 3-DAY RETENTION CHECK ──
    if (now < canDeleteTime) {
      const remainingMs = canDeleteTime - now;
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      const remainingDays = (remainingMs / (1000 * 60 * 60 * 24)).toFixed(1);

      return res.status(400).json({
        success: false,
        code: 'TICKET_PROTECTED',
        message: `Deletion protected. This query was submitted recently and can only be deleted after 3 days interval (${remainingDays} days / ~${remainingHours} hours remaining).`,
        canDeleteAfter: ticket.canDeleteAfter,
        remainingHours,
      });
    }

    // Delete permanently from database as requested to keep DB lightweight
    await SupportTicket.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('support:ticket_deleted', { ticketId: ticket.ticketId, id });
    }

    res.json({
      success: true,
      message: `Query ${ticket.ticketId} deleted from database successfully.`,
      ticketId: ticket.ticketId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 7. Upload Ticket Attachment (Image / Audio / PDF) ────────────────────────
const uploadSupportAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }

    const file = req.file;
    const mimeType = file.mimetype || '';
    let fileType = 'doc';

    if (mimeType.startsWith('image/')) {
      fileType = 'image';
    } else if (mimeType.startsWith('audio/') || mimeType === 'video/mp4' || mimeType.includes('audio')) {
      fileType = 'audio';
    } else if (mimeType === 'application/pdf') {
      fileType = 'pdf';
    }

    const resourceType = getResourceType(mimeType);

    const uploadOptions = {
      folder: 'vettri/support_attachments',
      resource_type: resourceType,
    };

    let result;
    if (file.path) {
      result = await uploadToCloudinary(file.path, uploadOptions);
    } else if (file.buffer) {
      const { uploadFromBuffer } = require('../middleware/upload');
      result = await uploadFromBuffer(file.buffer, uploadOptions);
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file payload.' });
    }

    res.json({
      success: true,
      attachment: {
        url: result.secure_url || result.url,
        publicId: result.public_id,
        fileType,
        fileName: file.originalname || 'attachment',
        fileSize: file.size || 0,
        mimeType,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketDetail,
  getAdminTickets,
  updateTicketStatus,
  deleteTicket,
  uploadSupportAttachment,
};
