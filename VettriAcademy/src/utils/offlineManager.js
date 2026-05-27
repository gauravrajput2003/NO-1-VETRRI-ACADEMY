import * as FileSystem from 'expo-file-system';

const PDF_DIR = FileSystem.documentDirectory + 'pdfs/';
const MAX_STORAGE_MB = 500;
const MAX_STORAGE_BYTES = MAX_STORAGE_MB * 1024 * 1024;

/**
 * Ensure the PDFs directory exists
 */
const ensureDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(PDF_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PDF_DIR, { intermediates: true });
  }
};

/**
 * Download a PDF to local storage
 * @param {string} materialId - Material MongoDB ID
 * @param {string} url - Remote PDF URL
 * @param {string} title - Material title (for display)
 * @param {Function} onProgress - Progress callback ({totalBytesWritten, totalBytesExpectedToWrite})
 * @returns {Promise<string>} Local file URI
 */
export const downloadPdf = async (materialId, url, title, onProgress) => {
  await ensureDir();

  // Check storage limit
  const usage = await getStorageUsage();
  if (usage >= MAX_STORAGE_BYTES) {
    throw new Error(`Storage limit reached (${MAX_STORAGE_MB}MB). Delete some files first.`);
  }

  const localPath = PDF_DIR + materialId + '.pdf';

  // Check if already downloaded
  const fileInfo = await FileSystem.getInfoAsync(localPath);
  if (fileInfo.exists) {
    return localPath;
  }

  // Download with progress tracking
  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    localPath,
    {},
    (downloadProgress) => {
      if (onProgress) {
        onProgress({
          totalBytesWritten: downloadProgress.totalBytesWritten,
          totalBytesExpectedToWrite: downloadProgress.totalBytesExpectedToWrite,
          progress: downloadProgress.totalBytesExpectedToWrite > 0
            ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
            : 0,
        });
      }
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) {
    throw new Error('Download failed');
  }

  return result.uri;
};

/**
 * Check if a PDF is downloaded locally
 * @param {string} materialId - Material MongoDB ID
 * @returns {Promise<boolean>}
 */
export const isDownloaded = async (materialId) => {
  const localPath = PDF_DIR + materialId + '.pdf';
  const fileInfo = await FileSystem.getInfoAsync(localPath);
  return fileInfo.exists;
};

/**
 * Get local file path for a downloaded PDF
 * @param {string} materialId - Material MongoDB ID
 * @returns {string} File URI
 */
export const getLocalPath = (materialId) => {
  return PDF_DIR + materialId + '.pdf';
};

/**
 * Delete a locally downloaded PDF
 * @param {string} materialId - Material MongoDB ID
 * @returns {Promise<boolean>}
 */
export const deletePdf = async (materialId) => {
  const localPath = PDF_DIR + materialId + '.pdf';
  const fileInfo = await FileSystem.getInfoAsync(localPath);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(localPath);
    return true;
  }
  return false;
};

/**
 * Calculate total storage used by downloaded PDFs
 * @returns {Promise<number>} Total bytes used
 */
export const getStorageUsage = async () => {
  await ensureDir();
  const files = await FileSystem.readDirectoryAsync(PDF_DIR);
  let totalSize = 0;

  for (const file of files) {
    const fileInfo = await FileSystem.getInfoAsync(PDF_DIR + file);
    if (fileInfo.exists && fileInfo.size) {
      totalSize += fileInfo.size;
    }
  }

  return totalSize;
};

/**
 * Get list of all downloaded PDFs with metadata
 * @returns {Promise<Array>} Array of { materialId, localPath, size, modificationTime }
 */
export const getAllDownloads = async () => {
  await ensureDir();
  const files = await FileSystem.readDirectoryAsync(PDF_DIR);
  const downloads = [];

  for (const file of files) {
    const filePath = PDF_DIR + file;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      const materialId = file.replace('.pdf', '');
      downloads.push({
        materialId,
        localPath: filePath,
        size: fileInfo.size || 0,
        modificationTime: fileInfo.modificationTime,
      });
    }
  }

  return downloads;
};

/**
 * Clear all downloaded PDFs
 * @returns {Promise<number>} Number of files deleted
 */
export const clearAllDownloads = async () => {
  await ensureDir();
  const files = await FileSystem.readDirectoryAsync(PDF_DIR);
  for (const file of files) {
    await FileSystem.deleteAsync(PDF_DIR + file);
  }
  return files.length;
};

/**
 * Format bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export { MAX_STORAGE_MB, MAX_STORAGE_BYTES };
