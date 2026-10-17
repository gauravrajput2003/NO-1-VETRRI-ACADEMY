import axios from 'axios';
import api from './api';
export async function uploadExamFile(file, onProgress = () => {}) {
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024 || !file.size) throw new Error('Choose a PDF, JPG, PNG or WebP file up to 20 MB.');
  const uploadId = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const { data: params } = await api.post('/storage/direct-upload/params', { uploadId, filename: file.name, mimetype: file.type, size: file.size, purpose: 'exam' });
  const form = new FormData(); form.append('file', file);
  for (const [key, value] of Object.entries({ api_key: params.apiKey, timestamp: params.timestamp, signature: params.signature, folder: params.folder, public_id: params.publicId, overwrite: false })) form.append(key, String(value));
  for (let attempt = 0; ; attempt++) {
    try { await axios.post(`https://api.cloudinary.com/v1_1/${params.cloudName}/${params.resourceType}/upload`, form, { timeout: 180000, onUploadProgress: (event) => onProgress(Math.round(event.loaded / Math.max(file.size, event.total || 0) * 100)) }); return params.uploadToken; }
    catch (error) { if (attempt >= 3 || (error.response?.status && error.response.status < 500 && ![408, 420, 429].includes(error.response.status))) throw error; await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt)); }
  }
}
