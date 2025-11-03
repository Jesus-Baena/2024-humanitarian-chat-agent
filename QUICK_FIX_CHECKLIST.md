# Quick Fix Checklist - Authentication

## TL;DR

**Problem**: No login page exists, authentication is broken.  
**Solution**: Create 3 files, update 1 config.  
**Time**: 1-2 hours  
**Risk**: LOW  

---

## Files to Create/Modify

### ✅ Priority 1: CRITICAL

#### [ ] Create `/app/pages/login.vue`
**Impact**: Users can now login  
**Complexity**: Easy  
**Template**: See `AUTH_IMPLEMENTATION_GUIDE.md` (lines 1-200)  

**Checklist**:
- [ ] Copy code from guide
- [ ] Check imports are correct
- [ ] Test email/password flow
- [ ] Test OAuth buttons
- [ ] Verify redirect handling

#### [ ] Fix `/app/pages/auth/callback.vue`  
**Impact**: OAuth callbacks work properly  
**Complexity**: Medium  
**Template**: See `AUTH_IMPLEMENTATION_GUIDE.md` (lines 211-270)  

**Checklist**:
- [ ] Remove broken `getSession()` call
- [ ] Add proper redirect logic
- [ ] Test OAuth redirect
- [ ] Verify session established
- [ ] Test error handling

#### [ ] Update `nuxt.config.ts`
**Impact**: Module redirects to login, not home  
**Complexity**: Easy  
**Change**: 3-5 lines  

**Checklist**:
- [ ] Change `login: '/'` → `login: '/login'`
- [ ] Add `/login` to exclude list
- [ ] Add `/signup` to exclude list
- [ ] Restart dev server

---

### ⚠️ Priority 2: OPTIONAL

#### [ ] Create `/app/pages/signup.vue`
**Impact**: Users can self-register  
**Complexity**: Easy  
**Template**: See `AUTH_IMPLEMENTATION_GUIDE.md` (lines 303-380)  

#### [ ] Create `/app/middleware/unauthenticated.ts`
**Impact**: Redirect already-logged-in users from login  
**Complexity**: Easy  
**Template**: See `AUTH_IMPLEMENTATION_GUIDE.md` (lines 390-410)  

---

## Testing After Each Change

### After creating login.vue
```bash
# Start dev server
pnpm dev

# Test in browser
curl http://localhost:3000/login
# Should show login form (not 404)
```

### After fixing callback.vue
```bash
# Test OAuth redirect works
# 1. Click Google button on /login
# 2. Complete Google auth
# 3. Should redirect back to chat and be logged in
# 4. Check: useSupabaseUser() should have user object
```

### After updating config
```bash
# Restart dev server to reload config
pnpm dev

# Test redirect
# 1. Open incognito window
# 2. Visit http://localhost:3000
# 3. Should stay on home (not redirect to /login yet - optional)
# 4. Click "Sign in" button
# 5. Should navigate to /login
```

---

## Copy-Paste Guide

### Step 1: Login Page
```bash
# File: app/pages/login.vue
# Location: AUTH_IMPLEMENTATION_GUIDE.md, section "Step 1: Create Login Page"
# Copy entire Vue component (lines 1-200 approx)
# Paste into new file
# No modifications needed
```

### Step 2: Auth Callback
```bash
# File: app/pages/auth/callback.vue
# Location: AUTH_IMPLEMENTATION_GUIDE.md, section "Step 2: Fix Auth Callback"
# Copy entire Vue component (lines 211-270 approx)
# Replace existing file contents
```

### Step 3: Nuxt Config
```bash
# File: nuxt.config.ts
# Find: ['@nuxtjs/supabase', { redirectOptions: { ... } }]
# Change: login: '/' → login: '/login'
# Add to exclude: '/login', '/signup'
```

---

## Verification Checklist

### Can User Login?
- [ ] Navigate to `/login`
- [ ] Page loads (not 404)
- [ ] Form fields visible
- [ ] Enter email + password
- [ ] Click "Sign in"
- [ ] Success message appears
- [ ] Redirected to home
- [ ] User is logged in

### Can User Use OAuth?
- [ ] Click "Google" button
- [ ] Redirected to Google
- [ ] Auth page loads
- [ ] Select account
- [ ] Redirected back to `/auth/callback`
- [ ] Session established
- [ ] Logged in

### Does Session Persist?
- [ ] User logged in
- [ ] Refresh page
- [ ] Still logged in
- [ ] User object available via `useSupabaseUser()`

### Cross-Domain Auth?
- [ ] Login on baena.ai ✓ (already works)
- [ ] Visit chat.baena.ai
- [ ] Should still be logged in
- [ ] Session shared via `.baena.ai` cookie

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| `Cannot GET /login` | Check file path: `/app/pages/login.vue` |
| OAuth redirect fails | Verify Supabase auth settings has correct redirect URLs |
| Session not persisting | Check cookies in dev tools → `sb-` prefix cookies should be there |
| Redirect loop | Check nuxt.config excludes `/login` and `/signup` |
| "Cannot read useSupabaseClient" | Import: `const supabase = useSupabaseClient()` |
| Form validation fails | Check Zod schema matches form data |

---

## Rollback Plan

If something breaks:

```bash
# Revert changes
git checkout app/pages/auth/callback.vue
git checkout nuxt.config.ts

# Optional: Remove new files
rm app/pages/login.vue

# Restart server
pnpm dev
```

The app will revert to current (broken) state - no data loss.

---

## Performance Impact

✅ **No performance impact**
- Same Supabase instance
- No new database queries
- No new dependencies
- ~5KB additional code

---

## Security Impact

✅ **Improves security**
- Enables password-based auth (currently unavailable)
- Enables OAuth (more secure than basic auth)
- Sessions properly secured with HTTPOnly cookies
- No sensitive data exposed

---

## Files Created for Reference

| File | Purpose | Read Time |
|------|---------|-----------|
| `AUTHENTICATION_EXECUTIVE_SUMMARY.md` | High-level overview | 5 min |
| `AUTH_INVESTIGATION_REPORT.md` | Technical analysis | 15 min |
| `AUTH_IMPLEMENTATION_GUIDE.md` | Step-by-step with code | 20 min |
| `AUTH_FLOW_COMPARISON.md` | Before/after comparison | 10 min |
| `AUTH_FIX_SUMMARY.md` | Quick status matrix | 3 min |
| This file | Implementation checklist | 2 min |

---

## Next 30 Minutes

1. **Read** `AUTHENTICATION_EXECUTIVE_SUMMARY.md` (5 min)
2. **Understand** the 3-file fix
3. **Open** `AUTH_IMPLEMENTATION_GUIDE.md`
4. **Copy** login.vue code (5 min)
5. **Copy** callback.vue code (3 min)
6. **Update** nuxt.config.ts (2 min)
7. **Restart** dev server (1 min)
8. **Test** login page loads (1 min)
9. **Test** OAuth redirect (3 min)
10. **Verify** session persists (5 min)

---

## Questions?

See detailed sections in:
- **What's broken?** → `AUTH_INVESTIGATION_REPORT.md`
- **How do I fix it?** → `AUTH_IMPLEMENTATION_GUIDE.md`
- **Why is it broken?** → `AUTH_FLOW_COMPARISON.md`
- **What changed?** → Side-by-side diffs in guides

---

## Done!

After completing these steps:
- ✅ Users can login with email/password
- ✅ Users can login with OAuth (Google, GitHub)
- ✅ Sessions persist across subdomains
- ✅ Authentication is fully functional
- ✅ Ready for production deployment
