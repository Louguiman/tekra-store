# WhatsApp Supplier Integration - Admin Endpoints

## Overview

This document describes the admin endpoints for managing the WhatsApp Supplier Integration pipeline. These endpoints allow administrators to monitor, manage, and troubleshoot the complete supplier submission workflow.

## Authentication

All endpoints require:
- JWT authentication
- Admin or Staff role (some endpoints require Admin only)

## Endpoints

### Pipeline Statistics

#### GET /admin/whatsapp/pipeline/stats
Get overall pipeline statistics including submission counts and approval rates.

**Authorization**: Admin, Staff

**Response**:
```json
{
  "total": 100,
  "processing": {
    "pending": 10,
    "inProgress": 5,
    "completed": 75,
    "failed": 10
  },
  "validation": {
    "pending": 20,
    "approved": 60,
    "rejected": 15
  },
  "approvalRate": "60.00%"
}
```

---

### Submission Management

#### GET /admin/whatsapp/submissions
Get list of WhatsApp submissions with filtering and pagination.

**Authorization**: Admin, Staff

**Query Parameters**:
- `status` (optional): Filter by processing status (`pending`, `processing`, `completed`, `failed`)
- `validationStatus` (optional): Filter by validation status (`pending`, `approved`, `rejected`)
- `supplierId` (optional): Filter by supplier ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**:
```json
{
  "submissions": [
    {
      "id": "uuid",
      "whatsappMessageId": "wamid.xxx",
      "contentType": "text",
      "originalContent": "iPhone 13 Pro...",
      "mediaUrl": null,
      "processingStatus": "completed",
      "validationStatus": "pending",
      "extractedData": [...],
      "supplier": {
        "id": "uuid",
        "name": "Tech Supplier Inc",
        "phoneNumber": "+1234567890"
      },
      "createdAt": "2026-02-05T10:00:00Z",
      "updatedAt": "2026-02-05T10:05:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

---

#### GET /admin/whatsapp/submissions/:id
Get detailed information about a specific submission.

**Authorization**: Admin, Staff

**Path Parameters**:
- `id`: Submission UUID

**Response**:
```json
{
  "id": "uuid",
  "whatsappMessageId": "wamid.xxx",
  "contentType": "text",
  "originalContent": "iPhone 13 Pro 256GB - $999 - Qty: 10",
  "mediaUrl": null,
  "processingStatus": "completed",
  "validationStatus": "pending",
  "extractedData": [
    {
      "name": "iPhone 13 Pro 256GB",
      "brand": "Apple",
      "category": "Smartphones",
      "condition": "new",
      "price": 999,
      "currency": "USD",
      "quantity": 10,
      "confidenceScore": 95,
      "extractionMetadata": {
        "sourceType": "text",
        "processingTime": 1500,
        "aiModel": "llama-3.2-1b",
        "extractedFields": ["name", "brand", "price", "quantity"]
      }
    }
  ],
  "supplier": {
    "id": "uuid",
    "name": "Tech Supplier Inc",
    "phoneNumber": "+1234567890",
    "performanceMetrics": {
      "totalSubmissions": 50,
      "approvedSubmissions": 48,
      "averageConfidenceScore": 92,
      "qualityRating": 4.8
    }
  },
  "processingLogs": [
    {
      "id": "uuid",
      "processingStage": "webhook",
      "processingStatus": "completed",
      "processingTimeMs": 250,
      "createdAt": "2026-02-05T10:00:00Z"
    },
    {
      "id": "uuid",
      "processingStage": "ai_extraction",
      "processingStatus": "completed",
      "processingTimeMs": 1500,
      "createdAt": "2026-02-05T10:00:01Z"
    }
  ],
  "createdAt": "2026-02-05T10:00:00Z",
  "updatedAt": "2026-02-05T10:05:00Z"
}
```

---

#### POST /admin/whatsapp/submissions/:id/process
Manually trigger pipeline processing for a submission.

**Authorization**: Admin, Staff

**Path Parameters**:
- `id`: Submission UUID

**Response**:
```json
{
  "success": true,
  "message": "Pipeline processing triggered successfully"
}
```

**Audit**: Logs action with MEDIUM severity

---

#### POST /admin/whatsapp/submissions/:id/reprocess
Reprocess a failed submission (resets status and retries).

**Authorization**: Admin only

**Path Parameters**:
- `id`: Submission UUID

**Response**:
```json
{
  "success": true,
  "message": "Submission reprocessing triggered successfully"
}
```

**Audit**: Logs action with HIGH severity

---

### Health Monitoring

#### GET /admin/whatsapp/health
Get overall health status of the WhatsApp integration system.

**Authorization**: Admin, Staff

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-05T10:00:00Z",
  "services": {
    "webhook": "healthy",
    "aiProcessing": "healthy",
    "validation": "healthy",
    "inventory": "healthy"
  },
  "metrics": {
    "uptime": 86400,
    "totalSubmissions": 1000,
    "successRate": 95.5,
    "averageProcessingTime": 2500
  }
}
```

---

#### GET /admin/whatsapp/health/errors
Get list of unresolved critical errors.

**Authorization**: Admin, Staff

