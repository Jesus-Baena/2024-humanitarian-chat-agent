# Quick Reference: Preventing "No completion backend configured"

## The Golden Rule
**`NUXT_PUBLIC_*` variables must be set as GitHub Secrets, not just in Docker.**

## Why?
Nuxt bakes these values into JavaScript **at build time** (GitHub Actions), not runtime (Docker container).

## Required GitHub Secrets
Go to: https://github.com/Jesus-Baena/chat-humanitarian-agent/settings/secrets/actions

```
NUXT_UI_PRO_LICENSE = <your-nuxt-ui-pro-license>
NUXT_PUBLIC_SITE_URL = <your-production-url>
NUXT_PUBLIC_SUPABASE_URL = <your-supabase-project-url>
NUXT_PUBLIC_SUPABASE_KEY = <your-supabase-anon-key>
NUXT_PUBLIC_FLOWISE_URL = <your-flowise-prediction-url>
NUXT_PUBLIC_FLOWISE_API_KEY = <your-flowise-api-key>
```

**Get actual values from:**
- `.env` file on your local machine
- Supabase Dashboard → Settings → API
- Flowise instance settings
- Nuxt UI Pro purchase email

## Verification Checklist

After setting secrets:

1. **Push code** → Triggers GitHub Actions build
2. **Check workflow logs** → "Verify build arguments" step should show ✅ for all secrets
3. **Build should succeed** → If Flowise URL is missing, build now **fails immediately**
4. **Deploy** → `./deploy-stack.sh`
5. **Test health** → `curl https://chat.baena.ai/api/health` should return `"status": "healthy"`
6. **Test chat** → Send a message, should get AI response

## Quick Diagnostic

**Error still happening?**

```bash
# 1. Check GitHub Actions logs
# Go to: https://github.com/Jesus-Baena/chat-humanitarian-agent/actions
# Look for ❌ Missing in "Verify build arguments" step

# 2. Check health endpoint
curl https://chat.baena.ai/api/health
# Should return: {"status": "healthy", ...}

# 3. Check test page
# Visit: https://chat.baena.ai/test-flowise
# Should show: Flowise URL: https://flowise.baena.site/...
```

## Common Mistakes

❌ Setting env vars in `docker-compose.yml` only  
✅ Set as GitHub Secrets

❌ Setting env vars in `.env` only  
✅ Set as GitHub Secrets

❌ Setting Docker Swarm secrets only  
✅ Set as GitHub Secrets

❌ Expecting runtime env vars to work  
✅ Must be set at BUILD time in GitHub Actions

## Full Documentation

- **First time setup:** See `SECRETS_SETUP.md`
- **Technical details:** See `PERMANENT_FIX.md`
- **This fix summary:** See `FIX_SUMMARY.md`

---
**Print this page and pin it to your wall** 📌
