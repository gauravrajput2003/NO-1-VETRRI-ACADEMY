import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDirectUploadParamsAPI, confirmDirectUploadAPI } from './api';
import { retryUploadOperation, uploadWithRecovery } from './cloudinaryUploadCore';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const checkpointKey = (file, ownerId, purpose) => `@vettri_upload_v1:${ownerId}:${purpose}:${encodeURIComponent(file.uri || file.name)}:${file.size}`;

function sendChunk(file, { part, start, end, size, params, chunkUploadId, onBytes }) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', part);
    for (const key of ['api_key', 'timestamp', 'signature', 'folder', 'public_id', 'overwrite']) {
      const value = { api_key: params.apiKey, public_id: params.publicId, ...params }[key];
      form.append(key, String(value));
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${params.cloudName}/${params.resourceType}/upload`);
    xhr.timeout = 180000;
    xhr.setRequestHeader('X-Unique-Upload-Id', chunkUploadId);
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${size}`);
    xhr.upload.onprogress = (event) => onBytes(event.loaded);
    xhr.onerror = () => reject(new Error('Network interrupted. Retry to resume this upload.'));
    xhr.ontimeout = () => reject(Object.assign(new Error('Upload timed out. Retry to resume.'), { status: 408 }));
    xhr.onabort = () => reject(Object.assign(new Error('Upload cancelled.'), { retryable: false }));
    xhr.onload = () => {
      let result;
      try { result = JSON.parse(xhr.responseText); } catch { result = {}; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(result);
      else reject(Object.assign(new Error(result.error?.message || `Upload failed (${xhr.status}).`), { status: xhr.status }));
    };
    xhr.send(form);
  });
}

export async function uploadDirectFile(pickedFile, { ownerId, purpose = 'material', onProgress } = {}) {
  if (!ownerId) throw new Error('Please log in again before uploading.');
  let source;
  let temporaryPart;
  const file = { ...pickedFile, mimeType: pickedFile.mimeType || pickedFile.type || 'application/octet-stream' };
  if (Platform.OS === 'web') {
    source = pickedFile.file || await (await fetch(pickedFile.uri)).blob();
    file.size = source.size;
  } else {
    source = new File(file.uri);
    if (!source.exists) throw new Error('The selected file is no longer on this phone. Please select it again.');
    file.size = source.size;
    temporaryPart = new File(Paths.cache, `upload-part-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) throw new Error('Please select a non-empty file.');
  const key = checkpointKey(file, ownerId, purpose);
  try {
    const result = await uploadWithRecovery({
      file,
      load: async () => { try { return JSON.parse(await AsyncStorage.getItem(key)); } catch { return null; } },
      save: (state) => AsyncStorage.setItem(key, JSON.stringify(state)),
      sign: async (uploadId) => {
        try {
          const { data } = await getDirectUploadParamsAPI({ uploadId, filename: file.name, mimetype: file.mimeType, size: file.size, purpose });
          if (!data.success) throw new Error(data.message || 'Unable to prepare upload.');
          return data;
        } catch (error) { error.status = error.response?.status; throw error; }
      },
      readPart: async (start, end) => {
        if (Platform.OS === 'web') return source.slice(start, end, file.mimeType);
        // SDK 54's File.slice() reads the ENTIRE source into JS memory. Use a
        // bounded file handle and one temporary phone-side chunk instead.
        const handle = source.open();
        try {
          handle.offset = start;
          const bytes = handle.readBytes(end - start);
          if (bytes.length !== end - start) throw new Error('Could not read the selected file.');
          if (temporaryPart.exists) temporaryPart.delete();
          temporaryPart.create();
          temporaryPart.write(bytes);
        } finally { handle.close(); }
        return { uri: temporaryPart.uri, name: file.name, type: file.mimeType };
      },
      sendPart: (part) => sendChunk(file, part), onProgress,
    });
    return { ...result, checkpointKey: key };
  } finally { try { if (temporaryPart?.exists) temporaryPart.delete(); } catch { /* Cache cleanup must not hide upload errors. */ } }
}

export async function publishDirectFile(file, metadata, options) {
  const uploaded = await uploadDirectFile(file, options);
  options.onProgress?.({ phase: 'Saving details', percent: 100 });
  const data = await retryUploadOperation(async () => {
    try {
      const response = await confirmDirectUploadAPI({ ...metadata, uploadToken: uploaded.uploadToken });
      if (!response.data.success) throw new Error(response.data.message || 'Unable to save upload.');
      return response.data;
    } catch (error) { error.status = error.response?.status; throw error; }
  }, { wait });
  // A failed metadata save deliberately retains the completed-cloud checkpoint.
  // Retry only saves metadata again; the file is not uploaded twice.
  await AsyncStorage.removeItem(uploaded.checkpointKey).catch(() => {});
  return data;
}
