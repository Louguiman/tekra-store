import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('R2_ENDPOINT');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME');
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL');
    this.isEnabled = this.configService.get<string>('R2_ENABLED') !== 'false';

    if (this.isEnabled && endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('Cloudflare R2 storage initialized');
    } else {
      this.logger.warn('Cloudflare R2 storage is disabled or not configured. Local simulation will be used.');
    }
  }

  isStorageEnabled(): boolean {
    return this.isEnabled && !!this.s3Client;
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'products'): Promise<string> {
    if (!this.isStorageEnabled()) {
      this.logger.log(`Simulation: Uploading ${file.originalname} to local storage`);
      return `/uploads/${folder}/${Date.now()}-${file.originalname}`;
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = `${folder}/${fileName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return `${this.publicUrl}/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file to R2: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(url: string): Promise<void> {
    if (!this.isStorageEnabled()) {
      this.logger.log(`Simulation: Deleting file at ${url}`);
      return;
    }

    try {
      // Extract key from URL
      // Assuming publicUrl is something like https://pub-xxx.r2.dev
      const key = url.replace(`${this.publicUrl}/`, '');

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete file from R2: ${error.message}`);
    }
  }
}
