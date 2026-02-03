import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { DataSanitizer } from '../validators/data-sanitizer';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  constructor(private readonly schema?: Record<string, any>) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return value;

    try {
      // Apply sanitization based on the schema if provided
      if (this.schema) {
        return DataSanitizer.sanitizeObject(value, this.schema);
      }

      // Default sanitization for common types
      if (typeof value === 'string') {
        return DataSanitizer.sanitizeText(value);
      }

      if (typeof value === 'object' && value !== null) {
        return DataSanitizer.sanitizeObject(value);
      }

      return value;
    } catch (error) {
      throw new BadRequestException(`Data validation failed: ${error.message}`);
    }
  }
}

// Specific sanitization pipes for common use cases
@Injectable()
export class EmailSanitizationPipe implements PipeTransform {
  transform(value: any) {
    if (!value) return value;
    return DataSanitizer.sanitizeEmail(value);
  }
}

@Injectable()
export class PhoneSanitizationPipe implements PipeTransform {
  transform(value: any) {
    if (!value) return value;
    return DataSanitizer.sanitizePhone(value);
  }
}

@Injectable()
export class UuidSanitizationPipe implements PipeTransform {
  transform(value: any) {
    if (!value) return value;
    return DataSanitizer.sanitizeUuid(value);
  }
}

@Injectable()
export class NumberSanitizationPipe implements PipeTransform {
  constructor(private readonly min?: number, private readonly max?: number) {}

  transform(value: any) {
    if (value === null || value === undefined) return value;
    return DataSanitizer.sanitizeNumber(value, this.min, this.max);
  }
}

@Injectable()
export class IntegerSanitizationPipe implements PipeTransform {
  constructor(private readonly min?: number, private readonly max?: number) {}

  transform(value: any) {
    if (value === null || value === undefined) return value;
    return DataSanitizer.sanitizeInteger(value, this.min, this.max);
  }
}