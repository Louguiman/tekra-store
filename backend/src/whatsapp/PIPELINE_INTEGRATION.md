# WhatsApp Supplier Automation Pipeline Integration

## Overview

This document describes the complete end-to-end integration of the WhatsApp Supplier Inventory Automation System, connecting all components from message reception to inventory updates.

## Architecture

The pipeline follows a sequential flow through four main stages:

```
WhatsApp Message → Webhook Handler → AI Processing → Human Validation → Inventory Integration
```

## Components

### 1. Webhook Handler (WhatsappService)
**Location**: `backend/src/whatsapp/whatsapp.service.ts`

**Responsibilities**:
- Receives WhatsApp webhook events
- Validates webhook signatures for security
- Authenticates suppliers
- Downloads and stores media files
- Creates SupplierSubmission records
- Groups related messages by supplier and timestamp

**Key Methods**:
- `processIncomingMessage()`: Main entry point for webhook processing
- `validateWebhookSignature()`: Security validation
- `authenticateSupplier()`: Supplier authentication
- `processSubmissionWithAI()`: Triggers AI processing for a submission

### 2. AI Processing Engine (AIProcessingService)
**Location**: `backend/src/ai-processing/ai-processing.service.ts`

**Responsibilities**:
- Extracts structured product data from unstructured content
- Performs OCR on images using Tesseract.js
- Processes PDFs and extracts tabular data
- Uses local LLM (Ollama with Llama 3.2) for text understanding
- Assigns confidence scores to extracted fields
- Detects duplicate products

**Key Methods**:
- `processTextMessage()`: Extracts data from text messages
- `processImage()`: OCR and image analysis
- `processPDF()`: PDF parsing and data extraction
- `detectDuplicates()`: Identifies existing products

### 3. Human Validation Service (ValidationService)
**Location**: `backend/src/admin/validation.service.ts`

**Responsibilities**:
- Manages validation queue with priority sorting
- Provides side-by-side comparison of original content and extracted data
- Supports bulk approval/rejection operations
- Collects structured feedback for AI improvement
- Sends notifications to admins

**Key Methods**:
- `getPendingValidations()`: Retrieves validation queue with filters
- `approveProduct()`: Approves and triggers inventory integration
- `rejectProduct()`: Rejects with feedback
- `bulkApprove()`: Batch approval operations

### 4. Inventory Integration Service (InventoryIntegrationService)
**Location**: `backend/src/admin/inventory-integration.service.ts`

**Responsibilities**:
- Creates or updates Product entities
- Manages InventoryItem records with supplier tracking
- Assigns categories and product segments
- Creates ProductPrice records across countries
- Sends notifications to stakeholders

**Key Methods**:
- `createProductFromValidation()`: Creates new products
- `updateProductFromValidation()`: Updates existing products
- `notifyInventoryChange()`: Sends email notifications
- `sendDashboardUpdate()`: Real-time dashboard updates

### 5. Pipeline Orchestrator (PipelineOrchestratorService)
**Location**: `backend/src/whatsapp/pipeline-orchestrator.service.ts`

**Responsibilities**:
- Orchestrates the complete message flow
- Implements auto-approval logic for trusted suppliers
- Manages scheduled processing of pending submissions
- Monitors stale validations
- Provides pipeline statistics

**Key Methods**:
- `processSubmissionPipeline()`: Main orchestration method
- `checkAutoApproval()`: Determines auto-approval eligibility
- `autoApproveSubmission()`: Automatically approves and integrates
- `processPendingSubmissions()`: Scheduled job (every 5 minutes)
- `checkStaleValidations()`: Scheduled job (every hour)

## Complete Flow

### 1. Message Reception
```typescript
POST /whatsapp/webhook
├── Validate signature
├── Authenticate supplier
├── Download media files (if any)
├── Create SupplierSubmission record
└── Trigger pipeline processing (async)
```

### 2. AI Processing
```typescript
processSubmissionPipeline()
├── Check submission status
├── Process with AI if pending
│   ├── Extract text/OCR/PDF parsing
│   ├── LLM-based data extraction
│   ├── Confidence scoring
│   └── Duplicate detection
└── Update submission with extracted data
```

### 3. Auto-Approval Check
```typescript
checkAutoApproval()
├── Check supplier metrics
│   ├── Total submissions >= 10
│   ├── Approval rate >= 90%
│   └── Quality rating >= 4.0
├── Check extraction confidence
│   └── All products >= 90% confidence
└── Return eligibility decision
```

### 4. Inventory Integration
```typescript
// If auto-approved:
autoApproveSubmission()
├── For each extracted product:
│   ├── Create validated product
│   ├── Integrate with inventory
│   │   ├── Create/update Product
│   │   ├── Create/update InventoryItem
│   │   ├── Create/update ProductPrice
│   │   └── Assign category/segment
│   └── Send notifications
└── Update submission status

// If requires validation:
// Submission waits in validation queue
// Admin reviews via /admin/validations
// On approval, triggers inventory integration
```

