# Production Deployment - Rate Limit Fix

## ✅ Changes Committed and Pushed

The rate limit fix has been committed and pushed to GitHub:
- Commit: `7d54f37`
- Branch: `main`

## 🚀 Deploy to Production

You have **two options** to deploy:

### Option 1: SSH Remote Deployment (Recommended)

If you haven't configured SSH yet:

```bash
./configure-ssh.sh
```

Then deploy:

```bash
./ssh-deploy.sh
```

### Option 2: Direct Deployment on Swarm Manager

SSH into your Docker Swarm manager node and run:

```bash
# SSH into your production server
ssh your-user@your-server.com

# Navigate to the deployment directory or run directly
cd /path/to/deployment || true

# Pull the latest code (if repo is cloned on server)
git pull origin main

# Or manually deploy the stack
docker stack deploy -c /path/to/docker-compose.prod.yml web
```

### Option 3: Manual Service Update

If you just want to update the chat service with the new image:

```bash
# SSH into production
ssh your-user@your-server.com

# Pull latest image
docker pull ghcr.io/jesus-baena/chat-humanitarian-agent:latest

# Update the service
docker service update --image ghcr.io/jesus-baena/chat-humanitarian-agent:latest --force web_chat
```

## 🧪 Verify Deployment

After deployment, check:

1. **Service is running:**
   ```bash
   docker service ps web_chat
   ```

2. **No errors in logs:**
   ```bash
   docker service logs web_chat --tail 50
   ```

3. **Test authentication:**
   - Visit https://chat.baena.ai
   - Clear cookies (F12 → Application → Cookies → Delete all `sb-*`)
   - Try signing in
   - Should work without rate limit errors

4. **Check Supabase logs:**
   - Visit: https://supabase.com/dashboard/project/qecdwuwkxgwkpopmdewl/logs/auth-logs
   - Should see normal login requests
   - Should NOT see bursts of token refresh requests

## 📊 What to Monitor

### Good Signs ✅
- Users can sign in without errors
- No 429 rate limit errors
- Occasional token refresh in logs (every 5-50 minutes)
- Anonymous chat continues to work

### Bad Signs ❌
- 429 errors in Supabase logs
- Burst of `/token` refresh requests
- Users reporting login failures

## 🔄 Next Steps

1. **Choose deployment method** from options above
2. **Deploy the update**
3. **Monitor for 24 hours**
4. **Ask users to clear cookies** if they still have issues (one-time fix)

## 💡 Need Help?

See these files for more details:
- `PRODUCTION_AUTH_FIX.md` - Quick deployment summary
- `RATE_LIMIT_FIX_DEPLOYMENT.md` - Complete deployment guide
- `RATE_LIMIT_QUICK_FIX.md` - User-facing instructions
