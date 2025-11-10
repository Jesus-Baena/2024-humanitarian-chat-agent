# PERMANENT FIX: "No completion backend configured"

## What Was Fixed (November 10, 2025)

This issue has been permanently fixed through multiple layers of protection. It **should never happen again** if you follow the setup instructions.

## Root Cause

The recurring issue was caused by:

1. **GitHub Secrets not being set** (or set with wrong names)
2. **Silent failures** - builds succeeded even without Flowise config
3. **Confusing variable names** - `NUXT_PUBLIC_SUPABASE_ANON_KEY` vs `NUXT_PUBLIC_SUPABASE_KEY`
4. **Lack of validation** - no checks during build or runtime

## How It's Fixed

### 1. Build-Time Validation (Dockerfile)

The Docker build now **fails immediately** if `NUXT_PUBLIC_FLOWISE_URL` is missing:

```dockerfile
RUN if [ -z "$NUXT_PUBLIC_FLOWISE_URL" ]; then \
      echo "❌ ERROR: NUXT_PUBLIC_FLOWISE_URL is required but not set!" && \
      exit 1; \
    fi
```

**Result:** You can't accidentally build a broken image.

### 2. Workflow Diagnostics (.github/workflows/deploy.yml)

The GitHub Actions workflow now shows ✅/❌ for all secrets:

```yaml
- name: Verify build arguments (diagnostic)
  run: |
    echo "NUXT_PUBLIC_FLOWISE_URL: ${{ secrets.NUXT_PUBLIC_FLOWISE_URL != '' && '✅ Set' || '❌ Missing' }}"
```

**Result:** You can instantly see if secrets are missing.

### 3. Standardized Variable Names

Both old and new Supabase key formats are now supported:

```yaml
NUXT_PUBLIC_SUPABASE_KEY=${{ secrets.NUXT_PUBLIC_SUPABASE_KEY || secrets.NUXT_PUBLIC_SUPABASE_ANON_KEY }}
```

**Result:** Works with both `sb_publishable_*` (new) and JWT (legacy) keys.

### 4. Runtime Health Check (server/api/health.get.ts)

New `/api/health` endpoint returns 503 if configuration is missing:

```json
{
  "status": "unhealthy",
  "checks": {
    "flowise": {
      "status": "error",
      "error": "NUXT_PUBLIC_FLOWISE_URL not configured"
    }
  }
}
```

**Result:** Monitoring systems can detect misconfigurations.

### 5. Clear Documentation (SECRETS_SETUP.md)

Comprehensive guide explaining:
- **Why** GitHub Secrets are required (not just how)
- **What** happens if you skip setup
- **How** to verify secrets are working
- **Troubleshooting** for common issues

**Result:** No more confusion about build-time vs runtime config.

## Prevention Checklist

To ensure this never happens again:

### For Initial Setup

- [ ] Follow [SECRETS_SETUP.md](SECRETS_SETUP.md) to configure GitHub Secrets
- [ ] Verify all 6 secrets are added (not just previewed)
- [ ] Trigger a build and check workflow logs show ✅ for all secrets
- [ ] Deploy and test `/api/health` endpoint returns 200 OK
- [ ] Test a chat message works end-to-end

### For Each Deployment

- [ ] GitHub Actions build succeeds (not just runs)
- [ ] Workflow diagnostic step shows ✅ for Flowise secrets
- [ ] Check `/api/health` returns `"status": "healthy"`
- [ ] Test page at `/test-flowise` shows Flowise URL configured
- [ ] Send a test chat message and verify AI responds

### If It Breaks Again

1. **Check GitHub Actions logs** first
   - Go to: https://github.com/Jesus-Baena/chat-humanitarian-agent/actions
   - Expand "Verify build arguments (diagnostic)"
   - Look for ❌ Missing next to any secret

2. **Check the health endpoint**
   ```bash
   curl https://chat.baena.ai/api/health
   ```

