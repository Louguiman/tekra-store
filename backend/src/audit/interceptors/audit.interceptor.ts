import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../audit.service';
import { AuditAction, AuditResource, AuditSeverity } from '../../entities/audit-log.entity';
import { AUDIT_METADATA_KEY } from '../decorators/audit.decorator';

export interface AuditMetadata {
  action: AuditAction;
  resource: AuditResource;
  severity?: AuditSeverity;
  description?: string;
  resourceIdParam?: string; // Parameter name that contains the resource ID
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMetadata = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const startTime = Date.now();

    // Extract resource ID from request parameters if specified
    let resourceId: string | undefined;
    if (auditMetadata.resourceIdParam && request.params) {
      resourceId = request.params[auditMetadata.resourceIdParam];
    }

    // Extract IP address and user agent
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];
    const sessionId = request.sessionID || request.headers['x-session-id'];

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const duration = Date.now() - startTime;
          
          await this.auditService.logAction({
            userId: user?.id,
            action: auditMetadata.action,
            resource: auditMetadata.resource,
            resourceId,
            severity: auditMetadata.severity || AuditSeverity.LOW,
            description: auditMetadata.description || `${auditMetadata.action} ${auditMetadata.resource}`,
            metadata: {
              method: request.method,
              url: request.url,
              duration,
              responseSize: JSON.stringify(response).length,
              requestBody: this.sanitizeRequestBody(request.body),
            },
            ipAddress,
            userAgent,
            sessionId,
            success: true,
          });
        } catch (error) {
          this.logger.error('Failed to log successful audit action', error);
        }
      }),
      catchError(async (error) => {
        try {
          const duration = Date.now() - startTime;
          
          await this.auditService.logAction({
            userId: user?.id,
            action: auditMetadata.action,
            resource: auditMetadata.resource,
            resourceId,
            severity: AuditSeverity.MEDIUM,
            description: `Failed ${auditMetadata.action} ${auditMetadata.resource}`,
            metadata: {
              method: request.method,
              url: request.url,
              duration,
              requestBody: this.sanitizeRequestBody(request.body),
            },
            ipAddress,
            userAgent,
            sessionId,
            success: false,
            errorMessage: error.message,
          });
        } catch (auditError) {
          this.logger.error('Failed to log failed audit action', auditError);
        }
        
        throw error;
      }),
    );
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return undefined;

    // Remove sensitive fields
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'key'];
    const sanitized = { ...body };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const result = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };

    return sanitizeObject(sanitized);
  }
}