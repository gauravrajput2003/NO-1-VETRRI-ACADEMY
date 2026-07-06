require('dotenv').config();
const cloudinary = require('./config/cloudinary');
const https = require('https');

// Test a direct Cloudinary private_download_url with empty format
const publicId = process.argv[2] || 'materials/study-materials/gaurav sql (1).pdf';
const resourceType = process.argv[3] || 'raw';

const url1 = cloudinary.utils.private_download_url(publicId, '', {
  resource_type: resourceType,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  attachment: true
});

console.log('\n=== private_download_url (empty format) ===');
console.log(url1);

// Test HTTP status of this URL
https.get(url1, (res) => {
  console.log('\nStatus:', res.statusCode, res.statusMessage);
  console.log('Location:', res.headers.location || '(no redirect)');
  
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    const redirectUrl = res.headers.location;
    console.log('\nFollowing redirect to:', redirectUrl.substring(0, 100));
    
    https.get(redirectUrl, (res2) => {
      console.log('Redirect status:', res2.statusCode, res2.statusMessage);
      process.exit(0);
    }).on('error', (e) => { console.error('Redirect error:', e.message); process.exit(1); });
  } else {
    res.resume();
    process.exit(0);
  }
}).on('error', (e) => { console.error('Error:', e.message); process.exit(1); });
