# Docker Health Check Update

## Issue
Backend container was marked as unhealthy even though the application was running, causing frontend and other dependent services to fail to start.

## Root Cause
1. Health check was using `wget` but Dockerfile only installs `curl`
2. Health check timing was too aggressive (40s start period, 3 retries)
3. Backend needs more time to initialize database connections and run migrations

## Solution

### 1. Updated Backend Health Check
**Changed from:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/api/health", "||", "exit", "1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Changed to:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```

**Improvements:**
- ✅ Uses `curl` which is installed in the Docker image
- ✅ Increased `start_period` from 40s to 60s (more time for initialization)
- ✅ Increased `retries` from 3 to 5 (more tolerant of temporary failures)
- ✅ Simplified command syntax with `CMD-SHELL`

### 2. Updated Frontend Health Check
**Changed from:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1"]
  interval: 30s
  timeout: 10s
  start_period: 40s
  retries: 3
```

**Changed to:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1"]
  interval: 30s
  timeout: 10s
  start_period: 60s
  retries: 5
```

**Improvements:**
- ✅ Checks `/api/health` endpoint instead of root (more reliable)
- ✅ Increased `start_period` from 40s to 60s
- ✅ Increased `retries` from 3 to 5

## Health Check Parameters Explained

### `interval`
How often to run the health check after the container is running.
- **Value**: 30s
- **Meaning**: Check every 30 seconds

### `timeout`
Maximum time to wait for the health check command to complete.
- **Value**: 10s
- **Meaning**: If check takes longer than 10s, it's considered failed

### `retries`
Number of consecutive failures needed to mark container as unhealthy.
- **Value**: 5
- **Meaning**: Must fail 5 times in a row before marked unhealthy

### `start_period`
Grace period during container startup where failures don't count toward retries.
- **Value**: 60s
- **Meaning**: First 60 seconds, failures are ignored (allows time for initialization)

## Health Check Timeline

### Backend Container Startup:
```
0s    - Container starts
0-60s - Start period (failures ignored)
        - Database connection established
        - Migrations run
        - Application initializes
60s   - First real health check
90s   - Second health check (if first failed)
120s  - Third health check (if second failed)
150s  - Fourth health check (if third failed)
180s  - Fifth health check (if fourth failed)
180s+ - Marked unhealthy if all 5 checks failed
```

### Total Time Before Unhealthy:
- **Minimum**: 60s (start period) + 150s (5 retries × 30s interval) = **210 seconds (3.5 minutes)**

This gives the backend plenty of time to:
1. Connect to PostgreSQL
2. Run database migrations
3. Initialize all services
4. Start accepting HTTP requests

## Health Endpoint

The backend exposes a simple health endpoint at `/api/health`:

```typescript
@Public()
@Get('health')
getHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'West Africa E-commerce Backend',
  };
}
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-05T23:45:00.000Z",
  "service": "West Africa E-commerce Backend"
}
```

## Testing Health Checks

### Manual Health Check Test:
```bash
# Check backend health
curl http://localhost:3001/api/health

# Check frontend health  
curl http://localhost:3000/api/health

# Check container health status
docker inspect ecommerce_backend --format='{{.State.Health.Status}}'

# View health check logs
docker inspect ecommerce_backend --format='{{json .State.Health}}' | jq
```

### Expected Health States:
1. **starting** - Container is in start_period, health checks not yet counting
2. **healthy** - All health checks passing
3. **unhealthy** - Failed retries consecutive health checks

## Monitoring Health

### View Real-time Health Status:
```bash
# All containers
docker-compose ps

# Specific container
docker ps --filter name=ecommerce_backend --format "table {{.Names}}\t{{.Status}}"

# Detailed health info
docker inspect ecommerce_backend | grep -A 10 Health
```

### Health Check Logs:
```bash
# Backend logs
docker-compose logs backend | grep health

# All health-related logs
docker-compose logs | grep -i health
```

## Troubleshooting

### Issue: Container still marked unhealthy
**Check:**
1. Is the backend actually running?
   ```bash
   docker-compose logs backend --tail=50
   ```

2. Can you access the health endpoint manually?
   ```bash
   docker-compose exec backend curl http://localhost:3001/api/health
   ```

3. Are there any errors in the logs?
   ```bash
   docker-compose logs backend | grep ERROR
   ```

### Issue: Health check passes but app doesn't work
**This means:**
- The HTTP server is responding
- But the application logic might have issues
- Check application logs for errors

### Issue: Takes too long to become healthy
**Solutions:**
1. Increase `start_period` further (e.g., 90s or 120s)
2. Optimize application startup time
3. Pre-run migrations before starting the app

## Alternative Health Check Approaches

### Option 1: Simple TCP Check
```yaml
healthcheck:
  test: ["CMD-SHELL", "nc -z localhost 3001 || exit 1"]
  interval: 30s
  timeout: 5s
  retries: 5
  start_period: 60s
```
**Pros**: Faster, less resource intensive
**Cons**: Only checks if port is open, not if app is working

### Option 2: Comprehensive Health Check
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:3001/api/health && curl -f http://localhost:3001/api/health/db || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```
**Pros**: Checks both app and database
**Cons**: More complex, slower

### Option 3: No Health Check (Not Recommended)
```yaml
# Remove healthcheck section entirely
```
**Pros**: No false negatives
**Cons**: No automatic detection of failures, dependent services may start before backend is ready

## Best Practices

1. **Start Period**: Should be longer than your longest initialization time
2. **Retries**: Balance between quick detection and false positives (3-5 is good)
3. **Interval**: 30s is standard, adjust based on your needs
4. **Timeout**: Should be longer than your slowest health check response
5. **Command**: Use tools that are installed in your image (curl, wget, nc)

## Impact

✅ **Backend starts reliably** without false unhealthy states
✅ **Frontend waits properly** for backend to be ready
✅ **Nginx starts correctly** after all services are healthy
✅ **Reduced startup failures** and container restarts
✅ **Better development experience** with more predictable behavior

## Files Modified

1. `docker-compose.yml`
   - Updated backend health check to use `curl`
   - Increased `start_period` to 60s
   - Increased `retries` to 5
   - Updated frontend health check endpoint
   - Increased frontend `start_period` to 60s

## Related Documentation

- `DOCKER_TROUBLESHOOTING.md` - General Docker issues
- `BACKEND_HEALTH_CHECK_FIX.md` - Application-level health checks
- `DEPLOYMENT.md` - Deployment procedures

---

**Updated by:** Kiro AI Assistant  
**Date:** February 5, 2026  
**Status:** ✅ Resolved  
**Health Check:** ✅ Optimized for reliable startup
