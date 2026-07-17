const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const { logDev, warnDev, errorCrit } = require('../utils/logger');

/**
 * PRODUCTION-READY Multer Configuration
 * 
 * Strategy:
 * 1. DISK STORAGE for large files (study materials, videos, zip files, documents)
 *    - Temporary files stored in /tmp (auto-cleanup by OS)
 *    - Streaming upload to Cloudinary saves memory
 *    - Safe for 200MB+ study materials and 500MB+ videos
 * 
 * 2. MEMORY STORAGE only for small files (avatars, small images)
 *    - Direct buffer to Cloudinary
 *    - Fast for <5MB files
 * 
 * Why this matters:
 * - Windows: Temp files in %TEMP%
 * - Linux: Temp files in /tmp (auto-cleanup by OS)
 * - Prevents RAM exhaustion on large uploads
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. MEMORY STORAGE for small files (avatars, small images, profile pics)
// ────────────────────────────────────────────────────────────────────────────
const memStorage = multer.memoryStorage();

// ────────────────────────────────────────────────────────────────────────────
// 2. DISK STORAGE for large files (study materials, videos, documents, uploads)
// ────────────────────────────────────────────────────────────────────────────

// Determine temp directory (works on Windows, Linux, Mac)
const getTempDir = () => {
  return process.env.UPLOAD_TEMP_DIR || path.join(require('os').tmpdir(), 'vettri-academy');
};

// Ensure temp directory exists
const ensureTempDir = () => {
  const tempDir = getTempDir();
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const tempDir = ensureTempDir();
      logDev('[Multer] Storing file to temp directory');
      cb(null, tempDir);
    } catch (error) {
      errorCrit('[Multer] Disk storage error:', error.message);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: <timestamp>-<random>-<originalname>
    // Preserves original name for Cloudinary metadata
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
    logDev('[Multer] File saved');
    cb(null, uniqueName);
  },
});

// ────────────────────────────────────────────────────────────────────────────
// File Type Detection & Validation
// ────────────────────────────────────────────────────────────────────────────

// Allowed MIME types by category
const ALLOWED_MIMETYPES = {
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
  ],
  video: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-flv',
  ],
  document: [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain', // .txt
  ],
  archive: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
  ],
};

const isMimetypeAllowed = (mimetype, allowed) => {
  if (Array.isArray(allowed)) {
    return allowed.includes(mimetype);
  }
  return true; // If no whitelist, allow all
};

// ────────────────────────────────────────────────────────────────────────────
// Multer Instances
// ────────────────────────────────────────────────────────────────────────────

/**
 * AVATAR UPLOAD
 * - Memory storage (small files only)
 * - Max 5MB
 * - Images only
 */
const uploadAvatar = multer({
  storage: memStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!isMimetypeAllowed(file.mimetype, ALLOWED_MIMETYPES.image)) {
      return cb(new Error('Only image files allowed for avatar (JPG, PNG, GIF, WebP)'));
    }
    cb(null, true);
  },
});

/**
 * IMAGE UPLOAD
 * - Memory storage (small images like featured images, thumbnails)
 * - Max 10MB
 * - Images only
 */
const uploadImage = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!isMimetypeAllowed(file.mimetype, ALLOWED_MIMETYPES.image)) {
      return cb(new Error('Only image files allowed (JPG, PNG, GIF, WebP, SVG)'));
    }
    cb(null, true);
  },
});

/**
 * STUDY MATERIAL UPLOAD
 * - Disk storage (can be large: PDFs, DOCX, PPTX, XLSX, etc.)
 * - Max 200MB (for comprehensive course materials)
 * - All document types supported
 * Auto-cleanup: Temp file deleted after Cloudinary upload
 */
const uploadStudyMaterial = multer({
  storage: diskStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      ...ALLOWED_MIMETYPES.image,
      ...ALLOWED_MIMETYPES.video,
      ...ALLOWED_MIMETYPES.document,
      ...ALLOWED_MIMETYPES.archive,
    ];
    if (!isMimetypeAllowed(file.mimetype, allowed)) {
      return cb(new Error(
        'File type not allowed. Supported: PDF, DOCX, PPTX, XLSX, images, videos, ZIP, RAR'
      ));
    }
    cb(null, true);
  },
});

