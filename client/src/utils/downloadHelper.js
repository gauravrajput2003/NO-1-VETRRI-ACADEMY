/**
 * PRODUCTION-READY Frontend Download Helper
 * 
 * Handles file downloads from backend APIs with proper filename and extension handling.
 * Works with both Cloudinary and S3 storage backends.
 * 
 * Features:
 * - Proper filename preservation (notes.pdf, lecture1.pptx, etc.)
 * - Extension validation
 * - Download progress tracking
 * - Error handling
 * - Mobile and desktop compatibility
 */

/**
 * Extract filename from Content-Disposition header or URL
 * @param {Response} response - Fetch response object
 * @param {string} fallbackName - Fallback filename
 * @returns {string} Filename with extension
 */
export const extractFilenameFromResponse = (response, fallbackName = 'download') => {
  // Try to get filename from Content-Disposition header
  const contentDisposition = response.headers.get('content-disposition');
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=(["\']*)([^"\';]*)/);
    if (filenameMatch && filenameMatch[2]) {
      return filenameMatch[2];
    }
  }

  // Try to get filename from URL
  const url = response.url || response.redirected ? response.url : '';
  if (url) {
    const urlFilename = url.split('/').pop();
    if (urlFilename && !urlFilename.startsWith('?')) {
      return decodeURIComponent(urlFilename);
    }
  }

  return fallbackName;
};

/**
 * Download file from URL with proper naming
 * @param {string} url - File URL to download
 * @param {string} filename - Original filename with extension (e.g., "notes.pdf")
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
export const downloadFile = async (url, filename, onProgress) => {
  try {
    console.log(`[Download] Starting: ${filename}`);

    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    // Get content length for progress tracking
    const contentLength = response.headers.get('content-length');
    let receivedLength = 0;

    // Read response body with progress tracking
    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      // Track progress
      if (onProgress && contentLength) {
        const progress = Math.round((receivedLength / parseInt(contentLength)) * 100);
        onProgress(progress);
      }
    }

    // Convert chunks to blob
    const blob = new Blob(chunks);

    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;

    console.log(`[Download] Triggering: ${filename}`);

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    window.URL.revokeObjectURL(downloadUrl);

    console.log(`[Download] Complete: ${filename}`);
  } catch (error) {
    console.error('[Download] Error:', error);
    throw error;
  }
};

/**
 * Download study material from backend
 * @param {string} materialId - Material ID from database
 * @param {string} filename - Original filename (optional, will be extracted if not provided)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
export const downloadStudyMaterial = async (materialId, filename, onProgress) => {
  try {
    console.log(`[Material Download] Requesting URL for: ${materialId}`);

    // Step 1: Get download URL from backend (using new unified endpoint)
    const response = await fetch(`/api/storage/download-url/${materialId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get download URL');
    }

    const data = await response.json();
    const downloadUrl = data.downloadUrl || data.url;

    if (!data.success || !downloadUrl) {
      throw new Error('Download URL not available');
    }

    // Use filename from response metadata or provided filename
    const downloadFilename = filename || data.originalFilename || data.metadata?.filename || 'material.pdf';

    console.log(`[Material Download] Received URL, downloading: ${downloadFilename}`);

    // Step 2: Download file with proper name
    await downloadFile(downloadUrl, downloadFilename, onProgress);
  } catch (error) {
    console.error('[Material Download] Error:', error.message);
    throw error;
  }
};


/**
 * Download training video from backend
 * @param {string} videoId - Video ID from database
 * @param {string} videoTitle - Video title (for filename)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
export const downloadTrainingVideo = async (videoId, videoTitle = 'video', onProgress) => {
  try {
    console.log(`[Video Download] Requesting URL for: ${videoId}`);

    // Get download URL from backend
    const response = await fetch(`/api/training-videos/${videoId}/download`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get video download URL');
    }

    const data = await response.json();

    if (!data.success || !data.url) {
      throw new Error('Download URL not available');
    }

    // Generate filename from title
    const filename = `${videoTitle}.mp4`;

    console.log(`[Video Download] Received URL, downloading: ${filename}`);

    // Download video
    await downloadFile(data.url, filename, onProgress);
  } catch (error) {
    console.error('[Video Download] Error:', error.message);
    throw error;
  }
};

/**
 * Direct download from URL (for Cloudinary/S3 URLs)
 * Use this when you already have the final download URL
 * @param {string} url - Direct download URL
 * @param {string} filename - Filename for download
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
export const downloadFromUrl = async (url, filename, onProgress) => {
  try {
    console.log(`[Direct Download] Starting: ${filename}`);
    await downloadFile(url, filename, onProgress);
  } catch (error) {
    console.error('[Direct Download] Error:', error.message);
    throw error;
  }
};

/**
 * Get human-readable file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Human-readable size (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file type icon name based on extension
 * @param {string} extension - File extension (pdf, docx, pptx, etc.)
 * @returns {string} Icon name or description
 */
export const getFileTypeIcon = (extension) => {
  const extensionMap = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    ppt: '🎯',
    pptx: '🎯',
    xls: '📊',
    xlsx: '📊',
    zip: '🗜️',
    rar: '🗜️',
    txt: '📃',
    mp4: '🎬',
    mov: '🎬',
    avi: '🎬',
    webm: '🎬',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
  };
  return extensionMap[extension?.toLowerCase()] || '📦';
};

/**
 * Validate file type for display
 * @param {string} mimeType - MIME type
 * @returns {boolean} Is valid file type
 */
export const isValidFileType = (mimeType) => {
  const validTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-flv',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
  ];
  return validTypes.includes(mimeType);
};

/**
 * Format file name for display (truncate if too long)
 * @param {string} filename - Full filename
 * @param {number} maxLength - Maximum display length
 * @returns {string} Formatted filename
 */
export const formatFilenameForDisplay = (filename, maxLength = 30) => {
  if (!filename) return 'Untitled';
  if (filename.length <= maxLength) return filename;

  // Find extension
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return filename.substring(0, maxLength) + '...';
  }

  const name = filename.substring(0, lastDot);
  const ext = filename.substring(lastDot);
  const availableLength = maxLength - ext.length - 3; // 3 for "..."

  return name.substring(0, availableLength) + '...' + ext;
};

export default {
  downloadFile,
  downloadStudyMaterial,
  downloadTrainingVideo,
  downloadFromUrl,
  formatFileSize,
  getFileTypeIcon,
  isValidFileType,
  formatFilenameForDisplay,
  extractFilenameFromResponse,
};
