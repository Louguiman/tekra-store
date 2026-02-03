import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mime from 'mime-types';

export interface MediaFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  localPath: string;
  sha256: string;
  downloadedAt: Date;
}

export interface WhatsAppMediaResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
}

@Injectable()
export class MediaStorageService {
  private readonly uploadDir: string;
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/amr',
  ];

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads/whatsapp');
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async downloadMediaFromWhatsApp(mediaId: string): Promise<MediaFile> {
    try {
      // First, get media URL from WhatsApp API
      const mediaInfo = await this.getMediaInfo(mediaId);
      
      // Validate file type and size (Requirements 8.2, 8.3)
      this.validateMediaFile(mediaInfo);

      // Download the actual file
      const fileBuffer = await this.downloadFile(mediaInfo.url);
      
      // Verify file integrity
      const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      if (calculatedHash !== mediaInfo.sha256) {
        throw new BadRequestException('File integrity check failed');
      }

      // Scan for malware (basic implementation)
      await this.scanForMalware(fileBuffer, mediaInfo.mime_type);

      // Generate unique filename
      const fileExtension = mime.extension(mediaInfo.mime_type) || 'bin';
      const uniqueFilename = `${mediaId}_${Date.now()}.${fileExtension}`;
      const localPath = path.join(this.uploadDir, uniqueFilename);

      // Save file to local storage
      await fs.writeFile(localPath, fileBuffer);

      return {
        id: mediaId,
        originalName: uniqueFilename,
        mimeType: mediaInfo.mime_type,
        size: fileBuffer.length,
        localPath,
        sha256: calculatedHash,
        downloadedAt: new Date(),
      };

    } catch (error) {
      console.error('Media download error:', error);
      throw new InternalServerErrorException(`Failed to download media: ${error.message}`);
    }
  }

  private async getMediaInfo(mediaId: string): Promise<WhatsAppMediaResponse> {
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN not configured');
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async downloadFile(url: string): Promise<Buffer> {
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`File download error: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private validateMediaFile(mediaInfo: WhatsAppMediaResponse): void {
    // Check file size (Requirement 8.2)
    if (mediaInfo.file_size > this.maxFileSize) {
      throw new BadRequestException(`File too large: ${mediaInfo.file_size} bytes (max: ${this.maxFileSize})`);
    }

    // Check MIME type (Requirement 8.2)
    if (!this.allowedMimeTypes.includes(mediaInfo.mime_type)) {
      throw new BadRequestException(`Unsupported file type: ${mediaInfo.mime_type}`);
    }
  }

  private async scanForMalware(fileBuffer: Buffer, mimeType: string): Promise<void> {
    // Basic malware scanning implementation (Requirement 8.3)
    // In production, this would integrate with a proper antivirus service
    
    // Check for suspicious patterns in different file types
    const fileContent = fileBuffer.toString('binary');
    
    // Basic checks for executable content
    const suspiciousPatterns = [
      /MZ[\x00-\xFF]{58}PE/,  // PE executable header
      /<script[^>]*>/i,        // Script tags in images/PDFs
      /javascript:/i,          // JavaScript URLs
      /vbscript:/i,           // VBScript URLs
      /data:text\/html/i,     // HTML data URLs
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileContent)) {
        throw new BadRequestException('Potentially malicious content detected');
      }
    }

    // Additional checks for PDF files
    if (mimeType === 'application/pdf') {
      // Check for embedded JavaScript in PDFs
      if (fileContent.includes('/JavaScript') || fileContent.includes('/JS')) {
        throw new BadRequestException('PDF contains potentially dangerous JavaScript');
      }
    }

    // Additional checks for image files
    if (mimeType.startsWith('image/')) {
      // Check for embedded scripts in image metadata
      if (fileContent.includes('<script') || fileContent.includes('javascript:')) {
        throw new BadRequestException('Image contains potentially dangerous content');
      }
    }
  }

  async getStoredFile(mediaId: string): Promise<MediaFile | null> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const matchingFile = files.find(file => file.startsWith(mediaId));
      
      if (!matchingFile) {
        return null;
      }

      const filePath = path.join(this.uploadDir, matchingFile);
      const stats = await fs.stat(filePath);
      
      // Extract MIME type from file extension
      const mimeType = mime.lookup(matchingFile) || 'application/octet-stream';
      
      return {
        id: mediaId,
        originalName: matchingFile,
        mimeType,
        size: stats.size,
        localPath: filePath,
        sha256: '', // Would need to recalculate if needed
        downloadedAt: stats.birthtime,
      };
    } catch (error) {
      console.error('Error retrieving stored file:', error);
      return null;
    }
  }

  async deleteStoredFile(mediaId: string): Promise<boolean> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const matchingFile = files.find(file => file.startsWith(mediaId));
      
      if (!matchingFile) {
        return false;
      }

      const filePath = path.join(this.uploadDir, matchingFile);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting stored file:', error);
      return false;
    }
  }

  async cleanupOldFiles(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.birthtime.getTime() > maxAgeMs) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return 0;
    }
  }
}