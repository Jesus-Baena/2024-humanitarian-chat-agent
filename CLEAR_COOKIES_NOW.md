# IMMEDIATE ACTION REQUIRED - Rate Limit Fix

## Current Situation
You're still getting rate limit errors because **the bad cookies are still in your browser** and **the new protection code hasn't been deployed yet**.

---

## DO THIS RIGHT NOW (Takes 2 minutes)

### Option A: Clear Cookies Manually (FASTEST)

#### Chrome/Edge:
1. Press **F12** to open DevTools
2. Click **"Application"** tab at the top
3. In left sidebar, expand **"Cookies"**
4. Click on **"https://chat.baena.ai"**
5. Look for cookies starting with **"sb-"** (like `sb-qecdwuwkxgwkpopmdewl-auth-token`)
6. **Right-click each one** → **Delete**
7. **Refresh the page**

#### Firefox:
1. Press **F12** to open DevTools
2. Click **"Storage"** tab
3. Expand **"Cookies"**
4. Click on **"https://chat.baena.ai"**
5. **Delete all cookies** starting with **"sb-"**
6. **Refresh the page**

### Option B: Use Diagnostic Tool

1. Open this file in your browser:
   ```
   file:///home/jbi-laptop/Git/chat-humanitarian-agent/diagnose-rate-limit.html
   ```

2. Click **"Check Supabase Cookies"**
3. Click **"Clear All Supabase Cookies"**
4. Wait the page to confirm
5. Go to chat.baena.ai

### Option C: JavaScript Console (QUICKEST)

1. Press **F12** → **Console** tab
2. **Paste this** and press Enter:

```javascript
// Clear all Supabase cookies
let cleared = 0;
document.cookie.split(";").forEach(c => {
  const n = c.split("=")[0].trim();
  if (n.startsWith("sb-")) {
    document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    const parts = location.hostname.split(".");
    if (parts.length >= 2) {
      document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + parts.slice(-2).join(".");
    }
    cleared++;
  }
});
console.log("✅ Cleared " + cleared + " Supabase cookies");
location.reload();
```

---

## IMPORTANT: After Clearing Cookies

### 1. Wait 5-10 Minutes
The rate limit needs time to reset. Supabase rate limits reset after **~1 hour**, but waiting 5-10 minutes usually helps.

### 2. Try Logging In
- Go to https://chat.baena.ai/login
- Use your email and password
- It should work now

### 3. If Still Getting Errors
Check if you're still seeing rate limit errors in the **browser console** (F12 → Console tab).

Look for:
- ❌ `429` errors
- ❌ `Request rate limit reached`
- ✅ `[supabase-refresh-guard]` messages (from the new protection - but it's not deployed yet)

---

## Deploy the Fix (To Prevent Future Issues)

The code I wrote will prevent this from happening again, but you need to deploy it:

```bash
cd /home/jbi-laptop/Git/chat-humanitarian-agent

# Check what changed
git status

# Add the new files
git add app/plugins/02.supabase-refresh-guard.client.ts
git add app/pages/login.vue
git add app/pages/signup.vue
git add docs/troubleshooting/rate-limit-errors.md

# Commit
git commit -m "fix: Add automatic refresh token loop protection to prevent rate limiting

- Add supabase-refresh-guard plugin to detect and clear invalid tokens
- Improve error messages in login/signup pages
- Add comprehensive troubleshooting documentation

Fixes rate limit errors caused by expired refresh tokens in cookies."

# Push to trigger deployment
git push origin main
```

**OR** if you want to deploy immediately:

```bash
# Build the Docker image
docker build -t chat-app .

# Deploy using your existing deployment script
./deploy-stack.sh
```

---

## Why This Is Happening

1. **You have old cookies** with expired refresh tokens
2. **Every page load**, Nuxt Supabase tries to refresh them
3. **It fails** → tries again → fails → **rate limited**
4. **The new protection code** I wrote will auto-clear these, but it's **not deployed yet**

---

## Verify It's Fixed

After clearing cookies and waiting, try:

1. Open https://chat.baena.ai in **incognito mode**
2. Try to log in
3. If it works → cookies were the issue ✅
4. If it fails → rate limit needs more time to reset ⏰

---

## Check Supabase Dashboard

While waiting, check if rate limits are still active:

1. Go to: https://supabase.com/dashboard/project/qecdwuwkxgwkpopmdewl/logs/auth-logs
2. Look at recent logs
3. **If you see many `/token` requests with 429** → rate limit is still active, wait longer
4. **If you see no recent errors** → try logging in again

---

## TL;DR - 3 Steps

1. **Clear cookies** (use Option C JavaScript console - fastest)
2. **Wait 5-10 minutes**
3. **Try logging in** at https://chat.baena.ai/login

Then deploy the fix to prevent it from happening again.
