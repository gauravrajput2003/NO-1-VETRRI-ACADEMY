const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const crypto = require('crypto');
const path = require('path');
    
class S3Service {
  getBucket() {
    return process.env.AWS_S3_BUCKET;
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
    });

    await s3Client.send(command);

    return {
      fileUrl: `https://${this.getBucket()}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      publicId: key,
      storageType: 's3',
      fileSize: buffer.length,
      mimeType: mimetype,
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