## Auto-Approval Logic

Submissions are automatically approved and integrated when:

1. **Supplier Trust Level**:
   - Minimum 10 successful submissions
   - Approval rate >= 90%
   - Quality rating >= 4.0

2. **Extraction Confidence**:
   - All extracted products have confidence >= 90%
   - No missing required fields
   - No duplicate detection flags

3. **System Health**:
   - AI processing completed successfully
   - No critical errors in extraction

## Scheduled Jobs

### Process Pending Submissions
- **Schedule**: Every 5 minutes
- **Purpose**: Automatically process new submissions through the pipeline
- **Batch Size**: Up to 10 submissions per run

### Check Stale Validations
- **Schedule**: Every hour
- **Purpose**: Monitor validations pending for >24 hours
- **Action**: Records health monitoring alerts

## API Endpoints

### Pipeline Management
```
GET  /whatsapp/pipeline/stats              - Get pipeline statistics
POST /whatsapp/pipeline/process/:id        - Manually trigger processing
POST /whatsapp/pipeline/reprocess/:id      - Reprocess failed submission
```

### Validation Management
```
GET  /admin/validations                    - Get validation queue
GET  /admin/validations/:id                - Get specific validation
POST /admin/validations/:id/approve        - Approve validation
POST /admin/validations/:id/reject         - Reject validation
POST /admin/validations/bulk/approve       - Bulk approve
POST /admin/validations/bulk/reject        - Bulk reject
GET  /admin/validations/stats              - Get validation statistics
```

## Error Handling

### Webhook Errors
- Invalid signature → 401 Unauthorized
- Malformed payload → 400 Bad Request
- Rate limiting → 429 Too Many Requests

### Processing Errors
- AI service failures → Retry with exponential backoff (3 attempts)
- File download failures → Retry up to 3 times
- Database errors → Transaction rollback

### Recovery Mechanisms
- Failed operations queued for retry
- Dead letter queue for permanent failures
- Manual reprocessing capabilities
- Health monitoring and alerting

## Monitoring

### Pipeline Statistics
```typescript
{
  total: number,
  processing: {
    pending: number,
    inProgress: number,
    completed: number,
    failed: number
  },
  validation: {
    pending: number,
    approved: number,
    rejected: number
  },
  approvalRate: string
}
```

### Health Checks
- `/whatsapp/health` - Overall system health
- `/whatsapp/health/metrics` - Detailed metrics
- `/whatsapp/health/diagnostics` - Diagnostic information
- `/whatsapp/health/errors` - Unresolved errors

## Audit Trail

All operations are logged with:
- Timestamp and actor (user/system)
- Action type and resource
- Before/after values
- Success/failure status
- Detailed metadata

## Testing

### Integration Tests
**Location**: `backend/src/whatsapp/pipeline-integration.spec.ts`

**Coverage**:
- Complete pipeline flow with auto-approval
- Human validation queue management
- AI processing failure handling
- Pipeline statistics
- Auto-approval logic
- Reprocessing failed submissions

**Run Tests**:
```bash
npm test -- pipeline-integration.spec.ts --runInBand
```

## Configuration

### Environment Variables
```
WHATSAPP_WEBHOOK_SECRET=<webhook_secret>
OLLAMA_BASE_URL=http://ollama:11434
ADMIN_NOTIFICATION_EMAILS=admin1@example.com,admin2@example.com
```

### Auto-Approval Thresholds
```typescript
const minSubmissions = 10;
const minApprovalRate = 0.90;
const minConfidence = 90;
```

## Performance Considerations

1. **Async Processing**: Webhook responses return immediately; pipeline processing happens in background
2. **Batch Processing**: Scheduled jobs process up to 10 submissions at a time
3. **Retry Logic**: Exponential backoff for failed operations
4. **Database Transactions**: Ensure data consistency across operations
5. **Caching**: Supplier metrics cached to reduce database queries

## Future Enhancements

1. **WebSocket Integration**: Real-time dashboard updates
2. **Machine Learning**: Improve auto-approval thresholds based on historical data
3. **Advanced Duplicate Detection**: Use embeddings for semantic similarity
4. **Multi-Language Support**: OCR and LLM support for multiple languages
5. **Supplier Portal**: Self-service interface for suppliers to track submissions

## Troubleshooting

### Common Issues

**Submission stuck in pending**:
- Check AI service health: `GET /whatsapp/health`
- Manually trigger processing: `POST /whatsapp/pipeline/process/:id`

**Auto-approval not working**:
- Verify supplier metrics meet thresholds
- Check extraction confidence scores
- Review audit logs for details

**Validation queue growing**:
- Check admin notification delivery
- Review stale validation alerts
- Consider adjusting auto-approval thresholds

**Inventory integration failures**:
- Check category/segment mappings
- Verify product price configuration
- Review audit logs for specific errors

## Support

For issues or questions:
1. Check health monitoring endpoints
2. Review audit logs for detailed error information
3. Check processing logs for specific submissions
4. Contact system administrators with submission ID