**Response**:
```json
{
  "errors": [
    {
      "id": "uuid",
      "errorType": "ai-processing",
      "message": "AI service timeout",
      "severity": "high",
      "occurrences": 3,
      "firstOccurrence": "2026-02-05T09:00:00Z",
      "lastOccurrence": "2026-02-05T09:30:00Z",
      "metadata": {
        "submissionId": "uuid",
        "supplierId": "uuid"
      },
      "resolved": false
    }
  ],
  "total": 1
}
```

---

#### PATCH /admin/whatsapp/health/errors/:errorId/resolve
Mark a critical error as resolved.

**Authorization**: Admin only

**Path Parameters**:
- `errorId`: Error UUID

**Response**:
```json
{
  "success": true,
  "message": "Error resolved successfully"
}
```

**Audit**: Logs action with MEDIUM severity

---

### Error Recovery

#### GET /admin/whatsapp/recovery/queue
Get list of failed operations in the recovery queue.

**Authorization**: Admin, Staff

**Response**:
```json
{
  "failedOperations": [
    {
      "id": "uuid",
      "operationType": "ai_extraction",
      "submissionId": "uuid",
      "error": "AI service unavailable",
      "retryCount": 2,
      "maxRetries": 3,
      "nextRetryAt": "2026-02-05T10:15:00Z",
      "metadata": {
        "contentType": "image",
        "supplierId": "uuid"
      },
      "createdAt": "2026-02-05T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

#### GET /admin/whatsapp/recovery/stats
Get statistics about the error recovery queue.

**Authorization**: Admin, Staff

**Response**:
```json
{
  "totalFailed": 10,
  "byOperationType": {
    "webhook": 2,
    "ai_extraction": 5,
    "validation": 1,
    "inventory_update": 2
  },
  "retryingNow": 3,
  "permanentlyFailed": 1,
  "averageRetryTime": 5000
}
```

---

#### POST /admin/whatsapp/recovery/retry/:submissionId
Manually retry a failed submission from the recovery queue.

**Authorization**: Admin, Staff

**Path Parameters**:
- `submissionId`: Submission UUID

**Response**:
```json
{
  "success": true,
  "attempts": 3,
  "totalTime": 4500,
  "message": "Submission retry completed successfully"
}
```

**Audit**: Logs action with MEDIUM severity

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid request parameters",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Submission not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Usage Examples

### Get Pipeline Statistics
```bash
curl -X GET http://localhost:3000/admin/whatsapp/pipeline/stats \
  -H "Authorization: Bearer <admin_token>"
```

### Get Pending Submissions
```bash
curl -X GET "http://localhost:3000/admin/whatsapp/submissions?validationStatus=pending&page=1&limit=20" \
  -H "Authorization: Bearer <admin_token>"
```

### Trigger Processing
```bash
curl -X POST http://localhost:3000/admin/whatsapp/submissions/uuid/process \
  -H "Authorization: Bearer <admin_token>"
```

### Reprocess Failed Submission
```bash
curl -X POST http://localhost:3000/admin/whatsapp/submissions/uuid/reprocess \
  -H "Authorization: Bearer <admin_token>"
```

### Get Health Status
```bash
curl -X GET http://localhost:3000/admin/whatsapp/health \
  -H "Authorization: Bearer <admin_token>"
```

### Resolve Error
```bash
curl -X PATCH http://localhost:3000/admin/whatsapp/health/errors/uuid/resolve \
  -H "Authorization: Bearer <admin_token>"
```

### Retry Failed Operation
```bash
curl -X POST http://localhost:3000/admin/whatsapp/recovery/retry/uuid \
  -H "Authorization: Bearer <admin_token>"
```

---

## Integration with Frontend

These endpoints can be integrated into the admin dashboard to provide:

1. **Pipeline Dashboard**: Display real-time statistics and submission status
2. **Submission Management**: List, filter, and manage submissions
3. **Health Monitoring**: Display system health and error alerts
4. **Error Recovery**: Manage failed operations and retry mechanisms

### Recommended UI Components

1. **Pipeline Stats Widget**: Display key metrics (total, pending, approved, failed)
2. **Submissions Table**: Paginated table with filters and actions
3. **Submission Detail Modal**: Show full submission details with processing logs
4. **Health Status Indicator**: Traffic light system for service health
5. **Error Alert Panel**: List of unresolved errors with resolve actions
6. **Recovery Queue Table**: List of failed operations with retry buttons

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Role-based access control (Admin/Staff)
3. **Audit Logging**: All actions are logged for compliance
4. **Rate Limiting**: Consider implementing rate limiting for manual actions
5. **Input Validation**: All inputs are validated and sanitized

---

## Monitoring and Alerts

Administrators should monitor:

1. **Pipeline Health**: Check `/admin/whatsapp/health` regularly
2. **Error Queue**: Monitor `/admin/whatsapp/health/errors` for critical issues
3. **Recovery Queue**: Check `/admin/whatsapp/recovery/queue` for stuck operations
4. **Submission Backlog**: Monitor pending validations via `/admin/whatsapp/submissions`

Set up alerts for:
- High error rates (>5% of submissions)
- Long-running operations (>5 minutes)
- Growing recovery queue (>10 items)
- Unresolved critical errors (>24 hours)
