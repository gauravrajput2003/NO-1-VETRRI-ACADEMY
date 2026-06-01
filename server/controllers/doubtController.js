const mongoose = require('mongoose');
const Doubt = require('../models/Doubt');
const DoubtReply = require('../models/DoubtReply');
const DoubtAuditLog = require('../models/DoubtAuditLog');
const DoubtSetting = require('../models/DoubtSetting');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { uploadToCloudinary, getResourceType } = require('../middleware/upload');

const VALID_ATTACHMENT_MIMES = {
	image: ['image/jpeg', 'image/png'],
	pdf: ['application/pdf'],
	audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'],
};

const STATUS = {
	OPEN: 'open',
	TEACHER_RESPONDED: 'teacher_responded',
	WAITING_FOR_STUDENT: 'waiting_for_student',
	RESOLVED: 'resolved',
	CLOSED: 'closed',
};

const PRIORITIES = ['low', 'medium', 'high'];

const trimSafe = (v) => (typeof v === 'string' ? v.trim() : '');

const toObjectId = (id) => {
	if (!id) return null;
	try {
		return new mongoose.Types.ObjectId(id);
	} catch {
		return null;
	}
};

const createAuditLog = async ({ doubtId, actor, action, metadata = {} }) => {
	try {
		await DoubtAuditLog.create({
			doubtId,
			actorId: actor._id,
			actorRole: actor.role,
			action,
			metadata,
		});
	} catch {
		// Audit logging should not block request lifecycle.
	}
};

const parseTags = (tags) => {
	if (Array.isArray(tags)) return tags.map((t) => trimSafe(t)).filter(Boolean).slice(0, 12);
	if (typeof tags === 'string') return tags.split(',').map((t) => trimSafe(t)).filter(Boolean).slice(0, 12);
	return [];
};

const parseTeacherIds = (assignedTeachers) => {
	const source = Array.isArray(assignedTeachers)
		? assignedTeachers
		: typeof assignedTeachers === 'string'
			? assignedTeachers.split(',')
			: [];
	const out = [];
	source.forEach((id) => {
		const oid = toObjectId(trimSafe(id));
		if (oid) out.push(oid);
	});
	return [...new Set(out.map((v) => String(v)))].map((v) => new mongoose.Types.ObjectId(v));
};

const canAccessDoubt = (doubt, user) => {
	if (!doubt) return false;
	if (user.role === 'admin') return true;
	if (user.role === 'student') return String(doubt.studentId) === String(user._id);
	if (user.role === 'teacher') return (doubt.assignedTeachers || []).some((t) => String(t) === String(user._id));
	return false;
};

const buildDoubtQuery = (user, query) => {
	const mongoQuery = { isDeleted: false };

	if (user.role === 'student') {
		mongoQuery.studentId = user._id;
	}

	if (user.role === 'teacher') {
		mongoQuery.assignedTeachers = user._id;
	}

	if (query.status) {
		mongoQuery.status = query.status;
	}

	if (query.priority) {
		mongoQuery.priority = query.priority;
	}

	if (query.subject) {
		mongoQuery.subject = { $regex: trimSafe(query.subject), $options: 'i' };
	}

	if (query.studentId && user.role === 'admin') {
		const sid = toObjectId(query.studentId);
		if (sid) mongoQuery.studentId = sid;
	}

	if (query.teacherId && user.role === 'admin') {
		const tid = toObjectId(query.teacherId);
		if (tid) mongoQuery.assignedTeachers = tid;
	}

	if (query.assignedToMe === 'true' && user.role === 'teacher') {
		mongoQuery.assignedTeachers = user._id;
	}

	if (query.myDoubts === 'true' && user.role === 'student') {
		mongoQuery.studentId = user._id;
	}

	if (query.unanswered === 'true') {
		mongoQuery.status = STATUS.OPEN;
	}

	if (query.keyword) {
		const kw = trimSafe(query.keyword);
		mongoQuery.$or = [
			{ title: { $regex: kw, $options: 'i' } },
			{ description: { $regex: kw, $options: 'i' } },
			{ chapter: { $regex: kw, $options: 'i' } },
			{ tags: { $regex: kw, $options: 'i' } },
		];
	}

	if (query.fromDate || query.toDate) {
		mongoQuery.createdAt = {};
		if (query.fromDate) mongoQuery.createdAt.$gte = new Date(query.fromDate);
		if (query.toDate) {
			const end = new Date(query.toDate);
			end.setHours(23, 59, 59, 999);
			mongoQuery.createdAt.$lte = end;
		}
	}

	return mongoQuery;
};

