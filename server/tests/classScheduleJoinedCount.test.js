const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

async function listSchedules({ role = 'admin', schedules = [], counts = [], attendanceError } = {}) {
  const originalLoad = Module._load;
  const controllerPath = require.resolve('../controllers/classController');
  const calls = { aggregates: [], filters: [] };
  const query = {
    select(value) { calls.selection = value; return this; },
    populate() { return this; },
    sort() { return this; },
    limit(value) { calls.limit = value; return this; },
    skip(value) { calls.skip = value; return Promise.resolve(schedules); },
  };
  const classSchedule = {
    find(filter) {
      // Stale-class maintenance has no candidates in these fixtures.
      if (filter.$or || filter.scheduledDate?.$lte) return Promise.resolve([]);
      calls.filters.push(filter);
      return query;
    },
    countDocuments: async () => 60,
  };
  const attendance = {
    aggregate: async (pipeline) => {
      calls.aggregates.push(pipeline);
      if (attendanceError) throw attendanceError;
      return counts;
    },
  };
  Module._load = function (request, parent, isMain) {
    if (parent?.filename === controllerPath) {
      if (request === '../models/ClassSchedule') return classSchedule;
      if (request === '../models/ClassAttendance') return attendance;
      return {};
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[controllerPath];
    const { getSchedules } = require(controllerPath);
    const response = {
      status(code) { this.code = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await getSchedules({ user: { role, _id: 'user-1' }, query: { page: '2', limit: '50' } }, response);
    return { response, calls };
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
}

const schedule = (id) => ({ _id: id, toObject: () => ({ _id: id, title: 'Maths', status: 'completed' }) });

test('admin schedules include joined counts, zero for classes without joins, and preserve pagination', async () => {
  const { response, calls } = await listSchedules({
    schedules: [schedule('class-1'), schedule('class-2')],
    counts: [{ _id: 'class-1', studentsJoined: 7 }],
  });
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.schedules.map((item) => item.studentsJoined), [7, 0]);
  assert.equal(response.body.schedules[0].title, 'Maths');
  assert.equal(response.body.total, 60);
  assert.equal(response.body.page, 2);
  assert.equal(calls.limit, 50);
  assert.equal(calls.skip, 50);
  assert.equal(calls.selection, '-meetLink');
  // Only actual joins on the requested page count; assigned/manual attendance
  // without a join timestamp is excluded, regardless of attendance status.
  assert.deepEqual(calls.aggregates[0][0].$match, {
    classId: { $in: ['class-1', 'class-2'] }, joinTime: { $type: 'date' },
  });
});

test('an empty schedule page needs no attendance query', async () => {
  const { response, calls } = await listSchedules();
  assert.deepEqual(response.body.schedules, []);
  assert.equal(calls.aggregates.length, 0);
});

test('teacher and student schedule access stays filtered and does not query admin counts', async () => {
  for (const role of ['teacher', 'student']) {
    const { response, calls } = await listSchedules({ role, schedules: [schedule('class-1')] });
    assert.equal(response.body.success, true);
    assert.equal(calls.aggregates.length, 0);
    assert.deepEqual(calls.filters, [role === 'teacher' ? { teacherId: 'user-1' } : { studentIds: 'user-1' }]);
  }
});

test('attendance query errors are reported instead of showing false zero counts', async () => {
  const { response } = await listSchedules({ schedules: [schedule('class-1')], attendanceError: new Error('Attendance unavailable') });
  assert.equal(response.code, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Attendance unavailable');
});
