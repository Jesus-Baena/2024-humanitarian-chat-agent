# 🚨 URGENT: Chat Service Down - Diagnosis & Fix Guide

## Current Status
- **Chat Service**: 502 Bad Gateway ❌
- **Docker Image**: Available ✅ 
- **GitHub Build**: Success ✅
- **Flowise API**: Working ✅

## Immediate Diagnostic Steps

### 1. Check Service Status
```bash
# On Docker Swarm manager:
docker service ls | grep web_chat
docker service ps web_chat --no-trunc
```

### 2. Check Container Logs
```bash
# Look for startup errors:
docker service logs web_chat --tail 50
```

### 3. Most Likely Issues

#### A) Environment Variable Startup Failure
The new FLOWISE environment variables might be causing crashes.

**Quick Fix:**
```bash
# Remove problematic env vars and restart
docker service update \
  --env-rm NUXT_PUBLIC_FLOWISE_API_KEY \
  --force \
  web_chat
```

#### B) Container Restart Loop  
**Quick Fix:**
```bash
# Force service restart
docker service update --force web_chat
```

#### C) Resource Issues
**Quick Fix:**
```bash
# Check resources and restart
docker stats --no-stream
docker service update --limit-memory 1G --force web_chat
```

### 4. Emergency Recovery Options

#### Option 1: Rollback to Previous Working State
```bash
# Use previous image if available
docker service update \
  --image ghcr.io/jesus-baena/chat-humanitarian-agent:main \
  --env-rm NUXT_PUBLIC_FLOWISE_API_KEY \
  --env-add NUXT_PUBLIC_FLOWISE_URL=https://flowise.baena.site/api/v1/prediction/40718af9-e9bd-47d9-a57b-009cb26f8fe3 \
  --force \
  web_chat
```

#### Option 2: Recreate Service
```bash
# Nuclear option - recreate the service
docker service rm web_chat
sleep 5
docker stack deploy -c docker-compose.yml web
```

#### Option 3: Manual Container Test
```bash
# Test container locally first
docker run --rm -it \
  -e NUXT_PUBLIC_FLOWISE_URL=https://flowise.baena.site/api/v1/prediction/40718af9-e9bd-47d9-a57b-009cb26f8fe3 \
  ghcr.io/jesus-baena/chat-humanitarian-agent:latest
```

## Expected Timeline
- **Diagnosis**: 2-5 minutes
- **Fix**: 1-3 minutes  
- **Service Recovery**: 30-60 seconds

## Verification
After fix:
```bash
curl -I https://chat.baena.ai
# Should return: HTTP/2 200
```

---
**Priority: CRITICAL** | **Created**: $(date)