# 🚨 URGENT: Flowise URL Fix Deployment

## Issue Summary
- Chat functionality broken due to Flowise API 502 errors
- Wrong URL: `https://flowise.baena.info` (502 Bad Gateway)
- Correct URL: `https://flowise.baena.site` (200 OK)

## Quick Fix Commands

### Option 1: Service Update (Fastest - No downtime)
```bash
# Update just the chat service with correct Flowise URL
docker service update \
  --env-add NUXT_PUBLIC_FLOWISE_URL=https://flowise.baena.site/api/v1/prediction/40718af9-e9bd-47d9-a57b-009cb26f8fe3 \
  --env-add NUXT_PUBLIC_FLOWISE_API_KEY=***REMOVED*** \
  --force \
  web_chat
```

### Option 2: Full Stack Redeploy (More thorough)
```bash
# Set environment and redeploy entire web stack
export CHAT_VERSION="latest"
export PORTFOLIO_VERSION="latest" 
export NGINX_VERSION="1.25-alpine"
export ROLLOUT_COUNTER=$(date +%s)

# Deploy with updated docker-compose.yml
docker stack deploy -c docker-compose.yml web
```

## Changes Made
1. ✅ Fixed Flowise URL: `.info` → `.site`
2. ✅ Added Flowise API key to environment
3. ✅ Fixed Docker image name: `chat-humanitarian-agent` → `baena-chat`
4. ✅ Fixed TypeScript errors in `chats-debug.get.ts`
5. ✅ Added FLOWISE_API_KEY export in container entrypoint

## Verification
After deployment, test:
```bash
# Check service status
docker service ls | grep web_chat

# Test Flowise endpoint
curl -I https://flowise.baena.site/api/v1/prediction/40718af9-e9bd-47d9-a57b-009cb26f8fe3

# Check chat application
curl -I https://chat.baena.ai
```

## Expected Result
✅ Chat responses should work normally  
✅ No more 502 errors from Flowise API  
✅ TypeScript build should complete without errors

---
*Created: $(date)* | *Priority: CRITICAL*