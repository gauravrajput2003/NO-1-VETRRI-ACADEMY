const crypto = require('node:crypto');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');
const LibraryAccess = require('../models/LibraryAccess');
const StudyMaterial = require('../models/StudyMaterial');
const TrainingVideo = require('../models/TrainingVideo');

const resourceTypeFor = (mime) => mime.startsWith('video/') || mime.startsWith('audio/') ? 'video'
  : mime.startsWith('image/') || mime === 'application/pdf' ? 'image' : 'raw';
const failure = (message, status = 400) => Object.assign(new Error(message), { status });

async function authorize(user, purpose) {
  if (purpose === 'exam') {
    if (!['student', 'teacher', 'admin'].includes(user.role) || (user.role === 'teacher' && user.isApproved === false)) throw failure('Access denied.', 403);
    return;
  }
  if (!['material', 'training'].includes(purpose)) throw failure('Unsupported upload purpose.');
  if (user.role === 'admin') return;
  if (purpose !== 'material' || user.role !== 'teacher') throw failure('Access denied.', 403);
  const access = await LibraryAccess.findOne({ teacher: user._id }).lean();
  if (!access?.approved) throw failure('Library access not yet approved by Admin.', 403);
}

async function getDirectUploadParams(req, res) {
  try {
    const { uploadId, filename, mimetype = 'application/octet-stream', size, purpose = 'material' } = req.body;
    await authorize(req.user, purpose);
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(uploadId || '') || typeof filename !== 'string' || !filename.trim() || filename.length > 255 || typeof mimetype !== 'string') throw failure('Invalid upload details.');
    if (purpose === 'exam' && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimetype)) throw failure('Exam files must be PDF, JPG, PNG or WebP.');
    const maximum = purpose === 'exam' ? 20 * 1024 * 1024 : mimetype.startsWith('video/') ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
    if (!Number.isSafeInteger(size) || size <= 0 || size > maximum) throw failure('File exceeds the supported upload size.');
    if (purpose === 'training' && !mimetype.startsWith('video/')) throw failure('Please select a video file.');
    const resourceType = resourceTypeFor(mimetype);
    const folder = `vettri-academy/direct/${req.user._id}/${purpose}`;
    const cleanName = path.basename(String(filename), path.extname(String(filename))).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70) || 'upload';
    // Stable across signature refreshes and retries; false overwrite protects completed assets.
    const suffix = crypto.createHash('sha256').update(`${req.user._id}:${uploadId}`).digest('hex').slice(0, 24);
    const publicId = `${cleanName}_${suffix}${resourceType === 'raw' ? path.extname(String(filename)).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) : ''}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { timestamp, folder, public_id: publicId, overwrite: false };
    const uploadToken = jwt.sign({
      kind: 'direct-upload', owner: String(req.user._id), uploadId, purpose,
      publicId: `${folder}/${publicId}`, resourceType, filename: String(filename), mimetype, size,
    }, process.env.JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' });
    res.json({ success: true, ...params, publicId, resourceType, uploadToken,
      signature: cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET),
      apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME });
  } catch (error) { res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Unable to prepare upload. Please retry.' }); }
}

async function confirmDirectUpload(req, res) {
  let directUploadId;
  let purpose;
  try {
    let receipt;
    try { receipt = jwt.verify(req.body.uploadToken, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
    catch { throw failure('Upload session expired or invalid. Please retry the upload.', 410); }
    if (receipt.kind !== 'direct-upload' || receipt.owner !== String(req.user._id)) throw failure('This upload belongs to another account.', 403);
    purpose = receipt.purpose;
    if (purpose === 'exam') throw failure('Save exam files through Exam Management.');
    await authorize(req.user, purpose);
    directUploadId = `${receipt.owner}:${receipt.uploadId}`;
    const Model = purpose === 'training' ? TrainingVideo : StudyMaterial;
    if (!req.body.materialId) {
      const existing = await Model.findOne({ directUploadId });
      if (existing) return res.json({ success: true, [purpose === 'training' ? 'video' : 'material']: existing });
    }
    // Metadata comes from Cloudinary, never from an arbitrary client-supplied URL.
    let asset;
    try { asset = await cloudinary.api.resource(receipt.publicId, { resource_type: receipt.resourceType }); }
    catch { throw failure('Cloud upload is not available yet. Retry saving in a moment.', 503); }
    if (asset.public_id !== receipt.publicId || asset.resource_type !== receipt.resourceType || asset.bytes !== receipt.size
      || typeof asset.secure_url !== 'string' || !asset.secure_url.startsWith('https://')) {
      throw failure('Cloud upload is incomplete or does not match the selected file.', 409);
    }
    req.directUploadId = directUploadId;
    req.directUploadAsset = {
      fileUrl: asset.secure_url, publicId: asset.public_id, resourceType: receipt.resourceType,
      storageType: 'cloudinary', fileSize: asset.bytes, mimeType: receipt.mimetype,
      originalFilename: receipt.filename, extension: path.extname(receipt.filename).slice(1), duration: asset.duration || 0,
    };
    if (purpose === 'training') {
      if (req.body.materialId) throw failure('Training uploads cannot replace study materials.');
      if (!String(req.body.title || '').trim()) throw failure('Title is required.');
      const last = await TrainingVideo.findOne().sort({ order: -1 }).select('order');
      const video = await TrainingVideo.create({
        directUploadId, title: req.body.title, description: req.body.description,
        cloudinaryUrl: asset.secure_url, cloudinaryPublicId: asset.public_id, videoUrl: asset.secure_url,
        thumbnailUrl: req.body.thumbnailUrl || asset.secure_url.replace(/\.[^.]+$/, '.jpg'),
        duration: asset.duration || 0, isMandatory: req.body.isMandatory === true || req.body.isMandatory === 'true',
        uploadedBy: req.user._id, order: Number(req.body.order) || (last?.order || 0) + 1,
        category: req.body.category || 'getting-started', targetAudience: req.body.targetAudience || 'both', isActive: true,
      });
      return res.status(201).json({ success: true, video });
    }
    if (req.body.materialId) {
      req.params.id = req.body.materialId;
      if (req.user.role === 'admin') return require('./adminController').directEditMaterial(req, res);
      return require('./teacherController').editMaterial(req, res);
    }
    req.body = { ...req.body, ...req.directUploadAsset };
    return require('./storageController').confirmUpload(req, res);
  } catch (error) {
    if (error.code === 11000 && directUploadId) {
      const Model = purpose === 'training' ? TrainingVideo : StudyMaterial;
      try {
        const existing = await Model.findOne({ directUploadId });
        if (existing) return res.json({ success: true, [purpose === 'training' ? 'video' : 'material']: existing });
      } catch { /* Return the original save failure if the retry lookup also fails. */ }
    }
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Unable to save upload. Please retry.' });
  }
}

module.exports = { getDirectUploadParams, confirmDirectUpload, resourceTypeFor };
