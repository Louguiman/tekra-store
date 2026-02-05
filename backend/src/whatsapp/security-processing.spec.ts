import { Test, TestingModule } from '@nestjs/testing';
import { SecurityProcessingService } from './security-processing.service';
import { AuditService } from '../audit/audit.service';

describe('SecurityProcessingService', () => {
  let service: SecurityProcessingService;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockAuditService = {
      createSecurityAlert: jest.fn(),
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityProcessingService,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<SecurityProcessingService>(SecurityProcessingService);
    auditService = module.get(AuditService);
  });

  describe('scanTextContent', () => {
    it('should pass clean text content', async () => {
      const cleanText = 'iPhone 13 Pro Max 256GB - $999\nCondition: New\nQuantity: 10';
      const result = await service.scanTextContent(cleanText, 'supplier-123');

      expect(result.passed).toBe(true);
      expect(result.threats).toHaveLength(0);
      expect(result.metadata.riskLevel).toBe('low');
    });

    it('should detect SQL injection patterns', async () => {
      const maliciousText = "Product name'; DROP TABLE products; --";
      const result = await service.scanTextContent(maliciousText, 'supplier-123');

      expect(result.passed).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats.some(t => t.type === 'suspicious_pattern')).toBe(true);
    });

    it('should detect XSS patterns', async () => {
      const maliciousText = '<script>alert("XSS")</script>';
      const result = await service.scanTextContent(maliciousText, 'supplier-123');

      expect(result.passed).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats.some(t => t.type === 'suspicious_pattern')).toBe(true);
    });

    it('should detect excessive length', async () => {
      const longText = 'A'.repeat(100000);
      const result = await service.scanTextContent(longText, 'supplier-123', {
        maxTextLength: 50000,
      });

      expect(result.threats.some(t => t.type === 'size_limit')).toBe(true);
    });

    it('should sanitize content when requested', async () => {
      const dirtyText = "Product\x00name with\x01control\x02characters";
      const result = await service.scanTextContent(dirtyText, 'supplier-123', {
        sanitizeContent: true,
      });

      expect(result.sanitizedContent).toBeDefined();
      expect(result.sanitizedContent).not.toContain('\x00');
      expect(result.sanitizedContent).not.toContain('\x01');
    });

    it('should create security alert for high-risk content', async () => {
      const maliciousText = "'; DROP TABLE users; --";
      await service.scanTextContent(maliciousText, 'supplier-123');

      expect(auditService.createSecurityAlert).toHaveBeenCalled();
    });
  });

  describe('scanFileContent', () => {
    it('should pass valid JPEG file', async () => {
      // JPEG magic number: FFD8FFE0
      const jpegBuffer = Buffer.from('FFD8FFE00010JFIF', 'hex');
      const result = await service.scanFileContent(
        jpegBuffer,
        'product.jpg',
        'image/jpeg',
        'supplier-123',
      );

      expect(result.passed).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    it('should pass valid PNG file', async () => {
      // PNG magic number: 89504E47
      const pngBuffer = Buffer.from('89504E470D0A1A0A', 'hex');
      const result = await service.scanFileContent(
        pngBuffer,
        'product.png',
        'image/png',
        'supplier-123',
      );

      expect(result.passed).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    it('should detect file size limit exceeded', async () => {
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
      const result = await service.scanFileContent(
        largeBuffer,
        'large.jpg',
        'image/jpeg',
        'supplier-123',
        { maxFileSize: 10 * 1024 * 1024 },
      );

      expect(result.threats.some(t => t.type === 'size_limit')).toBe(true);
    });

    it('should detect invalid file type', async () => {
      const buffer = Buffer.from('test content');
      const result = await service.scanFileContent(
        buffer,
        'malicious.exe',
        'application/x-msdownload',
        'supplier-123',
      );

      expect(result.threats.some(t => t.type === 'invalid_format')).toBe(true);
    });

    it('should detect magic number mismatch', async () => {
      // PNG magic number but claiming to be JPEG
      const pngBuffer = Buffer.from('89504E470D0A1A0A', 'hex');
      const result = await service.scanFileContent(
        pngBuffer,
        'fake.jpg',
        'image/jpeg',
        'supplier-123',
      );

      expect(result.threats.some(t => t.type === 'invalid_format')).toBe(true);
    });

    it('should detect executable signatures', async () => {
      // Windows PE executable signature: 4D5A
      const exeBuffer = Buffer.from('4D5A9000', 'hex');
      const result = await service.scanFileContent(
        exeBuffer,
        'malware.jpg',
        'image/jpeg',
        'supplier-123',
      );

      expect(result.threats.some(t => t.type === 'malware')).toBe(true);
    });

    it('should detect directory traversal in filename', async () => {
      const buffer = Buffer.from('test');
      const result = await service.scanFileContent(
        buffer,
        '../../../etc/passwd',
        'image/jpeg',
        'supplier-123',
      );

      expect(result.threats.some(t => t.type === 'suspicious_pattern')).toBe(true);
    });

    it('should detect executable file extensions', async () => {
      const buffer = Buffer.from('test');
      const result = await service.scanFileContent(
        buffer,
        'malware.exe',
        'image/jpeg',
        'supplier-123',
      );

      expect(result.threats.some(t => t.type === 'malware')).toBe(true);
    });
  });

  describe('encryption and hashing', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sensitive supplier information';
      const encrypted = service.encryptSensitiveData(originalData);
      const decrypted = service.decryptSensitiveData(encrypted);

      expect(decrypted).toBe(originalData);
      expect(encrypted).not.toBe(originalData);
    });

    it('should produce consistent hashes', () => {
      const data = 'test data';
      const hash1 = service.hashSensitiveData(data);
      const hash2 = service.hashSensitiveData(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should produce different hashes for different data', () => {
      const hash1 = service.hashSensitiveData('data1');
      const hash2 = service.hashSensitiveData('data2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('webhook signature validation', () => {
    it('should validate correct webhook signature', () => {
      const payload = '{"message": "test"}';
      const secret = 'webhook-secret-key';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const isValid = service.validateWebhookSignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = '{"message": "test"}';
      const secret = 'webhook-secret-key';
      const invalidSignature = 'invalid-signature';

      const isValid = service.validateWebhookSignature(payload, invalidSignature, secret);

      expect(isValid).toBe(false);
    });

    it('should reject tampered payload', () => {
      const originalPayload = '{"message": "test"}';
      const tamperedPayload = '{"message": "hacked"}';
      const secret = 'webhook-secret-key';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(originalPayload).digest('hex');

      const isValid = service.validateWebhookSignature(tamperedPayload, signature, secret);

      expect(isValid).toBe(false);
    });
  });

  describe('risk level calculation', () => {
    it('should return low risk for no threats', async () => {
      const cleanText = 'Normal product description';
      const result = await service.scanTextContent(cleanText, 'supplier-123');

      expect(result.metadata.riskLevel).toBe('low');
    });

    it('should return high risk for SQL injection', async () => {
      const maliciousText = "'; DROP TABLE products; --";
      const result = await service.scanTextContent(maliciousText, 'supplier-123');

      expect(['high', 'critical']).toContain(result.metadata.riskLevel);
    });

    it('should return critical risk for executable files', async () => {
      const exeBuffer = Buffer.from('4D5A9000', 'hex');
      const result = await service.scanFileContent(
        exeBuffer,
        'malware.exe',
        'image/jpeg',
        'supplier-123',
      );

      expect(result.metadata.riskLevel).toBe('critical');
    });
  });

  describe('performance', () => {
    it('should scan text content quickly', async () => {
      const text = 'Product description '.repeat(100);
      const startTime = Date.now();
      
      await service.scanTextContent(text, 'supplier-123');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should scan file content quickly', async () => {
      const buffer = Buffer.alloc(1024 * 1024); // 1MB
      const startTime = Date.now();
      
      await service.scanFileContent(buffer, 'test.jpg', 'image/jpeg', 'supplier-123');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });
});
