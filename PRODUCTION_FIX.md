# Production Fix: Messages Not Sending

## Problem
Messages cannot be sent in production. When users try to send messages, the UI doesn't respond and the messages don't get saved or processed.

## Root Cause
The Flowise API URL and API key are not being embedded into the production build. The app uses `NUXT_PUBLIC_FLOWISE_URL` and `NUXT_PUBLIC_FLOWISE_API_KEY` which are **compile-time** environment variables in Nuxt. These need to be provided as **build arguments** when building the Docker image.

### Why This Happened
1. The Dockerfile only had build arguments for Supabase variables, not Flowise
2. The GitHub Actions workflow only passed `NUXT_UI_PRO_LICENSE` as a build arg
3. Without these variables, the frontend has no idea where to send AI completion requests

## What Was Changed

### 1. Updated Dockerfile
Added build arguments and environment variables for Flowise:

```dockerfile
# Build arguments
ARG NUXT_UI_PRO_LICENSE
ARG NUXT_PUBLIC_SUPABASE_URL="http://placeholder"
ARG NUXT_PUBLIC_SUPABASE_ANON_KEY="placeholder"
ARG NUXT_PUBLIC_FLOWISE_URL=""  # ← ADDED
ARG NUXT_PUBLIC_FLOWISE_API_KEY=""  # ← ADDED

# Set environment variables for build
ENV NUXT_UI_PRO_LICENSE=${NUXT_UI_PRO_LICENSE}
ENV NUXT_PUBLIC_SUPABASE_URL=${NUXT_PUBLIC_SUPABASE_URL}
ENV NUXT_PUBLIC_SUPABASE_ANON_KEY=${NUXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NUXT_PUBLIC_FLOWISE_URL=${NUXT_PUBLIC_FLOWISE_URL}  # ← ADDED
ENV NUXT_PUBLIC_FLOWISE_API_KEY=${NUXT_PUBLIC_FLOWISE_API_KEY}  # ← ADDED
```

### 2. Updated GitHub Actions Workflow
Modified `.github/workflows/deploy.yml` to pass all required build arguments:

```yaml
build-args: |
  NUXT_UI_PRO_LICENSE=${{ secrets.NUXT_UI_PRO_LICENSE }}
  NUXT_PUBLIC_SUPABASE_URL=${{ secrets.NUXT_PUBLIC_SUPABASE_URL }}  # ← ADDED
  NUXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.NUXT_PUBLIC_SUPABASE_ANON_KEY }}  # ← ADDED
  NUXT_PUBLIC_FLOWISE_URL=${{ secrets.NUXT_PUBLIC_FLOWISE_URL }}  # ← ADDED
  NUXT_PUBLIC_FLOWISE_API_KEY=${{ secrets.NUXT_PUBLIC_FLOWISE_API_KEY }}  # ← ADDED
```

## Required GitHub Secrets

You need to add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

1. **NUXT_PUBLIC_SUPABASE_URL** - Your Supabase project URL (e.g., `https://qecdwuwkxgwkpopmdewl.supabase.co`)
2. **NUXT_PUBLIC_SUPABASE_ANON_KEY** - Your Supabase publishable/anon key (starts with `sb_publishable_` or looks like a JWT)
3. **NUXT_PUBLIC_FLOWISE_URL** - Your Flowise API endpoint (e.g., `https://flowise.example.com/api/v1/prediction/your-flow-id`)
4. **NUXT_PUBLIC_FLOWISE_API_KEY** - Your Flowise API key (if required)
5. **NUXT_UI_PRO_LICENSE** - Already exists

## Deployment Steps

1. **Add GitHub Secrets** (if not already done):
   - Go to `https://github.com/Jesus-Baena/chat-humanitarian-agent/settings/secrets/actions`
   - Add all the secrets listed above

2. **Rebuild and Deploy**:
   ```bash
   # Push the changes to trigger a new build
   git add Dockerfile .github/workflows/deploy.yml PRODUCTION_FIX.md
   git commit -m "fix: add Flowise build args for production"
   git push origin main
   ```

3. **Verify Build**:
   - Check GitHub Actions to ensure the build succeeds
   - The new image will be pushed to `ghcr.io/jesus-baena/chat-humanitarian-agent:latest`

4. **Update Docker Swarm Service**:
   ```bash
   # On your swarm manager node
   sudo docker service update --image ghcr.io/jesus-baena/chat-humanitarian-agent:latest --force web_chat
   ```

## Verification

After deployment, test:
1. Go to the production URL (e.g., `https://chat.baena.ai`)
2. Start a new chat
3. Send a message
4. Verify that the message is sent and you receive a response from the AI

## Technical Details

### Why NUXT_PUBLIC_* Variables Need Build Args

Nuxt has two types of runtime config:
- **Private** (`runtimeConfig.*`) - Only available on the server
- **Public** (`runtimeConfig.public.*`) - Available on both server and client

Variables prefixed with `NUXT_PUBLIC_` are **public runtime config** and get embedded into the client-side JavaScript bundle during build. This means:
- They must be known at build time
- They can't be changed without rebuilding
- They're visible in the browser (so don't put secrets there!)

### Current Architecture

```
User → Chat UI (Frontend) → Flowise API → AI Model
                ↓
           Supabase DB
```

The frontend directly calls Flowise to stream AI responses, which is why it needs the Flowise URL at compile time.

## Future Improvements

Consider moving to a server-side proxy pattern:
```
User → Chat UI → Nuxt API Route → Flowise API → AI Model
```

This would:
- Hide the Flowise URL from the client
- Allow runtime configuration changes
- Add better rate limiting and error handling
- Improve security
