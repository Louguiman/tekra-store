import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditResource, AuditSeverity } from '../../entities/audit-log.entity';

export const AUDIT_METADATA_KEY = 'audit_metadata';

export interface AuditOptions {
  action: AuditAction;
  resource: AuditResource;
  severity?: AuditSeverity;
  description?: string;
  resourceIdParam?: string;
}

export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_METADATA_KEY, options);