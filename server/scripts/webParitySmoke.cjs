// Runs only against the labelled accounts created by webParityFixtures.cjs.
// Start webParityServer.cjs first so notifications cannot reach real users.
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const fixtureFile = path.join(require('node:os').tmpdir(), 'vettri-web-parity-fixtures.json');
const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
const base = 'http://127.0.0.1:5000/api';
const results = [], sessions = {};
const save = () => fs.writeFileSync(fixtureFile, JSON.stringify(fixture), { mode: 0o600 });
async function request(session, method, url, body, expected = 200) {
  const multipart = body instanceof FormData;
  const response = await fetch(base + url, { method, headers: { ...(multipart ? {} : { 'Content-Type': 'application/json' }), ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, expected, `${method} ${url}: ${response.status} ${data.message || ''}`);
  return data;
}
async function step(name, action) { if (process.env.PARITY_GROUP && !name.includes(process.env.PARITY_GROUP)) return; try { await action(); results.push({ name, passed: true }); console.log(`PASS ${name}`); } catch (error) { results.push({ name, passed: false, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); } }
const formFile = (bytes, filename, mime) => { const form = new FormData(); form.append('file', new Blob([bytes], { type: mime }), filename); return form; };
async function upload(session, bytes, filename, purpose = 'material') {
  const params = await request(session, 'POST', '/storage/direct-upload/params', { uploadId: crypto.randomUUID(), filename, mimetype: 'application/pdf', size: bytes.length, purpose });
  const form = formFile(bytes, filename, 'application/pdf');
  for (const [key, value] of Object.entries({ api_key: params.apiKey, timestamp: params.timestamp, signature: params.signature, folder: params.folder, public_id: params.publicId, overwrite: false })) form.append(key, String(value));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/${params.resourceType}/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(90000) });
  const asset = await response.json(); assert.equal(response.status, 200, asset.error?.message || 'Cloud upload failed');
  fixture.uploads = [...(fixture.uploads || []), { publicId: asset.public_id, resourceType: params.resourceType }]; save();
  return params.uploadToken;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const User = require('../models/User');
  for (const account of Object.values(fixture.accounts)) {
    const user = await User.findById(account.id);
    assert.ok(user?.name.startsWith(`[WEB PARITY TEST ${fixture.run}]`), 'Refusing to test an unlabelled account');
  }
  await User.updateOne({ _id: fixture.accounts.outsider.id }, { $set: { grade: `${fixture.grade}_OTHER` } });
  if (!process.env.PARITY_GROUP) {
    await require('../models/SalaryTransaction').deleteMany({ teacherId: fixture.accounts.teacher.id });
    await User.updateOne({ _id: fixture.accounts.teacher.id }, { $set: { salaryHistory: [] } });
    await require('../models/FeesRecord').deleteMany({ student: fixture.accounts.student.id });
  }
  for (const [role, account] of Object.entries(fixture.accounts)) sessions[role] = await request(null, 'POST', `/auth/login/${role === 'outsider' ? 'student' : role}`, { identifier: account.identifier, password: account.password });
  await step('admin account edits and teacher permissions persist without changing credentials', async () => {
    const student = fixture.accounts.student.id, teacher = fixture.accounts.teacher.id;
    const changed = await request(sessions.admin, 'PUT', `/admin/students/${student}`, { name: `[WEB PARITY TEST ${fixture.run}] student`, assignedTeachers: [teacher], password: '' });
    assert.equal(changed.passwordUpdated, false);
    assert.equal(String(changed.student.assignedTeachers[0]._id), teacher);
    await request(sessions.admin, 'PUT', `/admin/teachers/${teacher}`, { qualification: 'WEB PARITY TEST qualification', password: '' });
    await request(sessions.admin, 'PATCH', `/profile/permissions/teacher/${teacher}`, { canShareFiles: true, canSendMessages: true, canAccessStudentList: true, canUploadMaterials: true });
    assert.equal((await request(sessions.teacher, 'GET', `/profile/permissions/teacher/${teacher}`)).permissions.canUploadMaterials, true);
    await request(sessions.student, 'PUT', `/admin/students/${student}`, { name: 'Forbidden' }, 403);
    for (const role of ['student', 'teacher']) await request(null, 'POST', `/auth/login/${role}`, { identifier: fixture.accounts[role].identifier, password: fixture.accounts[role].password });
  });
  await step('candidate backend permits the real HTTPS website origins through CORS', async () => {
    for (const origin of ['https://no1vettriacademy.in', 'https://www.no1vettriacademy.in']) {
      const response = await fetch(base + '/notifications/browser-push/config', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
    }
  });
  await step('same credentials retain simultaneous phone/laptop refresh sessions', async () => {
    const account = fixture.accounts.student;
    const laptop = await request(null, 'POST', '/auth/login/student', { identifier: account.identifier, password: account.password });
    await request(null, 'POST', '/auth/refresh', { refreshToken: sessions.student.refreshToken });
    await request(null, 'POST', '/auth/refresh', { refreshToken: laptop.refreshToken });
    await request(laptop, 'POST', '/auth/logout', {});
    await request(null, 'POST', '/auth/refresh', { refreshToken: laptop.refreshToken }, 401);
    await request(null, 'POST', '/auth/refresh', { refreshToken: sessions.student.refreshToken });
  });
  await step('profile saves permitted fields and refuses student identity changes', async () => {
    await request(sessions.student, 'PATCH', '/profile', { bio: 'WEB PARITY TEST bio' });
    assert.equal((await request(sessions.student, 'GET', '/profile')).profile.bio, 'WEB PARITY TEST bio');
    await request(sessions.student, 'PATCH', '/profile', { name: 'Forbidden change' }, 403);
  });
  await step('teacher class creation is visible to assigned mobile/web student only', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const clock = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    const data = await request(sessions.teacher, 'POST', '/classes/schedule', { title: `[WEB PARITY TEST ${fixture.run}] class`, course: 'CBSE', board: 'CBSE', grade: fixture.grade, subject: 'Mathematics', studentIds: [fixture.accounts.student.id], scheduledDate: `${today}T00:00:00+05:30`, scheduledTime: clock, durationMinutes: 60, googleMeetLink: 'https://meet.google.com/lookup/web-parity-test', repeatType: 'once' }, 201);
    fixture.classId = data.schedule?._id || data.class?._id; assert.ok(fixture.classId); save();
    await request(sessions.student, 'GET', `/classes/${fixture.classId}/details`);
    await request(sessions.outsider, 'GET', `/classes/${fixture.classId}/details`, undefined, 403);
    await request(sessions.student, 'GET', `/classes/${fixture.classId}/attendance`, undefined, 403);
  });
  await step('teacher starts class, student joins, and attendance persists once', async () => {
    assert.ok(fixture.classId);
    await request(sessions.teacher, 'POST', `/classes/${fixture.classId}/go-live`, {});
    const joined = await request(sessions.student, 'POST', `/classes/${fixture.classId}/join`, {});
    assert.ok(joined.meetLink || joined.class?.meetLink);
    await request(sessions.student, 'POST', `/classes/${fixture.classId}/join`, {});
    const attendance = await request(sessions.teacher, 'GET', `/classes/${fixture.classId}/attendance`);
    assert.equal(attendance.attendance.filter((record) => String(record.studentId._id) === fixture.accounts.student.id).length, 1);
    await request(sessions.teacher, 'POST', `/classes/${fixture.classId}/end`, {});
  });
  await step('attendance APIs enforce own/assigned-user boundaries', async () => {
    await request(sessions.student, 'GET', `/attendance/student/${fixture.accounts.student.id}/class`);
    await request(sessions.outsider, 'GET', `/attendance/student/${fixture.accounts.student.id}/class`, undefined, 403);
  });
  const pdf = await new Promise((resolve) => { const PDF = require('pdfkit'); const doc = new PDF(); const parts = []; doc.on('data', (part) => parts.push(part)); doc.on('end', () => resolve(Buffer.concat(parts))); doc.text('WEB PARITY TEST: isolated PDF'); doc.addPage().text('Second test page'); doc.end(); });
  fs.writeFileSync(path.join(require('node:os').tmpdir(), 'vettri-web-parity.pdf'), pdf);
  await step('signed material upload, approval and duplicate confirmation share one record', async () => {
    const token = await upload(sessions.teacher, pdf, `web-parity-${fixture.run}.pdf`);
    const body = { uploadToken: token, title: `[WEB PARITY TEST ${fixture.run}] material`, subject: 'Mathematics', grade: fixture.grade, lockedForAll: false };
    const saved = await request(sessions.teacher, 'POST', '/storage/direct-upload/confirm', body, 201); fixture.materialId = saved.material._id; save();
    assert.equal((await request(sessions.teacher, 'POST', '/storage/direct-upload/confirm', body)).material._id, fixture.materialId);
    await request(sessions.student, 'GET', `/pdf/signed-url/${fixture.materialId}`, undefined, 403);
    await request(sessions.admin, 'POST', `/admin/materials/${fixture.materialId}/approve`, {});
    assert.ok((await request(sessions.student, 'GET', `/student/materials/${fixture.materialId}/view`)).url);
  });
  await step('material metadata edits and replacements wait for admin approval', async () => {
    assert.ok(fixture.materialId);
    await request(sessions.teacher, 'PUT', `/teacher/materials/${fixture.materialId}`, { title: `[WEB PARITY TEST ${fixture.run}] edited material` });
    await request(sessions.admin, 'POST', `/admin/materials/${fixture.materialId}/approve`, {});
    const token = await upload(sessions.teacher, pdf, `web-parity-${fixture.run}-replacement.pdf`);
    await request(sessions.teacher, 'POST', '/storage/direct-upload/confirm', { uploadToken: token, materialId: fixture.materialId, title: `[WEB PARITY TEST ${fixture.run}] replaced material` });
    await request(sessions.admin, 'POST', `/admin/materials/${fixture.materialId}/approve`, {});
    const material = await require('../models/StudyMaterial').findById(fixture.materialId); assert.match(material.originalFilename, /replacement/);
    await request(sessions.outsider, 'GET', `/storage/download-url/${fixture.materialId}`, undefined, 403);
  });
  await step('PDF page, bookmark and note records are shared across browser/mobile sessions', async () => {
    assert.ok(fixture.materialId);
    await request(sessions.student, 'POST', '/pdf/progress', { materialId: fixture.materialId, lastPage: 2, totalPages: 2 });
    await request(sessions.student, 'POST', '/pdf/bookmarks', { materialId: fixture.materialId, pageNumber: 2 }, 201);
    await request(sessions.student, 'POST', '/pdf/notes', { materialId: fixture.materialId, pageNumber: 2, noteText: 'WEB PARITY TEST note' }, 201);
    assert.equal((await request(sessions.student, 'GET', `/pdf/progress/${fixture.materialId}`)).progress.lastPage, 2);
    const account = fixture.accounts.student; const mobile = await request(null, 'POST', '/auth/login/student', { identifier: account.identifier, password: account.password });
    assert.equal((await request(mobile, 'GET', `/pdf/bookmarks/${fixture.materialId}`)).bookmarks[0].pageNumber, 2);
    assert.equal((await request(mobile, 'GET', `/pdf/notes/${fixture.materialId}`)).notes[0].noteText, 'WEB PARITY TEST note');
  });
  await step('salary configuration, partial payment, correction and teacher slip agree', async () => {
    await request(sessions.admin, 'POST', `/admin/teacher/${fixture.accounts.teacher.id}/salary-config`, { baseSalary: 1000 });
    const record = await request(sessions.admin, 'POST', '/admin/salary/process', { teacherId: fixture.accounts.teacher.id, month: 'October', year: 2026, payingAmount: 400, paymentMethod: 'Cash', notes: 'WEB PARITY TEST only' }, 201);
    fixture.salaryId = record.transaction._id; save(); assert.equal(record.transaction.paidAmount, 400);
    await request(sessions.admin, 'PATCH', `/admin/salary/${fixture.salaryId}/payment/${record.transaction.payments[0]._id}`, { amount: 500 });
    const salary = await request(sessions.teacher, 'GET', '/teacher/salary/current-month'); assert.equal(salary.salary.paidAmount, 500);
    const slip = await request(sessions.teacher, 'GET', `/teacher/salary/${fixture.accounts.teacher.id}/October%202026/slip`); assert.ok(slip.length > 100);
  });
  await step('fee records are visible to the same student and generate notifications', async () => {
    await request(sessions.admin, 'POST', '/admin/fees/record-payment', { studentId: fixture.accounts.student.id, amount: 100, month: 'October', year: 2026, status: 'paid', paymentMethod: 'cash', remarks: 'WEB PARITY TEST only' }, 201);
    assert.ok((await request(sessions.student, 'GET', '/student/fees')).fees.some((record) => record.amount === 100));
  });
  await step('academic discussion replies, status and permissions agree', async () => {
    const doubt = await request(sessions.student, 'POST', '/doubts', { title: 'Algebra test question', description: 'Please explain this isolated test problem.', assignedTeachers: [fixture.accounts.teacher.id] }, 201);
    fixture.doubtId = doubt.doubt._id; save();
    await request(sessions.teacher, 'POST', `/doubts/${fixture.doubtId}/replies`, { message: 'Test explanation from teacher.' }, 201);
    await request(sessions.outsider, 'GET', `/doubts/${fixture.doubtId}`, undefined, 403);
    assert.equal((await request(sessions.student, 'GET', `/doubts/${fixture.doubtId}`)).replies.length, 1);
    await request(sessions.student, 'PATCH', `/doubts/${fixture.doubtId}/status`, { status: 'resolved' });
  });
  await step('admin chat persists, reads and rejects unrelated student access', async () => {
    await request(sessions.admin, 'POST', '/chat/send', { receiverId: fixture.accounts.student.id, message: 'WEB PARITY TEST chat' }, 201);
    const key = [fixture.accounts.admin.id, fixture.accounts.student.id].sort().join('_');
    assert.ok((await request(sessions.student, 'GET', `/chat/messages/${key}`)).messages.some((record) => record.message === 'WEB PARITY TEST chat'));
    await request(sessions.student, 'PATCH', `/chat/read/${key}`, {});
    await request(sessions.outsider, 'GET', `/chat/messages/${key}`, undefined, 403);
  });
  await step('targeted announcement inbox and read receipts persist', async () => {
    const data = await request(sessions.admin, 'POST', '/announcements', { title: `[WEB PARITY TEST ${fixture.run}] announcement`, content: 'Isolated browser/mobile acceptance notice.', targetRole: 'student', targetGrade: fixture.grade }, 201);
    fixture.announcementId = data.announcement._id; save();
    assert.ok((await request(sessions.student, 'GET', '/announcements/active?includeRead=true')).announcements.some((item) => item._id === fixture.announcementId));
    await request(sessions.student, 'POST', `/announcements/${fixture.announcementId}/read`, {});
  });
  await step('ordinary updates reach the shared mobile/web notification inbox', async () => {
    const data = await request(sessions.student, 'GET', '/notifications?limit=100');
    assert.ok(data.notifications.some((item) => item.type === 'fee_paid'));
    assert.ok(data.notifications.some((item) => item.type === 'study_material'));
    assert.ok(data.notifications.some((item) => item.type === 'class_starting'));
  });
  await step('browser push configuration and authenticated rollout diagnostics load', async () => {
    const data = await request(sessions.student, 'GET', '/notifications/browser-push/config'); assert.equal(typeof data.enabled, 'boolean');
    await request(sessions.student, 'POST', '/notifications/browser-push/subscribe', { endpoint: 'http://127.0.0.1/private' }, 400);
    await request(sessions.admin, 'GET', '/admin/socket-rollout');
  });
  await step('exam paper upload, student answer submission and grading use real MongoDB transactions', async () => {
    const now = Date.now();
    const data = await request(sessions.teacher, 'POST', '/exams', { title: `[WEB PARITY TEST ${fixture.run}] exam`, subject: 'Mathematics', grade: fixture.grade, board: 'CBSE', maxMarks: 100,
      paperDueAt: new Date(now + 60000).toISOString(), startsAt: new Date(now + 120000).toISOString(), submissionsDueAt: new Date(now + 3600000).toISOString(), gradingDueAt: new Date(now + 7200000).toISOString(), studentIds: [fixture.accounts.student.id] }, 201);
    fixture.examId = data.exam._id; save();
    const paperToken = await upload(sessions.teacher, pdf, `web-parity-${fixture.run}-paper.pdf`, 'exam');
    await request(sessions.teacher, 'POST', `/exams/${fixture.examId}/publish`, { paperToken });
    // Advance only this labelled fixture's start time so the test needs no clock wait.
    await require('../models/Exam').updateOne({ _id: fixture.examId, createdBy: fixture.accounts.teacher.id }, { $set: { startsAt: new Date(Date.now() - 1000) } });
    const answer = await upload(sessions.student, pdf, `web-parity-${fixture.run}-answer.pdf`, 'exam');
    const submitted = await request(sessions.student, 'POST', `/exams/${fixture.examId}/submit`, { answerTokens: [answer], note: 'WEB PARITY TEST answer' }, 201);
    await request(sessions.teacher, 'PUT', `/exams/${fixture.examId}/submissions/${submitted.submission._id}/grade`, { marks: 85, feedback: 'WEB PARITY TEST feedback' });
    assert.equal((await request(sessions.student, 'GET', `/exams/${fixture.examId}`)).submissions[0].marksObtained, 85);
    await request(sessions.outsider, 'GET', `/exams/${fixture.examId}`, undefined, 404);
  });
  await step('teacher leave approval and compensation completion stay in sync', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const data = await request(sessions.teacher, 'POST', '/teacher/leave', { leaveType: 'personal', fromDate: today, toDate: today, reason: 'WEB PARITY TEST leave', compensationClassDate: today }, 201);
    fixture.leaveId = data.leave._id; save();
    await request(sessions.admin, 'PUT', `/admin/leaves/${fixture.leaveId}`, { status: 'approved' });
    await request(sessions.teacher, 'PATCH', `/teacher/leaves/${fixture.leaveId}/compensation/status`, { status: 'completed_by_teacher' });
    await request(sessions.admin, 'PATCH', `/admin/leaves/${fixture.leaveId}/compensation/status`, { status: 'approved_by_admin' });
    assert.equal((await request(sessions.teacher, 'GET', '/teacher/leave')).leaves.find((item) => item._id === fixture.leaveId).compensationStatus, 'approved_by_admin');
  });
  await step('support submission and admin reply are visible to the same student', async () => {
    const data = await request(sessions.student, 'POST', '/support/tickets', { category: 'technical_app', subject: 'WEB PARITY TEST support', description: 'Isolated acceptance query.' }, 201);
    fixture.ticketId = data.ticket._id; save();
    await request(sessions.admin, 'PATCH', `/support/admin/tickets/${fixture.ticketId}`, { adminReply: 'WEB PARITY TEST reply', status: 'resolved' });
    const detail = await request(sessions.student, 'GET', `/support/tickets/${fixture.ticketId}`); assert.equal(detail.ticket.adminReply, 'WEB PARITY TEST reply');
    await request(sessions.outsider, 'GET', `/support/tickets/${fixture.ticketId}`, undefined, 403);
  });
  await step('training watch progress and completion are shared with the mobile API', async () => {
    const created = await request(sessions.admin, 'POST', '/training-videos/url', { title: `[WEB PARITY TEST ${fixture.run}] training`, videoUrl: 'https://res.cloudinary.com/demo/video/upload/dog.mp4', duration: 13, isMandatory: false, targetAudience: 'student' }, 201);
    const video = created.video; fixture.trainingId = video._id; fixture.ownedTrainingIds = [...(fixture.ownedTrainingIds || []), video._id]; save();
    await request(sessions.student, 'PATCH', `/training-videos/${video._id}/progress`, { watchDuration: 10, currentPosition: 8 });
    await request(sessions.student, 'PATCH', `/training-videos/${video._id}/complete`, { watchDuration: video.duration || 10 });
    assert.equal((await request(sessions.student, 'GET', '/training-videos')).videos.find((item) => item._id === video._id).progress.isCompleted, true);
  });
  await step('updated JWT sockets and legacy mobile sockets coexist; forged JWTs are rejected', async () => {
    const { io } = require('../../client/node_modules/socket.io-client');
    const connect = (auth) => new Promise((resolve, reject) => {
      const socket = io('http://127.0.0.1:5000', { auth, transports: ['websocket'], reconnection: false, timeout: 10000 });
      socket.once('connect', () => resolve(socket)); socket.once('connect_error', (error) => { socket.disconnect(); reject(error); });
    });
    const modern = await connect({ token: sessions.student.token });
    modern.emit('user:join', { userId: fixture.accounts.student.id, role: 'student' });
    const legacy = await connect({}); legacy.disconnect();
    await assert.rejects(connect({ token: 'forged-token' }), /Authentication failed/);
    const delivery = new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Test socket notification not received')), 10000); modern.once('notification:new', (payload) => { clearTimeout(timeout); resolve(payload); }); });
    await request(sessions.admin, 'POST', '/chat/send', { receiverId: fixture.accounts.student.id, message: 'WEB PARITY TEST socket delivery' }, 201);
    await delivery; modern.disconnect();
  });
  await step('strict socket rollout rejects legacy handshakes while accepting JWT mobile/web clients', async () => {
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, [path.join(__dirname, 'webParityServer.cjs')], { windowsHide: true, env: { ...process.env, PORT: '5001', SOCKET_REQUIRE_AUTH: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Strict socket test server startup timed out')), 45000);
        child.stdout.on('data', (bytes) => { if (bytes.toString().includes('Server running')) { clearTimeout(timer); resolve(); } });
        child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Strict socket server exited: ${code}`)); });
      });
      const { io } = require('../../client/node_modules/socket.io-client');
      const connect = (auth) => new Promise((resolve, reject) => { const socket = io('http://127.0.0.1:5001', { auth, transports: ['websocket'], reconnection: false, timeout: 10000 }); socket.once('connect', () => resolve(socket)); socket.once('connect_error', (error) => { socket.disconnect(); reject(error); }); });
      await assert.rejects(connect({}), /Authentication required/);
      const valid = await connect({ token: sessions.student.token }); valid.disconnect();
    } finally { child.kill(); }
  });
  await mongoose.disconnect();
  const target = path.resolve(__dirname, '../../docs/WEB_PARITY_API_RESULTS.json');
  if (process.env.PARITY_GROUP && fs.existsSync(target)) {
    const previous = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (previous.run === fixture.run) for (const record of previous.results) if (!results.some((entry) => entry.name === record.name)) results.push(record);
  }
  fs.writeFileSync(target, JSON.stringify({ date: new Date().toISOString(), run: fixture.run, database: 'existing app database, isolated labelled fixtures', results }, null, 2));
  console.log(`${results.filter((result) => result.passed).length}/${results.length} acceptance groups passed`);
  if (results.some((result) => !result.passed)) process.exitCode = 1;
})().catch(async (error) => { console.error('Acceptance run failed:', error.message); await mongoose.disconnect(); process.exitCode = 1; });
