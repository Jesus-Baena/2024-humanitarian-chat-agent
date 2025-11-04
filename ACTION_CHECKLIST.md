# "No completion backend configured" - Action Checklist

## TL;DR - The Actual Problem

**The GitHub Secrets `NUXT_PUBLIC_FLOWISE_URL` and `NUXT_PUBLIC_FLOWISE_API_KEY` are likely NOT SET in your repository.**

Your local `.env` has them ✅  
Your `docker-compose.prod.yml` has them ✅  
But your **GitHub repository secrets** probably don't ❌

## Why This Matters

Nuxt bakes `NUXT_PUBLIC_*` values into the client JavaScript bundle **during build time**. Runtime environment variables are too late.

```
Build Time (GitHub Actions)  →  Values baked into .js bundle
Runtime (Docker Swarm)       →  Too late, code already compiled
```

## Immediate Action Required

### ✅ Step 1: Verify GitHub Secrets Exist

**Go to:** https://github.com/Jesus-Baena/chat-humanitarian-agent/settings/secrets/actions

**Check if these secrets exist:**
- [ ] `NUXT_UI_PRO_LICENSE`
- [ ] `NUXT_PUBLIC_SITE_URL`
- [ ] `NUXT_PUBLIC_SUPABASE_URL`
- [ ] `NUXT_PUBLIC_SUPABASE_KEY`
- [ ] `NUXT_PUBLIC_FLOWISE_URL` ⚠️ **Most likely MISSING**
- [ ] `NUXT_PUBLIC_FLOWISE_API_KEY` ⚠️ **Most likely MISSING**

**If any are missing, click "New repository secret" and add them.**

### ✅ Step 2: Add Missing Secrets

Click **"New repository secret"** for each missing item:

**Secret:** `NUXT_PUBLIC_FLOWISE_URL`  
**Value:**
```
https://flowise.baena.site/api/v1/prediction/40718af9-e9bd-47d9-a57b-009cb26f8fe3
```

**Secret:** `NUXT_PUBLIC_FLOWISE_API_KEY`  
**Value:**
```
FO5JgBFwXMPQDE_XrgDn8FSYpGbgtyeZ2h7YlJd-Skk
```

**Secret:** `NUXT_PUBLIC_SUPABASE_KEY`  
**Value:**
```
sb_publishable_1bD243SmZOm1oXJCcMkZrg_qb6DpeMI
```

### ✅ Step 3: Trigger New Build

After adding secrets, you **MUST rebuild** the Docker image:

**Option A: GitHub UI (Recommended)**
1. Go to: https://github.com/Jesus-Baena/chat-humanitarian-agent/actions
2. Click "Build and Push Docker Image" workflow
3. Click "Run workflow" dropdown → "Run workflow" button
4. Wait ~5 minutes for completion

**Option B: Git Push**
```bash
git commit --allow-empty -m "Trigger rebuild with secrets"
git push origin main
```

### ✅ Step 4: Verify Build Succeeded

**Check the workflow logs:**

1. Go to https://github.com/Jesus-Baena/chat-humanitarian-agent/actions
2. Click the most recent workflow run
3. Expand "Verify build arguments (diagnostic)"

**You should see:**
```
NUXT_PUBLIC_FLOWISE_URL: ✅ Set
NUXT_PUBLIC_FLOWISE_API_KEY: ✅ Set
```

**If you see ❌ Missing:**
- The secret wasn't added correctly
- Go back to Step 1 and re-add it
- Make sure you clicked "Add secret" (not just previewed)

### ✅ Step 5: Deploy New Image

Once the build completes successfully:

```bash
cd /home/jbi-laptop/Git/chat-humanitarian-agent
./deploy-stack.sh
```

Or manually:
```bash
ssh your-server
sudo docker service update \
  --image ghcr.io/jesus-baena/chat-humanitarian-agent:latest \
  --force web_chat
```

### ✅ Step 6: Verify Fix Worked

**Test 1: Visit test page**
```
https://chat.baena.ai/test-flowise
```

Should show:
- ✅ `Flowise URL: https://flowise.baena.site/api/v1/prediction/...`
- ✅ `Flowise API Key: ***SET*** (length: 47)`

**Test 2: Send a chat message**
```
https://chat.baena.ai/chat/new
```

- Send message: "Hello"
- Should receive AI response (not "No completion backend configured")

## Troubleshooting

### "I added the secrets but still getting the error"

**Did you rebuild the image?**
- Adding secrets alone doesn't help
- You MUST trigger a new GitHub Actions build
- The new build bakes the secrets into the image

**Did the build complete?**
- Check https://github.com/Jesus-Baena/chat-humanitarian-agent/actions
- Make sure the latest run shows ✅ (green checkmark)

**Did you deploy the new image?**
- After building, you need to deploy: `./deploy-stack.sh`

### "The build logs still show ❌ Missing"

- The secret wasn't added correctly in GitHub
- Check for typos in secret names (must match EXACTLY)
- Try removing and re-adding the secret
- Make sure you're in the correct repository

### "Test page still shows 'NOT SET'"

- The deployed image is old (built before secrets were added)
- Follow Step 3 to rebuild
- Follow Step 5 to redeploy

## Why Your Current Setup Doesn't Work

Your `docker-compose.prod.yml` has:
```yaml
environment:
  - NUXT_PUBLIC_FLOWISE_URL=https://flowise.baena.site/...
  - NUXT_PUBLIC_FLOWISE_API_KEY=FO5JgBFwXMPQDE_...
```

**This sets RUNTIME environment variables**, but:
- Nuxt's client code is already compiled in the Docker image
- Runtime env vars don't affect compiled JavaScript
- Client code was compiled with `flowiseUrl = undefined`

**The fix:**
- GitHub Secrets → Build args → Compiled into .js bundle ✅
- Docker env vars → Runtime only → Too late for client code ❌

## Quick Reference

| What | URL |
|------|-----|
| Add Secrets | https://github.com/Jesus-Baena/chat-humanitarian-agent/settings/secrets/actions |
| Trigger Build | https://github.com/Jesus-Baena/chat-humanitarian-agent/actions |
| Check Build Logs | https://github.com/Jesus-Baena/chat-humanitarian-agent/actions |
| Test Page | https://chat.baena.ai/test-flowise |
| New Chat | https://chat.baena.ai/chat/new |

## Helper Scripts

Run these for diagnostics:
```bash
./diagnose-flowise-issue.sh  # Complete diagnostic
./fix-flowise-secrets.sh     # Show what secrets to add
./verify-github-secrets.sh   # Check local .env status
```

---

**Next Steps:** Go to Step 1 and verify GitHub Secrets exist!