/**
 * VIDEO UPLOAD
 * - Disk storage (can be very large: 500MB+ videos)
 * - Max 500MB (or set via ENV: MAX_VIDEO_SIZE)
 * - Video files only
 * Auto-cleanup: Temp file deleted after Cloudinary upload
 */
const maxVideoSize = process.env.MAX_VIDEO_SIZE
  ? parseInt(process.env.MAX_VIDEO_SIZE) * 1024 * 1024
  : 500 * 1024 * 1024; // 500MB default

const uploadVideo = multer({
  storage: diskStorage,
  limits: { fileSize: maxVideoSize },
  fileFilter: (req, file, cb) => {
    // Accept any video/* MIME type, plus octet-stream (some pickers send this for videos)
    const mime = (file.mimetype || '').toLowerCase();
    const isVideo = mime.startsWith('video/') || mime === 'application/octet-stream';
    if (!isVideo) {
      warnDev('[uploadVideo] Rejected MIME type:', mime);
      return cb(new Error(`Only video files allowed. Got: ${mime}`));
    }
    logDev('[uploadVideo] Accepted MIME type:', mime);
    cb(null, true);
  },
});

/**
 * CHAT FILE UPLOAD
 * - Memory storage (chat files usually small)
 * - Max 25MB
 * - Images, PDFs, documents
 */
const uploadChatFile = multer({
  storage: memStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      ...ALLOWED_MIMETYPES.image,
      ...ALLOWED_MIMETYPES.document,
    ];
    if (!isMimetypeAllowed(file.mimetype, allowed)) {
      return cb(new Error('Only images and documents allowed for chat'));
    }
    cb(null, true);
  },
});

/**
 * ZIP/ARCHIVE UPLOAD
 * - Disk storage (archives can be large)
 * - Max 300MB
 * - ZIP, RAR files only
 */
const uploadArchive = multer({
  storage: diskStorage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB
  fileFilter: (req, file, cb) => {
    if (!isMimetypeAllowed(file.mimetype, ALLOWED_MIMETYPES.archive)) {
      return cb(new Error('Only ZIP, RAR, 7Z, GZ files allowed'));
    }
    cb(null, true);
  },
});

/**
 * DOCUMENT UPLOAD
 * - Disk storage (for office documents that might be large)
 * - Max 50MB
 * - Office documents only (PDF, DOCX, PPTX, XLSX)
 */
const uploadDocument = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (!isMimetypeAllowed(file.mimetype, ALLOWED_MIMETYPES.document)) {
      return cb(new Error('Only documents allowed (PDF, DOCX, PPTX, XLSX, TXT)'));
    }
    cb(null, true);
  },
});

/**
 * DOUBT ATTACHMENT UPLOAD
 * - Memory storage for faster upload and immediate cloud push
 * - Max 25MB
 * - Images, PDFs, and audio only
 */
const uploadDoubtAttachment = multer({
  storage: memStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      ...ALLOWED_MIMETYPES.image,
      'application/pdf',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
    ];

    if (!isMimetypeAllowed(file.mimetype, allowed)) {
      return cb(new Error('Only JPG, PNG, PDF, and audio files are allowed for doubts.'));
    }

    cb(null, true);
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Legacy Helper (for existing code compatibility)
// ────────────────────────────────────────────────────────────────────────────

const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// ────────────────────────────────────────────────────────────────────────────
// Resource Type Detection
// ────────────────────────────────────────────────────────────────────────────

const getResourceType = (mimetype) => {
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('image/')) return 'image';
  return 'raw';
};

module.exports = {
  // Individual upload instances
  uploadAvatar,
  uploadImage,
  uploadStudyMaterial,
  uploadVideo,
  uploadChatFile,
  uploadArchive,
  uploadDocument,
  uploadDoubtAttachment,
  
  // Helpers
  uploadToCloudinary,
  getResourceType,
  
  // Config
  diskStorage,
  memStorage,
  getTempDir,
  ensureTempDir,
  cloudinary,
};
