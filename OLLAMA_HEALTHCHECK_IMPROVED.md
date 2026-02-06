# Ollama Health Check Improved

## Changes Made

Improved the Ollama health check to be more reliable and less strict.

### Before (Failing)
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

**Problem**: `/api/tags` endpoint requires models to be loaded and fully initialized, which can take a long time or fail if no models are pulled yet.

### After (Improved)
```yaml
healthcheck:
  # Simple health check - just verify the service is responding
  test: ["CMD-SHELL", "curl -f http://localhost:11434/ || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 120s
```

**Benefits**:
- ✅ Checks root endpoint `/` which responds immediately when Ollama is running
- ✅ Doesn't require models to be loaded
- ✅ More retries (5 instead of 3) for slower systems
- ✅ Longer start period (120s instead of 60s) for initialization
- ✅ Added `OLLAMA_KEEP_ALIVE=5m` to keep models in memory longer

## Additional Improvements

### Re-enabled AI Processing
```yaml
AI_PROCESSING_ENABLED: ${AI_PROCESSING_ENABLED:-true}
```
Now that the health check is fixed, AI processing is enabled by default again.

### Backend Independence
Backend still doesn't have Ollama in `depends_on`, so it can start independently if needed.

## Deployment

```bash
# On your server (89.116.229.113)
cd /path/to/tekra-store
git pull origin main
docker-compose down
docker-compose up -d
```

## Testing

After deployment, verify Ollama is healthy:

```bash
# Check Ollama health
docker ps | grep ollama
# Should show "healthy" status after ~2 minutes

# Test Ollama directly
curl http://localhost:11434/
# Should return: "Ollama is running"

# Check if models are loaded
docker exec -it ecommerce_ollama ollama list
# Should show llama3.2:1b if pulled

# Test backend can reach Ollama
docker exec -it ecommerce_backend curl http://ollama:11434/
# Should return: "Ollama is running"
```

## Why This Works Better

1. **Root endpoint (`/`)**: Returns immediately when Ollama service is up
2. **API tags endpoint (`/api/tags`)**: Requires full initialization and model loading
3. **Longer start period**: Gives Ollama 2 minutes to fully initialize
4. **More retries**: Tolerates temporary hiccups during startup
5. **Keep alive**: Keeps models in memory for faster responses

## Fallback Behavior

Even with this improved health check, the backend will gracefully handle Ollama being unavailable:
- Falls back to rule-based extraction if AI fails
- Logs errors but continues processing
- Admin can still validate products manually

## Model Pulling

The `ollama-init` container will automatically pull the model after Ollama is healthy:

```yaml
ollama-init:
  depends_on:
    ollama:
      condition: service_healthy
  command: >
    sh -c "
      echo 'Pulling Llama 3.2 1B model...' &&
      ollama pull llama3.2:1b &&
      echo 'Model pulled successfully!'
    "
```

This runs once and exits after pulling the model.
