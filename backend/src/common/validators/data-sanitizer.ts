import { BadRequestException } from '@nestjs/common';
import * as validator from 'validator';
import * as DOMPurify from 'isomorphic-dompurify';

export class DataSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Sanitize and validate email addresses
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return '';
    
    const sanitized = email.trim().toLowerCase();
    
    if (!validator.isEmail(sanitized)) {
      throw new BadRequestException('Invalid email format');
    }
    
    return sanitized;
  }

  /**
   * Sanitize phone numbers (remove non-numeric characters except +)
   */
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') return '';
    
    // Remove all characters except digits, +, -, (, ), and spaces
    let sanitized = phone.replace(/[^\d+\-\(\)\s]/g, '');
    
    // Remove extra spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    if (sanitized.length < 8 || sanitized.length > 20) {
      throw new BadRequestException('Invalid phone number length');
    }
    
    return sanitized;
  }

  /**
   * Sanitize text input to prevent injection attacks
   */
  static sanitizeText(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: any, min?: number, max?: number): number {
    const num = parseFloat(input);
    
    if (isNaN(num)) {
      throw new BadRequestException('Invalid numeric value');
    }
    
    if (min !== undefined && num < min) {
      throw new BadRequestException(`Value must be at least ${min}`);
    }
    
    if (max !== undefined && num > max) {
      throw new BadRequestException(`Value must be at most ${max}`);
    }
    
    return num;
  }

  /**
   * Sanitize integer input
   */
  static sanitizeInteger(input: any, min?: number, max?: number): number {
    const num = parseInt(input, 10);
    
    if (isNaN(num)) {
      throw new BadRequestException('Invalid integer value');
    }
    
    if (min !== undefined && num < min) {
      throw new BadRequestException(`Value must be at least ${min}`);
    }
    
    if (max !== undefined && num > max) {
      throw new BadRequestException(`Value must be at most ${max}`);
    }
    
    return num;
  }

  /**
   * Sanitize boolean input
   */
  static sanitizeBoolean(input: any): boolean {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      const lower = input.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
    }
    if (typeof input === 'number') {
      return input !== 0;
    }
    
    throw new BadRequestException('Invalid boolean value');
  }

  /**
   * Sanitize UUID input
   */
  static sanitizeUuid(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new BadRequestException('UUID is required');
    }
    
    const sanitized = input.trim();
    
    if (!validator.isUUID(sanitized)) {
      throw new BadRequestException('Invalid UUID format');
    }
    
    return sanitized;
  }

  /**
   * Sanitize URL input
   */
  static sanitizeUrl(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    const sanitized = input.trim();
    
    if (!validator.isURL(sanitized, {
      protocols: ['http', 'https'],
      require_protocol: true,
    })) {
      throw new BadRequestException('Invalid URL format');
    }
    
    return sanitized;
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJson(input: any): any {
    if (input === null || input === undefined) return null;
    
    try {
      // If it's already an object, stringify and parse to ensure it's valid JSON
      if (typeof input === 'object') {
        const jsonString = JSON.stringify(input);
        return JSON.parse(jsonString);
      }
      
      // If it's a string, try to parse it
      if (typeof input === 'string') {
        return JSON.parse(input);
      }
      
      throw new Error('Invalid JSON input type');
    } catch (error) {
      throw new BadRequestException('Invalid JSON format');
    }
  }

  /**
   * Sanitize file path to prevent directory traversal
   */
  static sanitizeFilePath(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove directory traversal attempts
    let sanitized = input.replace(/\.\./g, '');
    
    // Remove leading slashes
    sanitized = sanitized.replace(/^\/+/, '');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Limit to alphanumeric, hyphens, underscores, dots, and forward slashes
    sanitized = sanitized.replace(/[^a-zA-Z0-9\-_\.\/]/g, '');
    
    return sanitized;
  }

  /**
   * Sanitize SQL-like input to prevent injection
   */
  static sanitizeSqlInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;|'|"|`)/g,
      /(\bOR\b|\bAND\b)(\s+\d+\s*=\s*\d+)/gi,
    ];
    
    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized.trim();
  }

  /**
   * Comprehensive object sanitization
   */
  static sanitizeObject(obj: any, schema?: Record<string, any>): any {
    if (obj === null || obj === undefined) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, schema));
    }
    
    if (typeof obj !== 'object') {
      return obj;
    }
    
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      
      // Apply schema-based sanitization if provided
      if (schema && schema[key]) {
        const fieldSchema = schema[key];
        
        switch (fieldSchema.type) {
          case 'string':
            sanitized[key] = this.sanitizeText(value as string, fieldSchema.maxLength);
            break;
          case 'email':
            sanitized[key] = this.sanitizeEmail(value as string);
            break;
          case 'phone':
            sanitized[key] = this.sanitizePhone(value as string);
            break;
          case 'number':
            sanitized[key] = this.sanitizeNumber(value, fieldSchema.min, fieldSchema.max);
            break;
          case 'integer':
            sanitized[key] = this.sanitizeInteger(value, fieldSchema.min, fieldSchema.max);
            break;
          case 'boolean':
            sanitized[key] = this.sanitizeBoolean(value);
            break;
          case 'uuid':
            sanitized[key] = this.sanitizeUuid(value as string);
            break;
          case 'url':
            sanitized[key] = this.sanitizeUrl(value as string);
            break;
          case 'json':
            sanitized[key] = this.sanitizeJson(value);
            break;
          default:
            sanitized[key] = this.sanitizeObject(value, fieldSchema.properties);
        }
      } else {
        // Default sanitization
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeText(value);
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  }
}