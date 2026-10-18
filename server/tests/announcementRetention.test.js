const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { RETENTION_SECONDS, retentionCutoff, announcementExpiry } = require('../utils/announcementRetention');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
function load(file, deps) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { module, require: key => deps[key], Date, console, process: { env: {} } });
  return module.exports;
}
const retention = { RETENTION_SECONDS, retentionCutoff, announcementExpiry };
function harness() {
  const calls = [], notice = { _id: 'notice-1', title: 'Homework reminder', createdAt: new Date(), toObject() { return { _id: this._id, title: this.title, createdAt: this.createdAt }; } };
  const Announcement = {
    create: async body => { calls.push(['create', body]); return { ...notice, ...body }; },
    find: filter => { calls.push(['find', filter]); return { populate() { return this; }, sort: async () => [notice] }; },
    findOne: async filter => { calls.push(['findOne', filter]); return notice; },
    findOneAndUpdate: async (...args) => { calls.push(['update', ...args]); return notice; },
  };
  const Read = { find: async () => [{ announcementId: 'notice-1' }], findOneAndUpdate: async (...args) => calls.push(['read', ...args]) };
  const controller = load('controllers/announcementController.js', {
    '../models/Announcement': Announcement, '../models/AnnouncementRead': Read,
    '../models/User': { find: () => ({ select: () => ({ lean: async () => [] }) }) },
    '../models/Course': { findById: () => ({ select: () => ({ lean: async () => ({ title: 'Science', category: 'State Board' }) }) }) },
    '../services/notificationService': {}, '../utils/announcementRetention': retention,
  });
  return { controller, calls, Announcement, notice };
}

test('announcements and read receipts have seven-day MongoDB TTL indexes', () => {
  for (const name of ['Announcement', 'AnnouncementRead']) {
    const model = require(`../models/${name}`);
    const ttl = model.schema.indexes().find(([keys, options]) => keys.createdAt === 1 && options.expireAfterSeconds === RETENTION_SECONDS);
    assert.ok(ttl, `${name} must expire in MongoDB without a running app server`);
  }
  const now = new Date('2026-10-18T10:00:00Z');
  assert.equal(announcementExpiry(now).toISOString(), '2026-10-25T10:00:00.000Z');
  assert.equal(retentionCutoff(now).toISOString(), '2026-10-11T10:00:00.000Z');
});

test('creation enforces seven days even if a client asks for earlier or later expiry', async () => {
  for (const expiresAt of ['2026-01-01', '2099-01-01', null]) {
    const { controller, calls } = harness(), res = response(), before = Date.now();
    await controller.createAnnouncement({ body: { title: 'Test', content: 'Content', expiresAt }, user: { _id: 'admin' }, app: { get: () => null } }, res);
    assert.equal(res.code, 201);
    const created = calls.find(c => c[0] === 'create')[1];
    assert.ok(+created.expiresAt >= before + RETENTION_SECONDS * 1000);
    assert.ok(+created.expiresAt <= Date.now() + RETENTION_SECONDS * 1000);
  }
});

test('inbox includes read announcements while popup remains unread-only and audience stays scoped', async () => {
  const { controller, calls } = harness();
  for (const includeRead of [undefined, 'true']) {
    const res = response();
    await controller.getActiveAnnouncements({ user: { _id: 's1', role: 'student', grade: '8th', course: 'course1' }, query: { includeRead } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.announcements.length, includeRead ? 1 : 0);
    if (includeRead) assert.equal(res.body.announcements[0].isRead, true);
    const filter = calls.filter(c => c[0] === 'find').at(-1)[1];
    assert.deepEqual(Array.from(filter.targetRole.$in), ['all', 'student']);
    assert.ok(filter.createdAt.$gt >= retentionCutoff(new Date(Date.now() - 1000)));
    assert.ok(filter.$and[0].targetCourse.$in.includes('course1'));
    assert.ok(filter.$and[0].targetCourse.$in.includes('Matric'));
    assert.deepEqual(Array.from(filter.$and[1].targetGrade.$in), [null, '', 'all', '8th']);
  }
});

test('expired or unauthorized announcements cannot accumulate new read receipts', async () => {
  const { controller, calls, Announcement } = harness();
  Announcement.findOne = async () => null;
  const res = response();
  await controller.markAsRead({ params: { id: 'expired' }, user: { _id: 't1', role: 'teacher' } }, res);
  assert.equal(res.code, 404); assert.equal(calls.some(c => c[0] === 'read'), false);
});

test('editing a notice cannot extend retention or change its author/creation timestamp', async () => {
  const { controller, calls } = harness(), res = response();
  await controller.updateAnnouncement({ params: { id: 'notice-1' }, body: { title: 'Corrected', expiresAt: '2099-01-01', createdAt: '2099-01-01', postedBy: 'forged', unexpected: true } }, res);
  assert.equal(res.code, 200);
  const [, filter, update] = calls.find(c => c[0] === 'update');
  assert.deepEqual(Object.keys(update), ['title']);
  assert.ok(filter.createdAt.$gt instanceof Date);
});

test('cleanup removes expired notices and orphan read receipts, leaving other data alone', async () => {
  const calls = [], now = new Date('2026-10-18T10:00:00Z');
  const job = load('jobs/announcementRetention.js', {
    'node-cron': {}, '../utils/announcementRetention': retention,
    '../models/Announcement': { collection: { name: 'announcements' }, deleteMany: async filter => calls.push(['notice', filter]) },
    '../models/AnnouncementRead': { aggregate: async pipeline => { calls.push(['aggregate', pipeline]); return [{ _id: 'orphan' }]; }, deleteMany: async filter => calls.push(['reads', filter]) },
  });
  await job.purgeExpiredAnnouncements(now);
  assert.equal(calls[0][1].createdAt.$lte.toISOString(), '2026-10-11T10:00:00.000Z');
  assert.equal(calls[1][1][0].$lookup.from, 'announcements');
  assert.equal(calls[1][1][1].$match.announcement.$size, 0);
  assert.deepEqual(Array.from(calls[2][1]._id.$in), ['orphan']);
});

test('announcement taps target the Home inbox even when notifications were opened from another tab', () => {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../../VettriAcademy/src/utils/notificationNavigation.js'), 'utf8').replaceAll('export const ', 'const ');
  vm.runInNewContext(source + '\nmodule.exports = resolveNotificationTarget;', { module, __DEV__: false });
  for (const role of ['student', 'teacher']) {
    const target = module.exports({ data: { type: 'announcement', announcementId: 'notice-1' } }, role);
    assert.equal(target.screen, 'Home'); assert.equal(target.params.screen, 'Announcements');
  }
});
