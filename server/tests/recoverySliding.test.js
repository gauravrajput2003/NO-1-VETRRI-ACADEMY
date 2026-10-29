const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const { createRecoveryLimiter } = require('../middleware/passwordRecoveryLimits');

// Evaluate the actual update pipeline without a production Mongo connection.
function counterModel() {
  const rows = new Map();
  function evaluate(value, row, vars = {}) {
    if (typeof value === 'string' && value.startsWith('$$')) return vars[value.slice(2)];
    if (typeof value === 'string' && value.startsWith('$')) return row[value.slice(1)];
    if (Array.isArray(value)) return value.map(v => evaluate(v, row, vars));
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    const [op, args] = Object.entries(value)[0], ev = x => evaluate(x, row, vars);
    if (op === '$ifNull') return ev(args[0]) ?? ev(args[1]);
    if (op === '$size') return ev(args).length;
    if (op === '$gt') return ev(args[0]) > ev(args[1]);
    if (op === '$lt') return ev(args[0]) < ev(args[1]);
    if (op === '$concatArrays') return ev(args).flat();
    if (op === '$cond') return ev(args[0]) ? ev(args[1]) : ev(args[2]);
    if (op === '$filter') return ev(args.input).filter(at => evaluate(args.cond, row, { ...vars, [args.as]: at }));
    throw Error('Unsupported test expression ' + op);
  }
  return { rows, async findOneAndUpdate({ _id }, pipeline) {
    assert(Array.isArray(pipeline), 'Limiter must use an atomic sliding pipeline');
    const row = rows.get(_id) || { _id };
    for (const stage of pipeline) Object.assign(row, Object.fromEntries(Object.entries(stage.$set).map(([k, v]) => [k, evaluate(v, row)])));
    rows.set(_id, row); return { ...row };
  } };
}

test('sliding window has no hour-boundary burst and aliases share the user budget', async () => {
  let clock = 3590000; const model = counterModel();
  const limit = createRecoveryLimiter({ RateLimit: model, now: () => clock });
  for (let i = 0; i < 3; i++) assert.equal(await limit({ ip: 'ip-' + i, body: { identifier: i % 2 ? 'student@example.invalid' : '9876543210' } }, 3, 'request', 'same-user'), true);
  clock = 3601000;
  assert.equal(await limit({ ip: 'new', body: { identifier: '+91 98765 43210' } }, 3, 'request', 'same-user'), false);
  clock = 7190001;
  assert.equal(await limit({ ip: 'newer', body: { identifier: 'student@example.invalid' } }, 3, 'request', 'same-user'), true);
  assert([...model.rows.values()].every(row => row.events.length <= 3));
});

test('IP and normalized identifier limits still apply independently', async () => {
  const limit = createRecoveryLimiter({ RateLimit: counterModel() });
  for (let i = 0; i < 3; i++) assert.equal(await limit({ ip: 'ip-' + i, body: { identifier: i ? '+91 98765 43210' : '9876543210' } }), true);
  assert.equal(await limit({ ip: 'new', body: { identifier: '9876543210' } }), false);
  for (let i = 0; i < 3; i++) assert.equal(await limit({ ip: 'shared', body: { identifier: i + '@example.invalid' } }), true);
  assert.equal(await limit({ ip: 'shared', body: { identifier: 'last@example.invalid' } }), false);
});

test('trusted proxy appended client IP survives spoofed XFF hops and shares the budget', async t => {
  const limit = createRecoveryLimiter({ RateLimit: counterModel() });
  const app = express(); app.set('trust proxy', 1);
  app.get('/', async (req, res) => { console.log('[IP fixture] derived=' + req.ip); res.json({ ip: req.ip, allowed: await limit({ ip: req.ip, body: { identifier: req.query.id } }) }); });
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  for (let i = 0; i < 4; i++) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/?id=${i}@example.invalid`, { headers: { 'X-Forwarded-For': `192.0.2.${i + 1}, 203.0.113.${i + 1}, 198.51.100.42` } });
    const body = await response.json(); assert.equal(body.ip, '198.51.100.42'); assert.equal(body.allowed, i < 3);
  }
});
