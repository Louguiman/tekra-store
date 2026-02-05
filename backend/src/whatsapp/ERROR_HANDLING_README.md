# Error Handling and Recovery System

## Overview

This document describes the comprehensive error handling and recovery system implemented for the WhatsApp Supplier Automation feature. The system provides robust retry mechanisms, transaction management, health monitoring, and error escalation capabilities.

## Components

### 1. ErrorRecoveryService (`error-recovery.service.ts`)

Handles retry logic, failed operation queuing, and database transaction management.

**Key Features:**
- **Exponential Backoff Retry**: Automatically retries failed operations with configurable backoff
- **Failed Operations Queue**: Maintains a queue of failed operations for later retry
- **Transaction Management**: Provides automatic rollback on failures
- **Queue Statistics**: Tracks failed operations by type and status

**Configuration:**
```typescript
const defaultRetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};
```

**Usage Example:**
```typescript
// Retry an operation with exponential backoff
const result = await errorRecoveryService.executeWithRetry(
  () => someOperation(),
  'operation-name',
  { maxRetries: 3, initialDelayMs: 500 }
);

// Execute in transaction with automatic rollback
await errorRecoveryService.executeInTransaction(
  async (queryRunner) => {
    // Your database operations here
  },
  'transaction-name'
);

// Queue a failed operation for retry
await errorRecoveryService.queueFailedOperation(
  'ai_extraction',
  error,
  submissionId,
  metadata
);
```

### 2. HealthMonitoringService (`health-monitoring.service.ts`)

Provides comprehensive health checks, system metrics collection, and critical error tracking.

**Key Features:**
- **Health Checks**: Database, submission processing, error rate, queue health, configuration
- **System Metrics**: Submissions, processing times, suppliers, errors
- **Critical Error Tracking**: Records and escalates critical errors
- **Diagnostic Information**: Comprehensive system diagnostics

**Health Check Endpoints:**
- `GET /whatsapp/health` - Public health check
- `GET /whatsapp/health/metrics` - System metrics (Admin/Staff)
- `GET /whatsapp/health/diagnostics` - Full diagnostics (Admin only)
- `GET /whatsapp/health/errors` - Unresolved errors (Admin only)
- `PATCH /whatsapp/health/errors/:errorId/resolve` - Resolve error (Admin only)

**Health Status Levels:**
- **Healthy**: All checks pass
- **Degraded**: Some warnings present
- **Unhealthy**: One or more checks failed

**Escalation Thresholds:**
```typescript
const escalationThreshold = {
  low: 10,      // Escalate after 10 low-severity errors
  medium: 5,    // Escalate after 5 medium-severity errors
  high: 2,      // Escalate after 2 high-severity errors
  critical: 1,  // Escalate immediately
};
```

### 3. ErrorRecoverySchedulerService (`error-recovery-scheduler.service.ts`)

Automated background tasks for error recovery and monitoring.

**Scheduled Tasks:**
- **Every 5 minutes**: Process failed operations queue
- **Every 10 minutes**: Perform health checks
- **Every 30 minutes**: Check for stuck submissions
- **Every hour**: Collect and log system metrics
- **Daily at midnight**: Cleanup old resolved errors

**Note**: Requires `@nestjs/schedule` package to be installed:
```bash
npm install @nestjs/schedule
```

### 4. Enhanced WhatsApp Service Integration

The WhatsApp service has been enhanced to use error recovery and monitoring:

**Media Download with Retry:**
```typescript
const result = await errorRecoveryService.executeWithRetry(
  () => mediaStorageService.downloadMediaFromWhatsApp(mediaId),
  `downloadMedia-${mediaId}`,
  { maxRetries: 3, initialDelayMs: 500 }
);
```

**AI Processing with Transaction:**
```typescript
await errorRecoveryService.executeInTransaction(
  async (queryRunner) => {
    // Update submission status
    // Process with AI
    // Save results
  },
  `processSubmissionWithAI-${submissionId}`
);
```

**Critical Error Recording:**
```typescript
await healthMonitoringService.recordCriticalError(
  'ai-processing',
  `AI processing failed: ${error.message}`,
  'high',
  { submissionId, contentType }
);
```

## API Endpoints

### Error Recovery Endpoints

**Get Failed Operations Queue:**
```
GET /whatsapp/recovery/queue
Authorization: Bearer <token>
Roles: Admin, Staff
```

**Get Queue Statistics:**
```
GET /whatsapp/recovery/queue/stats
Authorization: Bearer <token>
Roles: Admin, Staff
```

**Retry Failed Submission:**
```
POST /whatsapp/recovery/retry/:submissionId
Authorization: Bearer <token>
Roles: Admin, Staff
```

**Get Processing Logs:**
```
GET /whatsapp/recovery/logs/:submissionId
Authorization: Bearer <token>
Roles: Admin, Staff
```

**Mark Submission as Permanently Failed:**
```
POST /whatsapp/recovery/mark-failed/:submissionId
Body: { "reason": "Max retries exceeded" }
Authorization: Bearer <token>
Roles: Admin only
```

### Health Monitoring Endpoints

**Public Health Check:**
```
GET /whatsapp/health
No authentication required
```

