import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadWithRecovery, retryUploadOperation, UPLOAD_CHUNK_SIZE as CHUNK } from '../src/services/cloudinaryUploadCore.js';

const clone = (value) => structuredClone(value);
function fixture(overrides = {}) {
  let stored;
  const calls = [], signatures = [];
  const options = {
    file: { name: 'lesson.mp4', mimeType: 'video/mp4', size: CHUNK * 2 + 10 },
    load: async () => stored && clone(stored),
    save: async (value) => { stored = clone(value); },
    sign: async (id) => { signatures.push(id); return { timestamp: 100, resourceType: 'video', uploadToken: 'signed' }; },
    readPart: async (start, end) => ({ start, end }),
    sendPart: async (part) => {
      calls.push(part);
      return part.end === part.size ? { secure_url: 'https://cloud/lesson.mp4', public_id: 'lesson', bytes: part.size, done: true } : { done: false };
    },
    wait: async () => {}, now: () => 100000,
    ...overrides,
  };
  return { options, calls, signatures, stored: () => stored };
}

test('large uploads use bounded chunks and a consistent stream ID', async () => {
  const f = fixture();
  const result = await uploadWithRecovery(f.options);
  assert.deepEqual(f.calls.map(({ start, end }) => [start, end]), [[0, CHUNK], [CHUNK, CHUNK * 2], [CHUNK * 2, CHUNK * 2 + 10]]);
  assert.equal(new Set(f.calls.map((p) => p.chunkUploadId)).size, 1);
  assert.equal(result.uploadToken, 'signed');
  assert.equal(f.stored().offset, f.options.file.size);
});

test('network retries resend the same chunk and exhausted retries preserve acknowledged progress', async () => {
  const f = fixture();
  const normal = f.options.sendPart;
  let failures = 0;
  f.options.sendPart = async (part) => {
    if (part.start === CHUNK && failures++ < 4) throw new Error('offline');
    return normal(part);
  };
  await assert.rejects(uploadWithRecovery(f.options), /offline/);
  assert.equal(failures, 4);
  assert.equal(f.stored().offset, CHUNK);
  await uploadWithRecovery(f.options);
  assert.deepEqual(f.calls.map((p) => p.start), [0, CHUNK, CHUNK * 2]);
  assert.equal(f.signatures.length, 1);
});

test('a completed cloud file is reused when metadata saving needs another attempt', async () => {
  const f = fixture();
  const first = await uploadWithRecovery(f.options);
  f.options.sendPart = () => { throw Error('must not upload again'); };
  const second = await uploadWithRecovery(f.options);
  assert.deepEqual(second, first);
});

test('an incomplete final response never marks a file completed', async () => {
  const f = fixture({ sendPart: async () => ({ done: false }) });
  await assert.rejects(uploadWithRecovery(f.options), /not confirmed/);
  assert.equal(f.stored().offset, CHUNK * 2);
  assert.equal(f.stored().result, undefined);
});

test('expired cloud chunk streams restart once with a new stream ID and the original asset ID', async () => {
  const f = fixture();
  const normal = f.options.sendPart;
  let failed = false;
  f.options.sendPart = async (part) => {
    if (part.start === CHUNK && !failed) { failed = true; throw Object.assign(new Error('chunk upload expired'), { status: 400 }); }
    return normal(part);
  };
  await uploadWithRecovery(f.options);
  assert.deepEqual(f.calls.map((p) => p.start), [0, 0, CHUNK, CHUNK * 2]);
  assert.notEqual(f.calls[0].chunkUploadId, f.calls[1].chunkUploadId);
  assert.equal(f.signatures.length, 1);
});

test('expired signatures refresh during a long upload without changing its asset ID', async () => {
  let clock = 100000;
  const f = fixture({ now: () => clock });
  const normal = f.options.sendPart;
  f.options.sendPart = async (part) => { const result = await normal(part); clock += 46 * 60000; return result; };
  f.options.sign = async (id) => { f.signatures.push(id); return { timestamp: clock / 1000, resourceType: 'video', uploadToken: 'signed' }; };
  await uploadWithRecovery(f.options);
  assert.equal(f.signatures.length, 3);
  assert.equal(new Set(f.signatures).size, 1);
});

test('rate limits retry with backoff; permanent authorization/quota errors stop immediately', async () => {
  const delays = [];
  let calls = 0;
  await retryUploadOperation(async () => { if (++calls < 4) throw Object.assign(Error('busy'), { status: 429 }); }, { wait: async (ms) => delays.push(ms) });
  assert.deepEqual(delays, [1000, 2000, 4000]);
  calls = 0;
  await assert.rejects(retryUploadOperation(async () => { calls++; throw Object.assign(Error('quota'), { status: 403 }); }), /quota/);
  assert.equal(calls, 1);
});
