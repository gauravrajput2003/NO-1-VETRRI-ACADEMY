export const UPLOAD_CHUNK_SIZE = 6 * 1024 * 1024;
export const isRetryableUploadError = (error) => error.retryable !== false
  && (!error.status || [408, 420, 429].includes(error.status) || error.status >= 500);

export async function retryUploadOperation(operation, { wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), onRetry = () => {}, attempts = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (attempt + 1 >= attempts || !isRetryableUploadError(error)) throw error;
      onRetry(attempt + 1);
      await wait(1000 * 2 ** attempt);
    }
  }
}

// Platform-independent protocol. Checkpoints advance only after cloud acknowledgement.
export async function uploadWithRecovery({ file, load, save, sign, readPart, sendPart,
  onProgress = () => {}, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now, makeId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}` }) {
  let state = await load();
  if (!state || state.size !== file.size || now() - state.createdAt > 24 * 60 * 60000) {
    state = { uploadId: makeId(), chunkUploadId: makeId(), offset: 0, size: file.size, createdAt: now() };
    await save(state);
  }
  const progress = (phase, offset = state.offset) => onProgress({ phase, percent: Math.floor(offset / file.size * 100) });
  if (!state.params || now() / 1000 - state.params.timestamp > 45 * 60) {
    progress('Preparing');
    state.params = await retryUploadOperation(() => sign(state.uploadId), { wait });
    await save(state);
  }
  if (state.result) return { ...state.result, uploadToken: state.params.uploadToken };
  let restarted = false;
  while (state.offset < file.size) {
    if (now() / 1000 - state.params.timestamp > 45 * 60) {
      state.params = await retryUploadOperation(() => sign(state.uploadId), { wait });
      await save(state);
    }
    const start = state.offset;
    const end = Math.min(start + UPLOAD_CHUNK_SIZE, file.size);
    progress(start ? 'Resuming upload' : 'Uploading');
    const part = await readPart(start, end);
    let result;
    try {
      result = await retryUploadOperation(() => sendPart({ part, start, end, size: file.size, params: state.params, chunkUploadId: state.chunkUploadId,
        onBytes: (bytes) => progress('Uploading', start + Math.min(bytes, end - start)) }), {
        wait, onRetry: () => progress('Retrying interrupted upload'),
      });
    } catch (error) {
      // Cloudinary may discard an old incomplete upload. Start a new chunk stream
      // while retaining the same non-overwriting public ID and confirmation key.
      if (!restarted && start > 0 && [400, 404].includes(error.status) && /range|chunk|upload.*(?:expired|not found)/i.test(error.message)) {
        restarted = true;
        state.offset = 0;
        state.chunkUploadId = makeId();
        await save(state);
        continue;
      }
      throw error;
    }
    if (end === file.size) {
      if (!result.secure_url || !result.public_id || result.done === false) {
        throw Object.assign(new Error('Cloudinary has not confirmed the completed file. Please retry.'), { retryable: false });
      }
      state.result = { url: result.secure_url, fileUrl: result.secure_url, publicId: result.public_id,
        resourceType: state.params.resourceType, storageType: 'cloudinary', originalFilename: file.name,
        fileSize: result.bytes, mimeType: file.mimeType, extension: file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '',
      };
    }
    state.offset = end;
    await save(state);
    progress('Uploaded');
  }
  return { ...state.result, uploadToken: state.params.uploadToken };
}