const emitNotificationAndSocket = async ({ req, recipients, title, message, type, data }) => {
	if (!Array.isArray(recipients) || !recipients.length) return;
	const io = req.app.get('io');
	const payloads = recipients.map((recipient) => ({
		recipient,
		sender: req.user._id,
		type,
		title,
		message,
		data,
	}));

	const created = await Notification.insertMany(payloads, { ordered: false });

	if (io) {
		created.forEach((notif) => {
			io.to(`user:${notif.recipient}`).emit('notification:new', {
				_id: notif._id,
				recipient: notif.recipient,
				sender: notif.sender,
				type: notif.type,
				title: notif.title,
				message: notif.message,
				data: notif.data,
				isRead: false,
				createdAt: notif.createdAt,
			});
		});
	}
};

const getTeacherSearch = async (req, res) => {
	try {
		const q = trimSafe(req.query.q || '');
		const query = { role: 'teacher', isActive: true, isApproved: true };
		if (q) {
			query.$or = [
				{ name: { $regex: q, $options: 'i' } },
				{ displayName: { $regex: q, $options: 'i' } },
				{ subjects: { $regex: q, $options: 'i' } },
			];
		}

		const teachers = await User.find(query)
			.select('_id name displayName profilePic subjects qualification')
			.sort({ name: 1 })
			.limit(30);

		res.json({ success: true, teachers });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const uploadDoubtAttachment = async (req, res) => {
	try {
		if (!req.file || !req.file.buffer) {
			return res.status(400).json({ success: false, message: 'Attachment file is required.' });
		}

		const { mimetype, originalname, size, buffer } = req.file;

		const isImage = VALID_ATTACHMENT_MIMES.image.includes(mimetype);
		const isPdf = VALID_ATTACHMENT_MIMES.pdf.includes(mimetype);
		const isAudio = VALID_ATTACHMENT_MIMES.audio.includes(mimetype);

		if (!isImage && !isPdf && !isAudio) {
			return res.status(400).json({ success: false, message: 'Only JPG, PNG, PDF, and audio files are allowed.' });
		}

		const attachmentType = isImage ? 'image' : isPdf ? 'pdf' : 'audio';
		const resourceType = isImage ? 'image' : 'raw';

		const uploaded = await uploadToCloudinary(buffer, {
			folder: 'doubts/attachments',
			resource_type: resourceType,
			use_filename: true,
			filename_override: originalname,
			unique_filename: true,
		});

		res.status(201).json({
			success: true,
			attachment: {
				url: uploaded.secure_url,
				publicId: uploaded.public_id,
				storageType: 'cloudinary',
				resourceType: getResourceType(mimetype),
				attachmentType,
				mimeType: mimetype,
				originalFilename: originalname,
				fileSize: size || uploaded.bytes || 0,
			},
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const createDoubt = async (req, res) => {
	try {
		if (req.user.role !== 'student') {
			return res.status(403).json({ success: false, message: 'Only students can create doubts.' });
		}

		const title = trimSafe(req.body.title);
		const description = trimSafe(req.body.description);
		const subject = trimSafe(req.body.subject);
		const chapter = trimSafe(req.body.chapter);
		const priority = trimSafe(req.body.priority || 'medium').toLowerCase();
		const tags = parseTags(req.body.tags);
		const assignedTeachers = parseTeacherIds(req.body.assignedTeachers);
		const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];

		if (!title || !description || !subject) {
			return res.status(400).json({ success: false, message: 'Title, description, and subject are required.' });
		}

		if (!PRIORITIES.includes(priority)) {
			return res.status(400).json({ success: false, message: 'Priority must be low, medium, or high.' });
		}

		const validTeachers = assignedTeachers.length
			? await User.find({ _id: { $in: assignedTeachers }, role: 'teacher', isActive: true }).select('_id')
			: [];
		const teacherIds = validTeachers.map((t) => t._id);

		const doubt = await Doubt.create({
			title,
			description,
			subject,
			chapter,
			priority,
			tags,
			studentId: req.user._id,
			assignedTeachers: teacherIds,
			attachments,
			participants: [req.user._id, ...teacherIds],
			status: STATUS.OPEN,
			lastActivityAt: new Date(),
		});

		await createAuditLog({
			doubtId: doubt._id,
			actor: req.user,
			action: 'doubt_created',
			metadata: { assignedTeachers: teacherIds.length },
		});

		if (teacherIds.length) {
			await emitNotificationAndSocket({
				req,
				recipients: teacherIds,
				type: 'doubt_assigned',
				title: 'New Doubt Assigned',
				message: `${req.user.displayName || req.user.name} tagged you in a doubt: ${title}`,
				data: { doubtId: doubt._id, route: 'DoubtDetail' },
			});
		}

		const io = req.app.get('io');
		if (io) {
			io.to('admin_room').emit('doubt:created', { doubtId: doubt._id, priority: doubt.priority });
		}

		res.status(201).json({ success: true, doubt });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const listDoubts = async (req, res) => {
	try {
		const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
		const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
		const skip = (page - 1) * limit;

		const query = buildDoubtQuery(req.user, req.query);

		const [items, total] = await Promise.all([
			Doubt.find(query)
				.populate('studentId', 'name displayName profilePic role grade board')
				.populate('assignedTeachers', 'name displayName profilePic role subjects')
				.sort({ lastActivityAt: -1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			Doubt.countDocuments(query),
		]);

		res.json({
			success: true,
			doubts: items,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const getDoubtDetail = async (req, res) => {
	try {
		const doubt = await Doubt.findById(req.params.id)
			.populate('studentId', 'name displayName profilePic role grade board')
			.populate('assignedTeachers', 'name displayName profilePic role subjects');

		if (!doubt || doubt.isDeleted) {
			return res.status(404).json({ success: false, message: 'Doubt not found.' });
		}

		if (!canAccessDoubt(doubt, req.user)) {
			return res.status(403).json({ success: false, message: 'Access denied.' });
		}

		const replies = await DoubtReply.find({ doubtId: doubt._id, isDeleted: false })
			.populate('senderId', 'name displayName profilePic role')
			.sort({ createdAt: 1 })
			.lean();

		await DoubtReply.updateMany(
			{
				doubtId: doubt._id,
				senderId: { $ne: req.user._id },
				'readBy.userId': { $ne: req.user._id },
			},
			{
				$push: {
					readBy: {
						userId: req.user._id,
						readAt: new Date(),
					},
				},
			}
		);

		res.json({ success: true, doubt, replies });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const addReply = async (req, res) => {
	try {
		const doubt = await Doubt.findById(req.params.id);
		if (!doubt || doubt.isDeleted) {
			return res.status(404).json({ success: false, message: 'Doubt not found.' });
		}

		if (!canAccessDoubt(doubt, req.user)) {
			return res.status(403).json({ success: false, message: 'Access denied.' });
		}

		const message = trimSafe(req.body.message);
		const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
		const parentReplyId = toObjectId(req.body.parentReplyId);

		if (!message && !attachments.length) {
			return res.status(400).json({ success: false, message: 'Reply needs text or attachment.' });
		}

		const reply = await DoubtReply.create({
			doubtId: doubt._id,
			senderId: req.user._id,
			senderRole: req.user.role,
			message,
			attachments,
			parentReplyId,
			readBy: [{ userId: req.user._id, readAt: new Date() }],
		});

		const nextStatus = req.user.role === 'teacher' ? STATUS.TEACHER_RESPONDED : STATUS.WAITING_FOR_STUDENT;
		const update = {
			status: nextStatus,
			lastActivityAt: new Date(),
			$addToSet: { participants: req.user._id },
		};

		if (!doubt.firstResponseAt && req.user.role === 'teacher') {
			update.firstResponseAt = new Date();
		}

		await Doubt.findByIdAndUpdate(doubt._id, update);

		await createAuditLog({
			doubtId: doubt._id,
			actor: req.user,
			action: 'reply_added',
			metadata: { hasAttachments: attachments.length > 0 },
		});

		const recipients = [String(doubt.studentId), ...(doubt.assignedTeachers || []).map((t) => String(t))]
			.filter((id) => id !== String(req.user._id));

		await emitNotificationAndSocket({
			req,
			recipients,
			type: 'doubt_reply',
			title: 'New Doubt Reply',
			message: `${req.user.displayName || req.user.name} replied on: ${doubt.title}`,
			data: { doubtId: doubt._id, route: 'DoubtDetail' },
		});

		const io = req.app.get('io');
		if (io) {
			const populatedReply = await DoubtReply.findById(reply._id).populate('senderId', 'name displayName profilePic role');
			io.to(`doubt:${doubt._id}`).emit('doubt:reply', { doubtId: doubt._id, reply: populatedReply });
		}

		res.status(201).json({ success: true, reply });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const updateDoubtStatus = async (req, res) => {
	try {
		const doubt = await Doubt.findById(req.params.id);
		if (!doubt || doubt.isDeleted) {
			return res.status(404).json({ success: false, message: 'Doubt not found.' });
		}

		if (!canAccessDoubt(doubt, req.user)) {
			return res.status(403).json({ success: false, message: 'Access denied.' });
		}

		const nextStatus = trimSafe(req.body.status).toLowerCase();
		if (!Object.values(STATUS).includes(nextStatus)) {
			return res.status(400).json({ success: false, message: 'Invalid status value.' });
		}

		if (req.user.role === 'student' && nextStatus !== STATUS.RESOLVED) {
			return res.status(403).json({ success: false, message: 'Students can only mark resolved.' });
		}

		if (req.user.role === 'teacher' && nextStatus === STATUS.RESOLVED) {
			return res.status(403).json({ success: false, message: 'Teachers cannot mark as resolved.' });
		}

		const patch = { status: nextStatus, lastActivityAt: new Date() };
		if (nextStatus === STATUS.RESOLVED) patch.resolvedAt = new Date();
		if (nextStatus === STATUS.CLOSED) patch.closedAt = new Date();

		await Doubt.findByIdAndUpdate(doubt._id, patch);

		await createAuditLog({
			doubtId: doubt._id,
			actor: req.user,
			action: nextStatus === STATUS.RESOLVED ? 'doubt_resolved' : nextStatus === STATUS.CLOSED ? 'doubt_closed' : 'status_changed',
			metadata: { from: doubt.status, to: nextStatus },
		});

		const recipients = [String(doubt.studentId), ...(doubt.assignedTeachers || []).map((t) => String(t))]
			.filter((id) => id !== String(req.user._id));

		await emitNotificationAndSocket({
			req,
			recipients,
			type: 'doubt_status',
			title: 'Doubt Status Updated',
			message: `${doubt.title} is now ${nextStatus.replace(/_/g, ' ')}`,
			data: { doubtId: doubt._id, status: nextStatus, route: 'DoubtDetail' },
		});

		const io = req.app.get('io');
		if (io) {
			io.to(`doubt:${doubt._id}`).emit('doubt:status', { doubtId: doubt._id, status: nextStatus });
		}

		res.json({ success: true, status: nextStatus });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const reassignTeachers = async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ success: false, message: 'Only admin can reassign teachers.' });
		}

		const doubt = await Doubt.findById(req.params.id);
		if (!doubt || doubt.isDeleted) {
			return res.status(404).json({ success: false, message: 'Doubt not found.' });
		}

		const nextTeachers = parseTeacherIds(req.body.assignedTeachers);
		const validTeachers = await User.find({ _id: { $in: nextTeachers }, role: 'teacher', isActive: true }).select('_id');
		const teacherIds = validTeachers.map((t) => t._id);

		await Doubt.findByIdAndUpdate(doubt._id, {
			assignedTeachers: teacherIds,
			$addToSet: { participants: { $each: teacherIds } },
			lastActivityAt: new Date(),
		});

		await createAuditLog({
			doubtId: doubt._id,
			actor: req.user,
			action: 'teacher_reassigned',
			metadata: { assignedTeachers: teacherIds },
		});

		await emitNotificationAndSocket({
			req,
			recipients: teacherIds,
			type: 'doubt_assigned',
			title: 'Doubt Reassigned',
			message: `Admin assigned you: ${doubt.title}`,
			data: { doubtId: doubt._id, route: 'DoubtDetail' },
		});

		res.json({ success: true, assignedTeachers: teacherIds });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const deleteAbusiveContent = async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ success: false, message: 'Only admin can delete abuse content.' });
		}

		const { type } = req.body;
		const reason = trimSafe(req.body.reason) || 'abuse';

		if (type === 'doubt') {
			await Doubt.findByIdAndUpdate(req.params.id, {
				isDeleted: true,
				deletedBy: req.user._id,
				deletedReason: reason,
			});
			await createAuditLog({ doubtId: req.params.id, actor: req.user, action: 'content_deleted', metadata: { type: 'doubt', reason } });
			return res.json({ success: true });
		}

		if (type === 'reply') {
			const replyId = req.body.replyId || req.params.replyId;
			await DoubtReply.findByIdAndUpdate(replyId, {
				isDeleted: true,
				deletedBy: req.user._id,
				deletedReason: reason,
			});
			await createAuditLog({ doubtId: req.params.id, actor: req.user, action: 'content_deleted', metadata: { type: 'reply', replyId, reason } });
			return res.json({ success: true });
		}

		return res.status(400).json({ success: false, message: 'type should be doubt or reply.' });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const getDashboardMetrics = async (req, res) => {
	try {
		const now = new Date();
		const base = { isDeleted: false };

		if (req.user.role === 'student') {
			const [total, resolved, pending] = await Promise.all([
				Doubt.countDocuments({ ...base, studentId: req.user._id }),
				Doubt.countDocuments({ ...base, studentId: req.user._id, status: STATUS.RESOLVED }),
				Doubt.countDocuments({ ...base, studentId: req.user._id, status: { $in: [STATUS.OPEN, STATUS.TEACHER_RESPONDED, STATUS.WAITING_FOR_STUDENT] } }),
			]);
			return res.json({ success: true, metrics: { totalDoubts: total, resolvedDoubts: resolved, pendingDoubts: pending } });
		}

		if (req.user.role === 'teacher') {
			const assignedQuery = { ...base, assignedTeachers: req.user._id };
			const [assigned, pending, responded, aggregates] = await Promise.all([
				Doubt.countDocuments(assignedQuery),
				Doubt.countDocuments({ ...assignedQuery, status: { $in: [STATUS.OPEN, STATUS.WAITING_FOR_STUDENT] } }),
				Doubt.countDocuments({ ...assignedQuery, status: { $in: [STATUS.TEACHER_RESPONDED, STATUS.RESOLVED, STATUS.CLOSED] } }),
				Doubt.aggregate([
					{ $match: { ...assignedQuery, firstResponseAt: { $exists: true } } },
					{
						$project: {
							responseMinutes: {
								$divide: [{ $subtract: ['$firstResponseAt', '$createdAt'] }, 1000 * 60],
							},
							resolutionMinutes: {
								$cond: [
									{ $ifNull: ['$resolvedAt', false] },
									{ $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60] },
									null,
								],
							},
						},
					},
					{
						$group: {
							_id: null,
							avgResponseMinutes: { $avg: '$responseMinutes' },
							avgResolutionMinutes: { $avg: '$resolutionMinutes' },
						},
					},
				]),
			]);

			const avgResponseMinutes = aggregates[0]?.avgResponseMinutes || 0;
			const avgResolutionMinutes = aggregates[0]?.avgResolutionMinutes || 0;
			const responseRate = assigned ? Math.round((responded / assigned) * 100) : 0;

			return res.json({
				success: true,
				metrics: {
					assignedDoubts: assigned,
					pendingDoubts: pending,
					responseRate,
					averageResponseTimeMinutes: Number(avgResponseMinutes.toFixed(1)),
					averageResolutionTimeMinutes: Number(avgResolutionMinutes.toFixed(1)),
				},
			});
		}

		const [total, open, resolved, closed, highPriority] = await Promise.all([
			Doubt.countDocuments(base),
			Doubt.countDocuments({ ...base, status: { $in: [STATUS.OPEN, STATUS.TEACHER_RESPONDED, STATUS.WAITING_FOR_STUDENT] } }),
			Doubt.countDocuments({ ...base, status: STATUS.RESOLVED }),
			Doubt.countDocuments({ ...base, status: STATUS.CLOSED }),
			Doubt.countDocuments({ ...base, priority: 'high' }),
		]);

		res.json({ success: true, metrics: { totalDoubts: total, openDoubts: open, resolvedDoubts: resolved, closedDoubts: closed, highPriorityDoubts: highPriority, generatedAt: now } });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const getRetentionSettings = async (req, res) => {
	try {
		const settings = await DoubtSetting.findOne({ key: 'doubt_retention' }).lean();
		res.json({ success: true, retentionDays: settings?.retentionDays || 180 });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const updateRetentionSettings = async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ success: false, message: 'Only admin can update retention.' });
		}

		const retentionDays = parseInt(req.body.retentionDays, 10);
		if (!Number.isFinite(retentionDays) || retentionDays < 30 || retentionDays > 3650) {
			return res.status(400).json({ success: false, message: 'retentionDays must be between 30 and 3650.' });
		}

		await DoubtSetting.findOneAndUpdate(
			{ key: 'doubt_retention' },
			{ retentionDays, updatedBy: req.user._id },
			{ upsert: true, new: true }
		);

		await createAuditLog({ doubtId: null, actor: req.user, action: 'retention_updated', metadata: { retentionDays } });

		res.json({ success: true, retentionDays });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

const exportDoubts = async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ success: false, message: 'Only admin can export reports.' });
		}

		const query = buildDoubtQuery(req.user, req.query);
		const doubts = await Doubt.find(query)
			.populate('studentId', 'name displayName')
			.populate('assignedTeachers', 'name displayName')
			.sort({ createdAt: -1 })
			.limit(2000)
			.lean();

		const format = trimSafe(req.query.format || 'json').toLowerCase();
		if (format === 'csv') {
			const header = ['id', 'title', 'subject', 'priority', 'status', 'student', 'teachers', 'createdAt', 'updatedAt'];
			const rows = doubts.map((d) => [
				d._id,
				JSON.stringify(d.title || ''),
				JSON.stringify(d.subject || ''),
				d.priority,
				d.status,
				JSON.stringify(d.studentId?.displayName || d.studentId?.name || ''),
				JSON.stringify((d.assignedTeachers || []).map((t) => t.displayName || t.name).join('; ')),
				d.createdAt,
				d.updatedAt,
			].join(','));

			const csv = [header.join(','), ...rows].join('\n');
			res.setHeader('Content-Type', 'text/csv');
			res.setHeader('Content-Disposition', `attachment; filename="doubts-export-${Date.now()}.csv"`);
			return res.send(csv);
		}

		return res.json({ success: true, count: doubts.length, doubts });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

module.exports = {
	getTeacherSearch,
	uploadDoubtAttachment,
	createDoubt,
	listDoubts,
	getDoubtDetail,
	addReply,
	updateDoubtStatus,
	reassignTeachers,
	deleteAbusiveContent,
	getDashboardMetrics,
	getRetentionSettings,
	updateRetentionSettings,
	exportDoubts,
};