**System Metrics:**
```
GET /whatsapp/health/metrics
Authorization: Bearer <token>
Roles: Admin, Staff
```

**Full Diagnostics:**
```
GET /whatsapp/health/diagnostics
Authorization: Bearer <token>
Roles: Admin only
```

**Unresolved Errors:**
```
GET /whatsapp/health/errors
Authorization: Bearer <token>
Roles: Admin only
```

**Resolve Error:**
```
PATCH /whatsapp/health/errors/:errorId/resolve
Authorization: Bearer <token>
Roles: Admin only
```

## Requirements Mapping

### Requirement 10.1: Exponential Backoff for Webhook Retries
- ✅ Implemented in `ErrorRecoveryService.executeWithRetry()`
- ✅ Configurable retry parameters
- ✅ Jitter added to prevent thundering herd

### Requirement 10.2: Queue Management for Failed Operations
- ✅ Failed operations queue with retry scheduling
- ✅ Queue statistics and monitoring
- ✅ Automatic retry processing via scheduler

### Requirement 10.3: Database Transaction Rollback Logic
- ✅ Implemented in `ErrorRecoveryService.executeInTransaction()`
- ✅ Automatic rollback on errors
- ✅ Audit logging of rollbacks

### Requirement 10.4: Critical Error Escalation System
- ✅ Error severity levels (low, medium, high, critical)
- ✅ Automatic escalation based on thresholds
- ✅ Error resolution tracking

### Requirement 10.5: Health Checks and Monitoring Endpoints
- ✅ Comprehensive health checks
- ✅ System metrics collection
- ✅ Diagnostic information gathering
- ✅ Public and authenticated endpoints

## Testing

### Unit Tests

**ErrorRecoveryService Tests** (`error-recovery.spec.ts`):
- ✅ Retry logic with exponential backoff
- ✅ Failed operation queue management
- ✅ Transaction management
- ✅ Queue statistics

**HealthMonitoringService Tests** (`health-monitoring.spec.ts`):
- ✅ Health check execution
- ✅ System metrics collection
- ✅ Critical error recording and escalation
- ✅ Error resolution
- ✅ Diagnostic information collection

### Running Tests

```bash
cd backend
npm test -- error-recovery.spec.ts
npm test -- health-monitoring.spec.ts
```

## Configuration

### Environment Variables

```env
# WhatsApp Configuration (required for health checks)
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret
WHATSAPP_API_TOKEN=your-api-token

# AI Service Configuration (optional)
OLLAMA_BASE_URL=http://localhost:11434
```

### Retry Configuration

Customize retry behavior per operation:

```typescript
await errorRecoveryService.executeWithRetry(
  operation,
  'operation-name',
  {
    maxRetries: 3,           // Number of retry attempts
    initialDelayMs: 1000,    // Initial delay before first retry
    maxDelayMs: 30000,       // Maximum delay between retries
    backoffMultiplier: 2,    // Exponential backoff multiplier
  }
);
```

## Monitoring and Alerting

### Health Check Integration

The health check endpoint can be integrated with monitoring tools:

```bash
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /whatsapp/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

# Prometheus metrics (future enhancement)
# The system metrics can be exposed in Prometheus format
```

### Error Escalation

Critical errors are automatically escalated when thresholds are reached. In production, this should trigger:
- Email notifications to administrators
- SMS alerts for critical errors
- PagerDuty/OpsGenie integration
- Slack/Teams notifications

### Logging

All error recovery and monitoring activities are logged with appropriate levels:
- **INFO**: Normal operations, successful retries
- **WARN**: Degraded health, high pending counts
- **ERROR**: Failed operations, critical errors

## Future Enhancements

1. **Prometheus Metrics**: Export metrics in Prometheus format
2. **Grafana Dashboards**: Pre-built dashboards for monitoring
3. **Alert Manager Integration**: Automated alerting based on metrics
4. **Dead Letter Queue**: Separate queue for permanently failed operations
5. **Retry Policies**: Per-operation retry policies
6. **Circuit Breaker**: Prevent cascading failures
7. **Rate Limiting**: Prevent retry storms

## Troubleshooting

### High Error Rate

If error rate exceeds 25%:
1. Check health diagnostics: `GET /whatsapp/health/diagnostics`
2. Review unresolved errors: `GET /whatsapp/health/errors`
3. Check processing logs for failed submissions
4. Verify external service availability (WhatsApp API, AI services)

### Stuck Submissions

If submissions are stuck in processing:
1. Check queue health in health check response
2. Review processing logs: `GET /whatsapp/recovery/logs/:submissionId`
3. Manually retry: `POST /whatsapp/recovery/retry/:submissionId`
4. Mark as failed if unrecoverable: `POST /whatsapp/recovery/mark-failed/:submissionId`

### Queue Buildup

If failed operations queue is growing:
1. Check queue statistics: `GET /whatsapp/recovery/queue/stats`
2. Review failed operations: `GET /whatsapp/recovery/queue`
3. Identify common failure patterns
4. Address root cause (service outages, configuration issues)

## Conclusion

The error handling and recovery system provides comprehensive resilience for the WhatsApp Supplier Automation feature. It ensures that temporary failures don't result in data loss, provides visibility into system health, and enables rapid response to critical issues.
