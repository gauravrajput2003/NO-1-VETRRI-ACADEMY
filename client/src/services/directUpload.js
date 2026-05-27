import axios from 'axios';
import {
  getS3UploadUrl,
  getCloudinaryUploadParams,
  confirmDirectUpload,
  getDirectDownloadUrl,
} from './api';

/**
 * Determine Cloudinary resource_type from MIME type
 */
export const getResourceType = (mimeType = '') => {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'raw'; // PDF, docs, zip, etc.
};

/**
 * Uploads a file directly to AWS S3 using a pre-signed PUT URL.
 * 
 * @param {File} file - The file to upload
 * @param {string} folder - The destination folder (e.g. 'materials/study-materials')
 * @param {function} onProgress - Optional callback function for tracking progress: (percentComplete) => {}
 * @returns {Promise<object>} Upload result with metadata
 */
export const uploadToS3Direct = async (file, folder = 'materials/study-materials', onProgress) => {
  // 1. Request pre-signed PUT URL from server
  const { data } = await getS3UploadUrl({
    filename: file.name,
    mimetype: file.type,
    folder,
  });

  if (!data.success) {
    throw new Error(data.message || 'Failed to request S3 pre-signed URL');
  }

  const { uploadUrl, key, bucket, fileUrl } = data;

  // 2. Upload file directly to S3
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type,
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        onProgress(percent);
      }
    },
  });

  return {
    fileUrl,
    publicId: key,
    storageType: 's3',
    originalFilename: file.name,
    extension: file.name.split('.').pop(),
    fileSize: file.size,
    mimeType: file.type,
    resourceType: getResourceType(file.type),
  };
};

/**
 * Uploads a file directly to Cloudinary using signed upload parameters.
 * 
 * @param {File} file - The file to upload
 * @param {string} folder - The destination folder
 * @param {function} onProgress - Optional progress callback: (percentComplete) => {}
 * @returns {Promise<object>} Upload result with metadata
 */
export const uploadToCloudinaryDirect = async (file, folder = 'materials/study-materials', onProgress) => {
  const resourceType = getResourceType(file.type);

  // 1. Request signed parameters from backend
  const { data } = await getCloudinaryUploadParams({
    folder,
    filename: file.name,
  });

  if (!data.success) {
    throw new Error(data.message || 'Failed to get Cloudinary signatures');
  }

  const { signature, timestamp, apiKey, cloudName, publicId } = data;

  // 2. Prepare FormData for Cloudinary API
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);
  if (publicId) {
    formData.append('public_id', publicId);
  }

  // 3. Upload directly to Cloudinary endpoint
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const response = await axios.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        onProgress(percent);
      }
    },
  });

  const result = response.data;

  return {
    fileUrl: result.secure_url,
    publicId: result.public_id,
    storageType: 'cloudinary',
    originalFilename: file.name,
    extension: file.name.split('.').pop(),
    fileSize: result.bytes,
    mimeType: file.type,
    resourceType,
  };
};

/**
 * Orchestrates the full direct upload and database confirmation flow.
 * Default is Cloudinary as requested.
 * 
 * @param {File} file - The file to upload
 * @param {object} payload - DB metadata payload (title, subject, description, etc.)
 * @param {string} storageType - 'cloudinary' or 's3' (defaults to cloudinary)
 * @param {function} onProgress - Progress tracking callback
 * @returns {Promise<object>} The saved DB document response
 */
export const performDirectUploadFlow = async (file, payload, storageType = 'cloudinary', onProgress) => {
  let uploadResult;

  if (storageType === 's3') {
    uploadResult = await uploadToS3Direct(file, 'materials/study-materials', onProgress);
  } else {
    uploadResult = await uploadToCloudinaryDirect(file, 'materials/study-materials', onProgress);
  }

  // Confirm upload to backend to create database record
  const confirmPayload = {
    ...payload,
    fileUrl: uploadResult.fileUrl,
    publicId: uploadResult.publicId,
    storageType: uploadResult.storageType,
    originalFilename: uploadResult.originalFilename,
    extension: uploadResult.extension,
    resourceType: uploadResult.resourceType,
    fileSize: uploadResult.fileSize,
    mimeType: uploadResult.mimeType,
  };

  const { data } = await confirmDirectUpload(confirmPayload);
  if (!data.success) {
    throw new Error(data.message || 'Failed to confirm upload on server');
  }

  return data.material;
};
