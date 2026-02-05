# Backend Health Check Fix

## Issue
Backend container was showing as unhealthy due to configuration check failures:

```
ERROR [HealthMonitoringService] Critical error recorded: [critical] health-check: System health check failed
Object: {"status": "unhealthy", "failedChecks": ["configuration"]}
```

## Root Cause
The health monitoring service was checking for WhatsApp environment variables (`WHATSAPP_WEBHOOK_SECRET`, `WHATSAPP_API_TOKEN`) and marking the system as unhealthy when they weren't configured, even though WhatsApp integration is optional.

## Solution

### 1. Updated Health Check Logic
Modified `backend/src/whatsapp/health-monitoring.service.ts` to:
- Check if WhatsApp is explicitly enabled via `WHATSAPP_ENABLED` environment variable
- Only fail health check if WhatsApp is enabled but not properly configured
- Show warnings instead of failures when WhatsApp is disabled
- Support both `WHATSAPP_API_TOKEN` and `WHATSAPP_ACCESS_TOKEN` variable names

### 2. Added Environment Variables
Updated `backend/.env` and `backend/.env.example` with:
```env
# WhatsApp Business API (Optional - for supplier automation)
WHATSAPP_ENABLED=false
# WHATSAPP_ACCESS_TOKEN=your_access_token_here
# WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
# WHATSAPP_VERIFY_TOKEN=your_verify_token_here
# WHATSAPP_WEBHOOK_SECRET=your_webhook_secret_here
# WHATSAPP_API_TOKEN=your_api_token_here
```

## Health Check Behavior

### Before Fix:
```
Configuration Check: FAIL
- Missing WHATSAPP_WEBHOOK_SECRET
- Missing WHATSAPP_API_TOKEN
Result: System marked as UNHEALTHY
```

### After Fix:
```
When WHATSAPP_ENABLED=false (default):
  Configuration Check: WARN
  - WhatsApp integration not configured (optional)
  Result: System marked as HEALTHY

When WHATSAPP_ENABLED=true:
  If configured properly:
    Configuration Check: PASS
    Result: System marked as HEALTHY
  
  If missing variables:
    Configuration Check: FAIL
    - Missing required WhatsApp variables
    Result: System marked as UNHEALTHY
```

## Health Check Endpoints

### Check System Health
```bash
curl http://localhost:3001/api/health
```

Expected response (WhatsApp disabled):
```json
{
  "status": "healthy",
  "timestamp": "2026-02-05T23:30:00.000Z",
  "checks": [
    {
      "name": "database",
      "status": "pass",
      "message": "Database connection is healthy"
    },
    {
      "name": "submission_processing",
      "status": "pass",
      "message": "Submission processing is healthy"
    },
    {
      "name": "error_rate",
      "status": "pass",
      "message": "Error rate is acceptable: 0.00%"
    },
    {
      "name": "queue_health",
      "status": "pass",
      "message": "Queue is healthy"
    },
    {
      "name": "configuration",
      "status": "warn",
      "message": "Configuration warnings: WhatsApp integration not configured (set WHATSAPP_ENABLED=true to enable)"
    }
  ],
  "uptime": 123456
}
```

## Enabling WhatsApp Integration

To enable WhatsApp supplier automation:

1. **Set environment variable:**
   ```env
   WHATSAPP_ENABLED=true
   ```

2. **Configure WhatsApp credentials:**
   Follow the detailed guide in `WHATSAPP_BUSINESS_API_SETUP.md`

3. **Required variables when enabled:**
   ```env
   WHATSAPP_ACCESS_TOKEN=your_token
   WHATSAPP_PHONE_NUMBER_ID=your_id
   WHATSAPP_VERIFY_TOKEN=your_verify_token
   WHATSAPP_WEBHOOK_SECRET=your_secret
   ```

4. **Restart backend:**
   ```bash
   docker-compose restart backend
   ```

## Related Health Checks

The system performs these health checks every 10 minutes:

1. **Database Connectivity** - Verifies PostgreSQL connection
2. **Submission Processing** - Checks for pending/processing submissions
3. **Error Rate** - Monitors failure rate (warns >10%, fails >25%)
4. **Queue Health** - Detects stuck submissions (>1 hour in processing)
5. **Configuration** - Validates required environment variables

## Monitoring

### View Health Status
```bash
# Via API
curl http://localhost:3001/api/health

# Via Docker
docker inspect ecommerce_backend --format='{{json .State.Health}}' | jq

# Via Logs
docker-compose logs backend | grep "health check"
```

### Health Check Schedule
- Runs every 10 minutes automatically
- Can be triggered manually via API endpoint
- Results logged to console and audit trail

## Error Escalation

The system escalates critical errors based on frequency:
- **Low severity**: 10+ errors in 1 hour
- **Medium severity**: 5+ errors in 1 hour
- **High severity**: 2+ errors in 1 hour
- **Critical severity**: 1+ error in 1 hour

Configuration failures are marked as **critical** when WhatsApp is enabled but misconfigured.

## Troubleshooting

### Issue: Health check still failing
**Check:**
1. Verify `WHATSAPP_ENABLED=false` in `.env`
2. Restart backend: `docker-compose restart backend`
3. Check logs: `docker-compose logs backend`

### Issue: Want to enable WhatsApp but getting errors
**Solution:**
1. Follow `WHATSAPP_BUSINESS_API_SETUP.md` for complete setup
2. Ensure all required variables are set
3. Test webhook connectivity
4. Check Meta App configuration

### Issue: Health check shows warnings
**This is normal** when WhatsApp is disabled. Warnings don't affect system health status.

## Testing

### Test Health Check
```bash
# Should return healthy status
curl http://localhost:3001/api/health

# Check specific health metrics
curl http://localhost:3001/api/admin/whatsapp/health
```

### Test Configuration
```bash
# View current configuration status
docker-compose exec backend node -e "console.log({
  whatsappEnabled: process.env.WHATSAPP_ENABLED,
  hasWebhookSecret: !!process.env.WHATSAPP_WEBHOOK_SECRET,
  hasApiToken: !!process.env.WHATSAPP_API_TOKEN
})"
```

## Impact

✅ **Backend now starts successfully** without WhatsApp configuration  
✅ **Health checks pass** with WhatsApp disabled (default)  
✅ **Optional WhatsApp integration** can be enabled when needed  
✅ **Clear warnings** indicate optional features not configured  
✅ **No breaking changes** to existing functionality  

## Files Modified

1. `backend/src/whatsapp/health-monitoring.service.ts`
   - Updated `checkConfiguration()` method
   - Added `WHATSAPP_ENABLED` check
   - Changed failures to warnings when disabled

2. `backend/.env`
   - Added `WHATSAPP_ENABLED=false`
   - Added commented WhatsApp variables

3. `backend/.env.example`
   - Added WhatsApp configuration section
   - Added AI processing configuration
   - Added setup documentation reference

## Related Documentation

- `WHATSAPP_BUSINESS_API_SETUP.md` - Complete WhatsApp setup guide
- `TYPEORM_QUERY_FIX.md` - Database query fixes
- `DOCKER_TROUBLESHOOTING.md` - Docker issues and solutions
- `MIGRATION_GUIDE.md` - Database migration guide

---

**Fixed by:** Kiro AI Assistant  
**Date:** February 5, 2026  
**Status:** ✅ Resolved  
**Backend Health:** ✅ Healthy (with warnings for optional features)
