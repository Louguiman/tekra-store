import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, AuditResource, AuditSeverity } from '../../entities/audit-log.entity';
import { SecurityMonitorService } from '../../audit/security-monitor.service';
import { AlertType, AlertSeverity } from '../../entities/security-alert.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
    private securityMonitor: SecurityMonitorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const hasRole = requiredRoles.some((role) => user?.role === role);

    if (!hasRole && user) {
      // Log unauthorized access attempt
      const ipAddress = this.getClientIp(request);
      const userAgent = request.headers['user-agent'];

      await this.auditService.logAction({
        userId: user.id,
        action: AuditAction.ACCESS_DENIED,
        resource: AuditResource.SYSTEM,
        severity: AuditSeverity.HIGH,
        description: `Unauthorized access attempt to ${request.method} ${request.url}`,
        metadata: {
          requiredRoles,
          userRole: user.role,
          endpoint: request.url,
          method: request.method,
        },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Insufficient permissions',
      });

      // Create security alert for unauthorized access
      await this.auditService.createSecurityAlert({
        type: AlertType.UNAUTHORIZED_ACCESS,
        severity: AlertSeverity.MEDIUM,
        description: `User attempted to access restricted endpoint`,
        details: {
          userId: user.id,
          userRole: user.role,
          requiredRoles,
          endpoint: request.url,
          method: request.method,
        },
        affectedUserId: user.id,
        ipAddress,
        userAgent,
      });
    }

    return hasRole;
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
}