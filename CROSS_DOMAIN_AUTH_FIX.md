# Cross-Domain Authentication Fix

## Problem Summary

After logging in at `baena.ai`, the authentication session was not persisting when navigating to `chat.baena.ai`. The user would appear logged in on the main portfolio but not on the chat application.

## Root Cause

**Cookie Domain Mismatch Between Client and Server**

1. **Server-side** (`server/utils/supabase.ts`): Correctly set cookies with domain `.baena.ai` to share across subdomains ✅
2. **Client-side** (`@nuxtjs/supabase` module): Used default cookie options without domain attribute, creating subdomain-specific cookies ❌

This caused the client-side Supabase client to override the shared `.baena.ai` cookies with `chat.baena.ai`-specific cookies, breaking cross-subdomain authentication.

## Changes Made

### 1. Configure Cookie Domain in `nuxt.config.ts`

Added `cookieOptions` to the `@nuxtjs/supabase` module configuration with domain computation logic:

```typescript
// Compute cookie domain to share auth across subdomains
const computeCookieDomain = () => {
  if (process.env.NODE_ENV === 'development') {
    return undefined // localhost doesn't support domain attribute
  }
  const siteUrlParsed = new URL(siteUrl)
  const hostname = siteUrlParsed.hostname
  const parts = hostname.split('.')
  // For chat.baena.ai -> .baena.ai
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join('.')}`
  }
  return undefined
}

['@nuxtjs/supabase', {
  redirectOptions: {
    login: '/login',
    callback: '/auth/callback',
    exclude: ['/', '/login', '/signup', '/chat/*', '/auth/callback']
  },
  cookieOptions: {
    maxAge: 60 * 60 * 8, // 8 hours
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    domain: computeCookieDomain()
  }
}]
```

This ensures:
- **Production**: Cookies are set with domain `.baena.ai` and shared across `baena.ai` and `chat.baena.ai`
- **Development**: Cookies work on `localhost` without domain attribute
- **Consistency**: Client and server use the same cookie domain strategy

### 2. Fix OAuth Callback in `app/pages/auth/callback.vue`

Enhanced the callback handler to properly handle OAuth PKCE flow:

```typescript
if (code) {
  // Exchange the code for a session (PKCE flow)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (error) {
    // Show error toast and redirect to login
    toast.add({
      title: 'Authentication Error',
      description: 'Failed to complete sign in. Please try again.',
      color: 'error'
    })
    await router.push('/login?error=auth_failed')
    return
  }
  
  // Success - redirect to destination
  const redirectTo = params.get('redirectTo') || '/'
  await router.push(redirectTo)
} else {
  // No code - check if session already exists
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (session && !error) {
    // Session exists, redirect to destination
    const redirectTo = params.get('redirectTo') || '/'
    await router.push(redirectTo)
  } else {
    // No session - redirect to login
    await router.push('/login')
  }
}
```

Improvements:
- Uses `exchangeCodeForSession(code)` instead of `getSession()` for OAuth callbacks
- Adds user-friendly error messages via toast notifications
- Handles edge cases (no code, existing session, errors)
- Provides better logging for debugging

### 3. Remove Duplicate Configuration

Removed the duplicate `supabase` configuration block that was conflicting with the module configuration.

## How to Test

### Development Testing

1. Start the dev server:
   ```bash
   pnpm dev
   ```

2. Navigate to `http://localhost:3001`
3. Click "Sign in" or navigate to `/login`
4. Log in with email/password or OAuth
5. Verify you remain authenticated after login

### Production Testing

1. Build and deploy the application:
   ```bash
   pnpm build
   # Deploy via Docker Swarm
   ```

2. **Test Cross-Domain Auth:**
   - Log in at `baena.ai`
   - Navigate to `chat.baena.ai`
   - Verify you're logged in (check user menu in navbar)
   - Refresh the page
   - Verify session persists

3. **Test Direct Login:**
   - Log out
   - Navigate directly to `chat.baena.ai`
   - Click "Sign in" (should redirect to `baena.ai/login`)
   - Complete login
   - Verify redirect back to `chat.baena.ai` with active session

4. **Verify Cookies:**
   - Open browser DevTools → Application/Storage → Cookies
   - Look for Supabase auth cookies (e.g., `sb-<project-id>-auth-token`)
   - Verify domain is set to `.baena.ai` (not `chat.baena.ai`)

## Expected Behavior

### Before Fix
- ❌ Login at `baena.ai` → Navigate to `chat.baena.ai` → Not logged in
- ❌ Cookies scoped to specific subdomain only
- ❌ Session lost on page refresh at `chat.baena.ai`

### After Fix
- ✅ Login at `baena.ai` → Navigate to `chat.baena.ai` → Still logged in
- ✅ Cookies shared across `.baena.ai` domain
- ✅ Session persists across subdomains and page refreshes
- ✅ OAuth callback properly exchanges code for session

## Technical Details

### Cookie Domain Behavior

| Environment | Hostname | Cookie Domain | Shared Across |
|-------------|----------|---------------|---------------|
| Development | localhost:3001 | `undefined` | N/A (single domain) |
| Production | chat.baena.ai | `.baena.ai` | baena.ai, chat.baena.ai, *.baena.ai |

### Authentication Flow

```
User logs in at baena.ai
    ↓
Session cookie created with domain: .baena.ai
    ↓
User navigates to chat.baena.ai
    ↓
Browser sends .baena.ai cookies (shared across subdomains)
    ↓
Server validates session via getSupabaseServerClient()
    ↓
Client hydrates with useSupabaseClient()
    ↓
Client uses same cookieOptions with domain: .baena.ai
    ↓
✅ Session persists, no cookie override
```

## Files Changed

- `nuxt.config.ts` - Added cookieOptions with domain computation
- `app/pages/auth/callback.vue` - Fixed OAuth code exchange and error handling

## Related Files (Unchanged)

- `server/utils/supabase.ts` - Server-side cookie domain logic (already correct)
- `app/composables/useUser.ts` - User state management
- `app/utils/authLinks.ts` - Auth URL resolution

## Deployment Notes

1. This fix requires rebuilding the Docker image (client-side config is baked into build)
2. No database migrations or secrets changes needed
3. Environment variables remain the same
4. The fix is backward compatible with existing sessions

## Rollback Plan

If issues arise, revert to the previous version by:

```bash
git revert <commit-hash>
pnpm build
# Redeploy
```

The previous behavior (subdomain-specific cookies) will be restored.
