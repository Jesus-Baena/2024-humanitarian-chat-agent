# Flowise Configuration Fix - Complete Guide

## Problem Summary
**Error**: "No completion backend configured"  
**Cause**: Flowise environment variables (`NUXT_PUBLIC_FLOWISE_URL` and `NUXT_PUBLIC_FLOWISE_API_KEY`) are not being baked into the Docker image during build.

## Why This Happens

Nuxt's `runtimeConfig.public` variables are **embedded into the client-side JavaScript bundle during build time**. This means:
- ✅ Must be set during `pnpm run build` (in Docker: the builder stage)
- ❌ Cannot be set at runtime (Docker container startup)

The values in `docker-compose.prod.yml` are runtime environment variables, which don't affect the already-compiled client code.

## The Solution (2 Steps)

### Step 1: Add GitHub Secrets

Go to: **https://github.com/Jesus-Baena/chat-humanitarian-agent/settings/secrets/actions**

Click **"New repository secret"** and add each of the following:

| Secret Name | Where to Get Value |
|-------------|-------------------|
| `NUXT_UI_PRO_LICENSE` | Your Nuxt UI Pro license key |
| `NUXT_PUBLIC_SITE_URL` | Your production URL (e.g., `https://chat.example.com`) |
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NUXT_PUBLIC_SUPABASE_KEY` | Supabase Dashboard → Settings → API → anon/public key |
| `NUXT_PUBLIC_FLOWISE_URL` | Your Flowise instance → Prediction URL |
| `NUXT_PUBLIC_FLOWISE_API_KEY` | Your Flowise instance → Settings → API Keys |

**Important**: Get values from your local `.env` file or the respective service dashboards

### Step 2: Trigger a New Build

After adding all secrets, you need to rebuild the Docker image:

**Option A: Via GitHub Actions UI**
1. Go to: https://github.com/Jesus-Baena/chat-humanitarian-agent/actions
2. Click "Build and Push Docker Image"
3. Click "Run workflow" dropdown
4. Click the green "Run workflow" button
5. Wait for completion (~5 minutes)

**Option B: Push a commit**
```bash
git commit --allow-empty -m "Rebuild with Flowise secrets"
git push origin main
```

### Step 3: Verify the Build

In the GitHub Actions logs, look for the **"Verify build arguments"** step:

✅ **Should see:**
```
NUXT_PUBLIC_FLOWISE_URL: ✅ Set
NUXT_PUBLIC_FLOWISE_API_KEY: ✅ Set
```

❌ **If you see this, secrets weren't added correctly:**
```
NUXT_PUBLIC_FLOWISE_URL: ❌ Missing
NUXT_PUBLIC_FLOWISE_API_KEY: ❌ Missing
```

### Step 4: Deploy

Once the build succeeds and shows ✅, deploy the new image:

```bash
./deploy-stack.sh
```

Or manually:
```bash
sudo docker service update --image ghcr.io/jesus-baena/chat-humanitarian-agent:latest --force web_chat
```

## Verification

### 1. Check the Test Page
Visit: https://chat.baena.ai/test-flowise

Should show:
- ✅ Flowise URL: `https://flowise.baena.site/api/v1/prediction/...`
- ✅ Flowise API Key: `***SET*** (length: 47)`

### 2. Test a Chat
Visit: https://chat.baena.ai/chat/new

- Send a message
- Should get a response (no "No completion backend configured" error)

## Code Changes Made

### 1. Updated `.github/workflows/deploy.yml`
- Now checks for both `NUXT_PUBLIC_SUPABASE_KEY` (new) and `NUXT_PUBLIC_SUPABASE_ANON_KEY` (legacy)
- Falls back to legacy format if new format isn't set
- Improved diagnostic output

### 2. Updated `Dockerfile`
- Changed from `NUXT_PUBLIC_SUPABASE_ANON_KEY` to `NUXT_PUBLIC_SUPABASE_KEY`
- Matches the new Supabase key format (sb_publishable_*)

## How It Works

```
GitHub Secrets 
    ↓
GitHub Actions Workflow (deploy.yml)
    ↓
Docker Build Arguments (Dockerfile ARG)
    ↓
Build-time Environment Variables (Dockerfile ENV)
    ↓
Nuxt Build Process (pnpm run build)
    ↓
Compiled JavaScript Bundle (.output/)
    ↓
Deployed Docker Image
```

## Troubleshooting

### Still getting the error after rebuilding?

1. **Check GitHub Actions logs**:
   - Verify all secrets show ✅ in "Verify build arguments" step
   - If ❌, the secret wasn't added correctly in GitHub

2. **Check the deployed image**:
   ```bash
   # SSH to server
   docker ps | grep chat
   docker exec <container-id> env | grep FLOWISE
   ```

3. **Verify browser receives the values**:
   - Open browser DevTools → Console
   - Type: `useRuntimeConfig()`
   - Should see `flowiseUrl` and `flowiseApiKey` populated

### The secrets are set but still ❌ in logs?

- Make sure you clicked "Add secret" (not just typed them)
- Check for typos in secret names (must match exactly)
- Try deleting and re-adding the secret

## Files Modified

- `.github/workflows/deploy.yml` - Updated to support new Supabase key format
- `Dockerfile` - Changed to use NUXT_PUBLIC_SUPABASE_KEY
- Created helper scripts:
  - `fix-flowise-secrets.sh` - Shows what secrets to add
  - `verify-github-secrets.sh` - Checks local .env status
  - `FLOWISE_BUILD_FIX.md` - Detailed technical explanation

## Related Documentation

- [Copilot Instructions](/.github/copilot-instructions.md) - Explains the architecture
- [Deployment Guide](/docs/guides/deployment-verification.md) - Full deployment steps
- [Flowise Troubleshooting](/docs/guides/flowise-troubleshooting.md) - API debugging

## Quick Reference

**Check build status**: https://github.com/Jesus-Baena/chat-humanitarian-agent/actions  
**Add secrets**: https://github.com/Jesus-Baena/chat-humanitarian-agent/settings/secrets/actions  
**Test page**: https://chat.baena.ai/test-flowise  
**New chat**: https://chat.baena.ai/chat/new  

---

**Last Updated**: 2025-11-04  
**Status**: ✅ Fix implemented, waiting for secrets to be added
