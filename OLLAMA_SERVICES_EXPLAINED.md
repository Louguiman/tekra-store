# Ollama Services Explained

## Why Two Ollama Services?

The docker-compose.yml has **two Ollama services**, but this is **intentional and correct**:

### 1. `ollama` - Main Service
```yaml
ollama:
  image: ollama/ollama:latest
  container_name: ecommerce_ollama
  restart: unless-stopped
```

**Purpose**: The main Ollama server that runs continuously
- Provides the API for AI model inference
- Runs 24/7 to serve requests from the backend
- Stores models in persistent volume
- Has health check to ensure it's running

### 2. `ollama-init` - Initialization Service
```yaml
ollama-init:
  image: ollama/ollama:latest
  container_name: ecommerce_ollama_init
  restart: "no"
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

**Purpose**: One-time setup container that pulls the AI model
- Waits for main Ollama service to be healthy
- Pulls the llama3.2:1b model (downloads ~1GB)
- Exits after model is downloaded
- Never restarts (`restart: "no"`)

## How They Work Together

```
1. docker-compose up
   ↓
2. ollama service starts
   ↓
3. ollama becomes healthy (after ~2 minutes)
   ↓
4. ollama-init starts
   ↓
5. ollama-init pulls model
   ↓
6. ollama-init exits
   ↓
7. ollama continues running with model ready
```

## Why This Pattern?

### Without ollama-init:
- Model would need to be pulled manually
- First AI request would fail (no model)
- Admin would need to SSH and run `ollama pull`

### With ollama-init:
- ✅ Model automatically downloaded on first deployment
- ✅ Backend can use AI immediately after startup
- ✅ No manual intervention needed
- ✅ Idempotent - safe to run multiple times

## Shared Volume

Both services share the same volume:
```yaml
volumes:
  - ollama_data:/root/.ollama
```

This means:
- `ollama-init` downloads model to volume
- `ollama` reads model from same volume
- Model persists across container restarts
- Model only downloaded once

## Health Check Fix

Changed health check from `/api/tags` to `/`:

### Before (Failing)
```yaml
test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
```
**Problem**: Requires models to be loaded, can fail during initialization

### After (Working)
```yaml
test: ["CMD-SHELL", "curl -f http://localhost:11434/ || exit 1"]
```
**Benefit**: Just checks if service is responding, works immediately

## Container Lifecycle

```bash
# Check status
docker ps | grep ollama

# Expected output:
# ecommerce_ollama       Up 5 minutes (healthy)
# ecommerce_ollama_init  Exited (0) 3 minutes ago

# View logs
docker logs ecommerce_ollama
docker logs ecommerce_ollama_init

# Manually pull model (if needed)
docker exec -it ecommerce_ollama ollama pull llama3.2:1b

# List installed models
docker exec -it ecommerce_ollama ollama list
```

## Resource Usage

- **ollama**: ~500MB RAM (idle), ~2GB RAM (processing)
- **ollama-init**: ~100MB RAM (only during model download)
- **ollama_data volume**: ~1GB (model storage)

## Troubleshooting

### If ollama-init keeps restarting:
```bash
# Check logs
docker logs ecommerce_ollama_init

# Common issues:
# - Main ollama not healthy yet (wait 2 minutes)
# - Network issues downloading model
# - Insufficient disk space
```

### If model not found:
```bash
# Manually pull model
docker exec -it ecommerce_ollama ollama pull llama3.2:1b

# Verify model exists
docker exec -it ecommerce_ollama ollama list
```

### If health check fails:
```bash
# Test health endpoint
curl http://localhost:11434/

# Should return: "Ollama is running"
```

## Summary

✅ **Two services is correct** - one runs continuously, one initializes  
✅ **ollama** - Main server (always running)  
✅ **ollama-init** - Model downloader (runs once, exits)  
✅ **Shared volume** - Model persists between containers  
✅ **Health check fixed** - Uses simple `/` endpoint  

This is a standard Docker pattern for services that need initialization! 🎮