3. **Re-verify GitHub Secrets**
   - Go to: https://github.com/Jesus-Baena/chat-humanitarian-agent/settings/secrets/actions
   - Make sure all 6 secrets exist
   - Delete and re-add any marked ❌ in workflow logs

## Files Modified

| File | Change | Why |
|------|--------|-----|
| `.github/workflows/deploy.yml` | Added diagnostic step, support both key formats | Shows ✅/❌ for secrets, backwards compatible |
| `Dockerfile` | Added validation, fails if FLOWISE_URL missing | Prevents building broken images |
| `SECRETS_SETUP.md` | Complete setup guide | Clear instructions, explains WHY not just HOW |
| `README.md` | Prominent warning about secrets | Hard to miss during onboarding |
| `server/api/health.get.ts` | Health check endpoint | Runtime validation, monitoring support |
| `PERMANENT_FIX.md` | This document | Reference for future debugging |

## Technical Details

### Why `NUXT_PUBLIC_*` Must Be Set at Build Time

Nuxt uses Vite, which performs **static code analysis** during `pnpm build`:

1. Vite scans code for `import.meta.env.NUXT_PUBLIC_*` references
2. It **replaces** them with literal values (like search/replace)
3. The final JavaScript bundle contains hardcoded strings
4. At runtime, the values are already baked in - changing env vars has no effect

Example of compiled output:
```javascript
// Source code:
const url = import.meta.env.NUXT_PUBLIC_FLOWISE_URL

// Compiled (if set at build time):
const url = "https://flowise.baena.site/api/v1/prediction/..."

// Compiled (if empty at build time):
const url = undefined  // ❌ This is what causes "No completion backend configured"
```

### The Build Pipeline

```
GitHub Secrets
    ↓ (read by GitHub Actions)
GitHub Actions Workflow
    ↓ (pass as --build-arg)
Dockerfile ARG → ENV
    ↓ (available during pnpm build)
Nuxt/Vite Build Process
    ↓ (bakes into .js bundle)
Compiled JavaScript (.output/public/_nuxt/*.js)
    ↓ (embedded in Docker image)
Production Container
    ↓ (values already hardcoded)
Browser receives bundle with embedded values
```

## Success Criteria

You know the fix is working when:

1. ✅ GitHub Actions workflow shows ✅ for all secrets
2. ✅ Docker build succeeds (doesn't fail on validation step)
3. ✅ `/api/health` returns `{"status": "healthy"}`
4. ✅ `/test-flowise` shows Flowise URL configured
5. ✅ Chat messages get AI responses (no errors)

## If You're Reading This Because It Broke Again

First, I'm sorry. This shouldn't happen anymore.

But if it did, here's the diagnostic process:

1. **When did it break?** After a fresh deploy? After changing secrets?
2. **Check the build logs** - What does "Verify build arguments" show?
3. **Check GitHub Secrets** - Are they still there? Correct names?
4. **Check the Docker image** - Is it the latest build?
   ```bash
   docker service ps web_chat --no-trunc
   # Check the image SHA matches latest GitHub Actions build
   ```

If all else fails:
```bash
# Nuclear option: Force rebuild everything
git commit --allow-empty -m "Force rebuild"
git push origin main
# Wait for build to complete
./deploy-stack.sh
```

## Maintenance Notes

### When to Update GitHub Secrets

- Flowise chatflow ID changes
- Flowise API key rotates
- Supabase project changes
- Any `NUXT_PUBLIC_*` value needs updating

**Remember:** After updating a GitHub Secret, you MUST trigger a new build for it to take effect.

### When to Check Health Endpoint

- After every deployment
- In CI/CD health checks
- In monitoring/alerting systems
- When debugging production issues

### When to Review This Document

- When onboarding new developers
- When deployment process changes
- When troubleshooting configuration issues
- Every 6 months (scheduled review)

---

**Last Updated:** November 10, 2025  
**Status:** ✅ Issue permanently resolved with multiple layers of protection  
**Next Review:** May 10, 2026
