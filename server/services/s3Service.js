const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const crypto = require('crypto');
const path = require('path');
    
const fs = require('fs');

class S3Service {
  getBucket() {
    return process.env.AWS_S3_BUCKET;
  }

  /**
   * Upload file from disk via stream to avoid RAM bloat
   */
  async uploadFileFromDisk(filePath, mimetype, originalname, folder = 'materials', options = {}) {
    if (!this.getBucket()) throw new Error('S3 bucket not configured');
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const stats = fs.statSync(filePath);
    const extension = originalname ? path.extname(originalname) : '';
    const cleanBaseName = originalname ? path.basename(originalname, extension).replace(/[^a-zA-Z0-9]/g, '_') : '';
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${cleanBaseName}${extension}`;

    const stream = fs.createReadStream(filePath);

    try {
      const command = new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        Body: stream,
        ContentType: mimetype,
        ContentLength: stats.size,
      });

      await s3Client.send(command);

      // Clean up temp file
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`[S3 Storage] Failed to clean up: ${filePath}`, err.message);
        });
      }

      return {
        fileUrl: `https://${this.getBucket()}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`,
        publicId: key,
        originalFilename: originalname || path.basename(key),
        extension: extension.replace('.', ''),
        storageType: 's3',
        fileSize: stats.size,
        mimeType: mimetype,
        resourceType: 'raw',
      };
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`[S3 Storage] Failed to clean up on error: ${filePath}`, err.message);
        });
      }
      throw error;
    }
  }

  async uploadFile(buffer, mimetype, folder = 'materials', options = {}) {
    if (!this.getBucket()) throw new Error('S3 bucket not configured');

    const extension = options.originalName ? path.extname(options.originalName) : '';
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.getBucket(),
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ContentLength: buffer.length,
    });

    await s3Client.send(command);

    return {
      fileUrl: `https://${this.getBucket()}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`,
      publicId: key,
      originalFilename: options.originalName || path.basename(key),
      extension: extension.replace('.', ''),
      storageType: 's3',
      fileSize: buffer.length,
      mimeType: mimetype,
      resourceType: 'raw',
    };
  }

  async deleteFile(publicId, resourceType = 'raw') {
    if (!this.getBucket() || !publicId) return false;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: publicId,
      });
      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      return false;
    }
  }

  async getDownloadUrl(fileUrl, publicId) {
    if (!this.getBucket() || !publicId) return fileUrl;

    try {
      const command = new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: publicId,
        ResponseContentDisposition: 'inline',
      });
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return signedUrl;
    } catch (error) {
      console.error('S3 presign error:', error);
      return fileUrl;
    }
  }
}

module.exports = new S3Service();
