import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AuditService } from './audit.service';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { SecurityAlert, AlertType, AlertSeverity } from '../entities/security-alert.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name);

  constructor(
    private readonly auditService: AuditService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async checkFailedLoginAttempts(ipAddress: string, userId?: string): Promise<void> {
    const timeWindow = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
    const maxAttempts = 5;

    // Check failed login attempts from this IP
    const failedAttempts = await this.auditLogRepository.count({
      where: {
        action: AuditAction.LOGIN,
        success: false,
        ipAddress,
        createdAt: MoreThan(timeWindow),
      },
    });

    if (failedAttempts >= maxAttempts) {
      await this.auditService.createSecurityAlert({
        type: AlertType.FAILED_LOGIN,
        severity: AlertSeverity.HIGH,
        description: `Multiple failed login attempts detected from IP ${ipAddress}`,
        details: {
          ipAddress,
          failedAttempts,
          timeWindow: '15 minutes',
          userId,
        },
        affectedUserId: userId,
        ipAddress,
      });

      this.logger.warn(`Security Alert: ${failedAttempts} failed login attempts from IP ${ipAddress}`);
    }
  }

  async checkUnusualActivity(userId: string, ipAddress: string, userAgent: string): Promise<void> {
    const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    // Check for unusual IP addresses
    const recentIps = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('DISTINCT audit.ipAddress', 'ipAddress')
      .where('audit.userId = :userId', { userId })
      .andWhere('audit.createdAt > :timeWindow', { timeWindow })
      .andWhere('audit.success = true')
      .getRawMany();

    const knownIps = recentIps.map(row => row.ipAddress).filter(ip => ip && ip !== 'unknown');
    
    if (knownIps.length > 0 && !knownIps.includes(ipAddress)) {
      // Check if this is the first time seeing this IP for this user
      const historicalIpCount = await this.auditLogRepository.count({
        where: {
          userId,
          ipAddress,
          success: true,
        },
      });

      if (historicalIpCount === 0) {
        await this.auditService.createSecurityAlert({
          type: AlertType.SUSPICIOUS_ACTIVITY,
          severity: AlertSeverity.MEDIUM,
          description: `User accessing from new IP address`,
          details: {
            userId,
            newIpAddress: ipAddress,
            knownIps,
            userAgent,
          },
          affectedUserId: userId,
          ipAddress,
          userAgent,
        });
      }
    }

    // Check for unusual activity patterns (high frequency actions)
    const recentActions = await this.auditLogRepository.count({
      where: {
        userId,
        createdAt: MoreThan(new Date(Date.now() - 60 * 60 * 1000)), // 1 hour
      },
    });

    if (recentActions > 100) { // More than 100 actions in an hour
      await this.auditService.createSecurityAlert({
        type: AlertType.UNUSUAL_PATTERN,
        severity: AlertSeverity.MEDIUM,
        description: `Unusually high activity detected for user`,
        details: {
          userId,
          actionsInLastHour: recentActions,
          ipAddress,
          userAgent,
        },
        affectedUserId: userId,
        ipAddress,
        userAgent,
      });
    }
  }

  async checkPrivilegeEscalation(userId: string, targetUserId: string, newRole: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });

    if (!user || !targetUser) return;

    // Check if a non-admin is trying to change roles
    if (user.role !== 'admin' && targetUser.role !== newRole) {
      await this.auditService.createSecurityAlert({
        type: AlertType.PRIVILEGE_ESCALATION,
        severity: AlertSeverity.CRITICAL,
        description: `Non-admin user attempting to change user roles`,
        details: {
          actorUserId: userId,
          actorRole: user.role,
          targetUserId,
          currentRole: targetUser.role,
          attemptedRole: newRole,
        },
        affectedUserId: targetUserId,
      });
    }

    // Check if someone is trying to escalate to admin
    if (newRole === 'admin' && targetUser.role !== 'admin') {
      await this.auditService.createSecurityAlert({
        type: AlertType.PRIVILEGE_ESCALATION,
        severity: AlertSeverity.CRITICAL,
        description: `Attempt to escalate user to admin role`,
        details: {
          actorUserId: userId,
          actorRole: user.role,
          targetUserId,
          currentRole: targetUser.role,
          newRole,
        },
        affectedUserId: targetUserId,
      });
    }
  }

  async checkDataAccess(userId: string, resourceType: string, resourceId: string, action: string): Promise<void> {
    // Check for bulk data access patterns
    const timeWindow = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
    const recentAccess = await this.auditLogRepository.count({
      where: {
        userId,
        resource: resourceType as any,
        createdAt: MoreThan(timeWindow),
      },
    });

    if (recentAccess > 50) { // More than 50 resource accesses in an hour
      await this.auditService.createSecurityAlert({
        type: AlertType.DATA_BREACH_ATTEMPT,
        severity: AlertSeverity.HIGH,
        description: `Potential bulk data access detected`,
        details: {
          userId,
          resourceType,
          accessCount: recentAccess,
          timeWindow: '1 hour',
          lastResourceId: resourceId,
          action,
        },
        affectedUserId: userId,
      });
    }
  }

  async checkSystemAnomalies(): Promise<void> {
    const timeWindow = new Date(Date.now() - 60 * 60 * 1000); // 1 hour

    // Check for unusual error rates
    const [totalActions, failedActions] = await Promise.all([
      this.auditLogRepository.count({
        where: { createdAt: MoreThan(timeWindow) },
      }),
      this.auditLogRepository.count({
        where: {
          createdAt: MoreThan(timeWindow),
          success: false,
        },
      }),
    ]);

    if (totalActions > 0) {
      const errorRate = (failedActions / totalActions) * 100;
      
      if (errorRate > 20) { // More than 20% error rate
        await this.auditService.createSecurityAlert({
          type: AlertType.SYSTEM_ANOMALY,
          severity: AlertSeverity.HIGH,
          description: `High system error rate detected`,
          details: {
            totalActions,
            failedActions,
            errorRate: Math.round(errorRate * 100) / 100,
            timeWindow: '1 hour',
          },
        });
      }
    }

    // Check for unusual admin activity
    const adminActions = await this.auditLogRepository.count({
      where: {
        createdAt: MoreThan(timeWindow),
      },
      relations: ['user'],
    });

    // Get admin actions with user info
    const adminActionsWithUsers = await this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoin('audit.user', 'user')
      .where('audit.createdAt > :timeWindow', { timeWindow })
      .andWhere('user.role IN (:...roles)', { roles: ['admin', 'staff'] })
      .getCount();

    if (adminActionsWithUsers > 200) { // More than 200 admin actions in an hour
      await this.auditService.createSecurityAlert({
        type: AlertType.SYSTEM_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        description: `Unusually high admin activity detected`,
        details: {
          adminActions: adminActionsWithUsers,
          timeWindow: '1 hour',
        },
      });
    }
  }

  async performSecurityScan(): Promise<void> {
    try {
      this.logger.log('Starting security scan...');
      
      await this.checkSystemAnomalies();
      
      this.logger.log('Security scan completed');
    } catch (error) {
      this.logger.error('Security scan failed', error);
    }
  }
}