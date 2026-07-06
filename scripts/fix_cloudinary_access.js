require('dotenv').config();
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || process.env.DB_URI;

async function fix() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  const StudyMaterial = require('../models/StudyMaterial');
  const materials = await StudyMaterial.find({ storageType: 'cloudinary' });
  console.log('Found', materials.length, 'materials');
  let fixed = 0, skipped = 0, failed = 0;
  for (const mat of materials) {
    if (!mat.publicId) { skipped++; continue; }
    const rt = mat.resourceType || 'raw';
    try {
      await cloudinary.api.update(mat.publicId, {
        resource_type: rt,
        access_mode: 'public',
        type: 'upload'
      });
      console.log('Fixed:', mat.publicId);
      fixed++;
    } catch (e) {
      const code = e.error && e.error.http_code;
      if (code === 404) {
        console.log('Not found on Cloudinary:', mat.publicId);
        skipped++;
      } else {
        console.error('Failed:', mat.publicId, e.message || JSON.stringify(e.error));
        failed++;
      }
    }
  }
  console.log('Done. Fixed:', fixed, 'Skipped:', skipped, 'Failed:', failed);
  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
