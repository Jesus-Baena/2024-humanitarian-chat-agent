# Rate Limit Error - Quick Fix Guide

## The Problem You're Experiencing

**Symptom:** Getting 429 rate limit errors when trying to log in, even though you haven't made many attempts.

**Real Cause:** Your browser has **invalid/expired refresh tokens** stored in cookies. The app keeps trying to refresh them automatically, hitting Supabase's rate limits.

---

## IMMEDIATE FIX (Do This Now)

### Option 1: Clear Supabase Cookies (Fastest)

1. **Open Browser DevTools** (Press F12)
2. Click **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Cookies** → `https://chat.baena.ai`
4. **Delete all cookies** that start with `sb-`
5. **Refresh the page**

### Option 2: Use Incognito/Private Window

Open `https://chat.baena.ai` in an incognito/private window and log in there.

### Option 3: JavaScript Console

1. Open Console (F12 → Console tab)
2. Paste this code:
```javascript
document.cookie.split(";").forEach(c => {
  const n = c.split("=")[0].trim();
  if (n.startsWith("sb-")) {
    document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    const parts = location.hostname.split(".");
    if (parts.length >= 2) {
      document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + parts.slice(-2).join(".");
    }
  }
});
location.reload();
```

---

## What I Found in Your Logs

Using Supabase MCP tools, I checked your auth logs from today (Nov 12, 2025 at 09:23 UTC).

**The issue is NOT too many login attempts.**

**The actual issue:**
- 100+ failed refresh token requests in seconds
- Error: `"refresh_token_not_found"`
- Error: `"over_request_rate_limit"`
- All from IP: `94.45.51.230`
- Path: `POST /token` with `grant_type=refresh_token`

This is a **refresh token loop** - your browser had an expired token and kept trying to refresh it automatically.

---

## What I've Fixed

### 1. Better Error Messages ✅
**Files:** `app/pages/login.vue`, `app/pages/signup.vue`

Now shows user-friendly messages:
- "Too many login attempts. Please wait a few minutes and try again."
- Detects rate limit errors specifically

### 2. Automatic Protection ✅
**File:** `app/plugins/02.supabase-refresh-guard.client.ts`

**What it does:**
- Detects when refresh tokens keep failing
- Automatically clears bad cookies after 3 failures
- Prevents the rate limit loop from happening

**You'll see warnings like:**
```
[supabase-refresh-guard] Token refresh failed (2/3)
[supabase-refresh-guard] Too many refresh failures. Clearing session.
```

### 3. Updated Documentation ✅
**File:** `docs/troubleshooting/rate-limit-errors.md`

Complete guide with:
- Root cause explanation
- Step-by-step fixes
- How to diagnose in Supabase dashboard
- Prevention strategies

---

## Testing the Fix

After clearing cookies:

1. Visit `https://chat.baena.ai`
2. Open browser console (F12)
3. Try to log in
4. You should NOT see rate limit errors anymore

If you do see errors, check console for `[supabase-refresh-guard]` messages.

---

## Why This Happened

1. You (or someone) logged in previously
2. The session expired or refresh token was revoked
3. But the cookie with the old refresh token remained in your browser
4. Every time you loaded the page, Nuxt Supabase tried to auto-refresh
5. The refresh failed → tried again → failed → tried again → rate limited

**Common triggers:**
- Logging out in one tab but not clearing cookies
- Database/auth changes that invalidate tokens
- Session expiry (default 8 hours in your config)
- Multiple browser tabs competing to refresh

---

## Verify Rate Limits Are Working

Your Supabase rate limits per IP address:
- **Email signups:** ~5 per hour
- **Email logins:** ~60 per hour  
- **Token refreshes:** ~150 per hour per IP

Check current limits:
https://supabase.com/dashboard/project/qecdwuwkxgwkpopmdewl/auth/rate-limits

---

## Next Steps

1. **Clear your cookies now** (see "Immediate Fix" above)
2. Try logging in - it should work
3. If still having issues, check browser console for errors
4. Look at Supabase logs: https://supabase.com/dashboard/project/qecdwuwkxgwkpopmdewl/logs/auth-logs

The automatic protection I added will prevent this from happening again in the future.
