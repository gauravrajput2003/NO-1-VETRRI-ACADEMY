const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
async function verifyExamAsset(token, user) {
  let receipt;
  try { receipt = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { throw fail('Upload session expired. Select and upload the file again.', 410); }
  if (receipt.kind !== 'direct-upload' || receipt.purpose !== 'exam' || receipt.owner !== String(user._id)) throw fail('This file does not belong to your exam upload.', 403);
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(receipt.mimetype) || receipt.size > 20 * 1024 * 1024) throw fail('Unsupported exam file.');
  let asset;
  try { asset = await cloudinary.api.resource(receipt.publicId, { resource_type: receipt.resourceType }); }
  catch { throw fail('The file is not ready yet. Retry saving shortly.', 503); }
  if (asset.public_id !== receipt.publicId || asset.resource_type !== receipt.resourceType || asset.bytes !== receipt.size || !asset.secure_url?.startsWith('https://')) throw fail('The file has not finished uploading.', 409);
  return { url: asset.secure_url, publicId: asset.public_id, resourceType: asset.resource_type, filename: receipt.filename, mimeType: receipt.mimetype, size: asset.bytes };
}
module.exports = { verifyExamAsset };
