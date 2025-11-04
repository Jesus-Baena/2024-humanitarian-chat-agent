# Fix: "No completion backend configured" Error

## Problem
The application shows "No completion backend configured" error because Flowise environment variables are not being baked into the Docker image during build.

## Root Cause
Nuxt's `runtimeConfig.public` variables (`NUXT_PUBLIC_FLOWISE_URL` and `NUXT_PUBLIC_FLOWISE_API_KEY`) must be available at **BUILD TIME** because they get embedded in the client-side JavaScript bundle. Runtime environment variables won't work for client-side code.

## Current Status
✅ Dockerfile accepts build arguments (lines 13-14)  
✅ GitHub Actions workflow passes build args (lines 71-72)  
❌ GitHub Secrets are likely **NOT SET** in the repository  

## Solution: Set GitHub Repository Secrets

### Step 1: Add GitHub Secrets
Go to your GitHub repository settings and add these secrets:

**Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

1. **NUXT_PUBLIC_FLOWISE_URL**
   ```
   https://flowise.baena.site/api/v1/prediction/40718af9-e9bd-47d9-a57b-009cb26f8fe3
   ```

2. **NUXT_PUBLIC_FLOWISE_API_KEY**
   ```
   FO5JgBFwXMPQDE_XrgDn8FSYpGbgtyeZ2h7YlJd-Skk
   ```

3. **NUXT_PUBLIC_SITE_URL** (if not already set)
   ```
   https://chat.baena.ai
   ```

4. **NUXT_PUBLIC_SUPABASE_URL** (if not already set)
   ```
   <your-supabase-project-url>
   ```

5. **NUXT_PUBLIC_SUPABASE_ANON_KEY** (if not already set)
   ```
   <your-supabase-anon-key>
   ```

### Step 2: Trigger a New Build
After setting the secrets, trigger a new build by either:

**Option A: Push to main branch**
```bash
git commit --allow-empty -m "Rebuild with Flowise secrets"
git push origin main
```

**Option B: Manual workflow dispatch**
Go to: Actions → "Build and Push Docker Image" → Run workflow

### Step 3: Verify the Build
Check the GitHub Actions logs for the "Verify build arguments" step. It should show:
```
NUXT_PUBLIC_FLOWISE_URL: ✅ Set
NUXT_PUBLIC_FLOWISE_API_KEY: ✅ Set
```

### Step 4: Deploy the New Image
Once the build completes successfully, deploy:

```bash
./deploy-stack.sh
```

Or manually:
```bash
sudo docker service update --image ghcr.io/jesus-baena/chat-humanitarian-agent:latest --force web_chat
```

## Verification

After deployment, test the configuration:

1. **Visit the test page**: https://chat.baena.ai/test-flowise
   - Should show the Flowise URL and API key status
   - Click "Test Flowise Connection" to verify connectivity

2. **Try a chat**: https://chat.baena.ai/chat/new
   - Send a message
   - Should receive a response (not "No completion backend configured")

## Why This Happens

**Build-time vs Runtime Variables:**
- `NUXT_PUBLIC_*` variables are used by Nuxt's client-side code
- Client-side code is compiled during `pnpm run build`
- These values get embedded in the JavaScript bundle
- Setting them at runtime (via Docker env vars) is too late

**The Fix:**
- GitHub Secrets → Build Args → Docker Image → Deployed Container
- This ensures the values are available when Nuxt builds the client bundle

## Debugging Commands

Check if variables are in the running container:
```bash
# SSH to your server
docker service ps web_chat

# Get container ID
docker ps | grep chat

# Check environment
docker exec <container-id> env | grep FLOWISE

# Check compiled config (this shows build-time values)
docker exec <container-id> cat .output/server/chunks/build/app.config.mjs
```

## Additional Notes

- The values in `.env` are for local development only
- The values in `docker-compose.prod.yml` environment section are runtime-only (won't work for client code)
- The values in `Dockerfile` ARG section need to come from GitHub Secrets during CI/CD
- Without GitHub Secrets, the build args default to empty strings

## Related Files
- `.github/workflows/deploy.yml` - Passes secrets as build args
- `Dockerfile` - Accepts build args and sets build-time env vars
- `nuxt.config.ts` - Reads env vars at build time for runtimeConfig.public
- `app/composables/useAssistants.ts` - Throws error when flowiseUrl is undefined
