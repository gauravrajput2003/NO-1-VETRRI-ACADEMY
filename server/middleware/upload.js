const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// ─── Memory storage — all files go through buffer → Cloudinary stream ─────────
const memStorage = multer.memoryStorage();

// ─── Upload buffer to Cloudinary ──────────────────────────────────────────────
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

// ─── Multer instances (memory storage — manual cloudinary upload in controller) ─
const uploadImage = multer({
  storage: memStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'));
    cb(null, true);
  },
});

const uploadVideo = multer({
  storage: memStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) return cb(new Error('Only video files allowed'));
    cb(null, true);
  },
});

const uploadChatFile = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.mimetype)) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

const uploadStudyMaterial = multer({
  storage: memStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

const uploadAvatar = multer({
  storage: memStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'));
    cb(null, true);
  },
});

// ─── Helper: detect resource_type from mimetype ───────────────────────────────
const getResourceType = (mimetype) => {
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('image/')) return 'image';
  return 'raw';
};

module.exports = {
  uploadImage,
  uploadVideo,
  uploadChatFile,
  uploadStudyMaterial,
  uploadAvatar,
  uploadToCloudinary,
  getResourceType,
  cloudinary,
};
