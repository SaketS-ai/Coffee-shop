import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const UPLOADS_DIR = path.join(__dirname, '../../uploads');

class StorageService {
  private s3Client: S3Client | null = null;
  private isS3: boolean = false;

  constructor() {
    if (env.awsS3Bucket) {
      const clientConfig: {
        region: string;
        credentials?: { accessKeyId: string; secretAccessKey: string };
      } = {
        region: env.awsRegion,
      };

      if (env.awsAccessKeyId && env.awsSecretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: env.awsAccessKeyId,
          secretAccessKey: env.awsSecretAccessKey,
        };
      }

      this.s3Client = new S3Client(clientConfig);
      this.isS3 = true;
      logger.info(`StorageService: AWS S3 storage enabled (bucket: ${env.awsS3Bucket}, region: ${env.awsRegion})`);
    } else {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      logger.info(`StorageService: Local filesystem storage enabled (${UPLOADS_DIR})`);
    }
  }

  public isS3Configured(): boolean {
    return this.isS3;
  }

  /**
   * Uploads an image file to either AWS S3 or local disk storage (dev mode).
   * Returns the publicly accessible URL or local relative path.
   */
  public async uploadImage(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;

    if (this.isS3 && this.s3Client) {
      const key = `${folder}/${filename}`;
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: env.awsS3Bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      if (env.awsCloudfrontUrl) {
        return `${env.awsCloudfrontUrl}/${key}`;
      }

      return `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
    }

    // Local development fallback
    const targetPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(targetPath, file.buffer);
    return `/uploads/${filename}`;
  }
}

export const storageService = new StorageService();
