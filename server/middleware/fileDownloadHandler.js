/**
 * File Download Handler Middleware
 * 
 * Handles file downloads with proper Content-Disposition headers
 * Supports both direct Cloudinary URLs and S3 presigned URLs
 */

const https = require('https');
const http = require('http');

/**
 * Download file from URL and serve to client with proper headers
 * @param {string} fileUrl - URL to download file from (Cloudinary or S3)
 * @param {string} filename - Filename for download
 * @param {string} mimeType - MIME type for file
 * @param {Object} res - Express response object
 */
async function proxyDownload(fileUrl, filename, mimeType, res) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[Download] Proxy fetching: ${filename} from ${fileUrl.substring(0, 50)}...`);

      // Determine protocol
      const protocol = fileUrl.startsWith('https') ? https : http;

      // Fetch the file
      protocol
        .get(fileUrl, (remoteResponse) => {
          // Check if remote server returned an error
          if (remoteResponse.statusCode !== 200) {
            console.error(`[Download] Remote returned: ${remoteResponse.statusCode}`);
            res.status(remoteResponse.statusCode).send('Failed to fetch file');
            return reject(new Error(`Remote status: ${remoteResponse.statusCode}`));
          }

          // Set download headers BEFORE piping
          res.set({
            'Content-Type': mimeType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
          });

          console.log(`[Download] Serving: ${filename} (${mimeType})`);

          // Pipe remote response to client
          remoteResponse.pipe(res);

          remoteResponse.on('error', (err) => {
            console.error('[Download] Stream error:', err.message);
            res.status(500).send('Download error');
            reject(err);
          });

          res.on('finish', () => {
            console.log(`[Download] Completed: ${filename}`);
            resolve();
          });
        })
        .on('error', (err) => {
          console.error('[Download] Request error:', err.message);
          res.status(500).send('Download failed');
          reject(err);
        });
    } catch (error) {
      console.error('[Download] Proxy error:', error.message);
      res.status(500).send('Download error');
      reject(error);
    }
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
