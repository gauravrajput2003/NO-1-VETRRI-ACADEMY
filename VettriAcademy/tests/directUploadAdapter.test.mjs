import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { uploadWithRecovery, retryUploadOperation, UPLOAD_CHUNK_SIZE } from '../src/services/cloudinaryUploadCore.js';

test('native adapter reads bounded chunks and retries metadata without uploading the file again', async () => {
  const reads = [], requests = [], saved = new Map();
  let confirms = 0, handlesClosed = 0, failSaving = true;
  const size = UPLOAD_CHUNK_SIZE + 5;
  class PhoneFile {
    constructor(...args) { this.source = args.length === 1; this.uri = args.join('/'); this.exists = this.source; this.size = size; }
    open() { return { offset: 0, readBytes(length) { reads.push([this.offset, length]); return new Uint8Array(length); }, close() { handlesClosed++; } }; }
    create() { this.exists = true; }
    write(bytes) { assert.ok(bytes.length <= UPLOAD_CHUNK_SIZE); }
    delete() { this.exists = false; }
    slice() { throw Error('whole-file reads are forbidden'); }
  }
  class UploadForm { constructor() { this.parts = {}; } append(key, value) { this.parts[key] = value; } }
  class XHR {
    constructor() { this.headers = {}; this.upload = {}; }
    open(method, url) { this.url = url; }
    setRequestHeader(key, value) { this.headers[key] = value; }
    send(form) {
      requests.push({ headers: this.headers, parts: form.parts, url: this.url });
      this.status = 200;
      this.responseText = JSON.stringify(this.headers['Content-Range'].endsWith(`-${size - 1}/${size}`)
        ? { secure_url: 'https://cloud/file.mp4', public_id: 'file', bytes: size, done: true } : { done: false });
      this.onload();
    }
  }
  const source = fs.readFileSync(new URL('../src/services/directCloudinaryUpload.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replaceAll('export async function', 'async function');
  const context = vm.createContext({
    Platform: { OS: 'android' }, File: PhoneFile, Paths: { cache: 'cache' }, FormData: UploadForm, XMLHttpRequest: XHR,
    AsyncStorage: { getItem: async (key) => saved.get(key) || null, setItem: async (key, value) => saved.set(key, value), removeItem: async (key) => saved.delete(key) },
    getDirectUploadParamsAPI: async () => ({ data: { success: true, timestamp: Date.now() / 1000, resourceType: 'video', cloudName: 'test', publicId: 'file', apiKey: 'key', signature: 'sig', uploadToken: 'receipt', folder: 'folder', overwrite: false } }),
    confirmDirectUploadAPI: async () => { confirms++; if (failSaving) throw Object.assign(Error('server restarting'), { response: { status: 503 } }); return { data: { success: true, material: { _id: 'saved' } } }; },
    retryUploadOperation, uploadWithRecovery, setTimeout: (callback) => callback(), Date, Math,
  });
  vm.runInContext(source, context);
  const file = { uri: 'file:///phone/lesson.mp4', name: 'lesson.mp4', mimeType: 'video/mp4' };
  const options = { ownerId: 'teacher' };
  await assert.rejects(context.publishDirectFile(file, { title: 'Lesson' }, options), /server restarting/);
  assert.equal(confirms, 4);
  assert.deepEqual(reads, [[0, UPLOAD_CHUNK_SIZE], [UPLOAD_CHUNK_SIZE, 5]]);
  assert.equal(handlesClosed, 2);
  assert.equal(requests[0].headers['Content-Range'], `bytes 0-${UPLOAD_CHUNK_SIZE - 1}/${size}`);
  assert.equal(requests[1].headers['Content-Range'], `bytes ${UPLOAD_CHUNK_SIZE}-${size - 1}/${size}`);
  assert.equal(requests[0].headers['X-Unique-Upload-Id'], requests[1].headers['X-Unique-Upload-Id']);
  assert.equal(requests[0].parts.overwrite, 'false');
  assert.equal(requests[0].parts.file.type, 'video/mp4');
  assert.equal(saved.size, 1);
  failSaving = false;
  const result = await context.publishDirectFile(file, { title: 'Lesson' }, options);
  assert.equal(result.material._id, 'saved');
  assert.equal(requests.length, 2);
  assert.equal(reads.length, 2);
  assert.equal(saved.size, 0);
});
