/**
 * File Download Handler Middleware
 *
 * Handles file downloads with proper Content-Disposition headers.
 * Supports Cloudinary and S3 URLs, and follows HTTP redirects automatically.
 */

const https = require('https');
const http  = require('http');

/**
 * Fetch a URL following any HTTP redirects (up to maxRedirects hops).
 */
function fetchFollowingRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      const { statusCode, headers } = res;

      // Follow 3xx redirects
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume(); // discard body
        const nextUrl = headers.location.startsWith('http')
          ? headers.location
          : new URL(headers.location, url).toString();
        return fetchFollowingRedirects(nextUrl, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      resolve(res);
    }).on('error', reject);
  });
}

/**
 * Download file from URL and serve to client with proper headers.
 * Follows redirects automatically.
 * @param {string} fileUrl   - Source URL (Cloudinary / S3 / signed URL)
 * @param {string} filename  - Filename to present to the client
 * @param {string} mimeType  - MIME type
 * @param {Object} res       - Express response object
 */
async function proxyDownload(fileUrl, filename, mimeType, res) {
  console.log(`[Download] Proxy fetching: ${filename} from ${fileUrl.substring(0, 80)}...`);

  const remoteResponse = await fetchFollowingRedirects(fileUrl);

  if (remoteResponse.statusCode !== 200) {
    console.error(`[Download] Remote returned: ${remoteResponse.statusCode}`);
    if (!res.headersSent) {
      res.status(remoteResponse.statusCode).send(`Failed to fetch file (upstream ${remoteResponse.statusCode})`);
    }
    throw new Error(`Remote status: ${remoteResponse.statusCode}`);
  }

  // Set download headers
  res.set({
    'Content-Type': mimeType || remoteResponse.headers['content-type'] || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  });

  if (remoteResponse.headers['content-length']) {
    res.set('Content-Length', remoteResponse.headers['content-length']);
  }

  console.log(`[Download] Serving: ${filename} (${mimeType})`);

  return new Promise((resolve, reject) => {
    remoteResponse.pipe(res);
    remoteResponse.on('error', reject);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}

/**
 * Middleware to handle file downloads
 * Usage: app.use('/api/download/:fileId', fileDownloadHandler)
 */
function fileDownloadHandler(fileUrl, filename, mimeType) {
  return async (req, res) => {
    try {
      await proxyDownload(fileUrl, filename, mimeType, res);
    } catch (error) {
      console.error('[Download Handler] Error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Download failed',
        });
      }
    }
  };
}

module.exports = {
  proxyDownload,
  fileDownloadHandler,
};
