# Supabase API Keys Migration Guide

## Overview

Supabase has introduced a new API key format that replaces the legacy JWT-based keys. This migration is important for improved security and easier key rotation.

## Key Changes

### Old Format (Legacy - JWT-based)
- ❌ `anon` key: Long JWT token starting with `eyJhbGciOiJIUzI1NiIs...`
- ❌ `service_role` key: Long JWT token starting with `eyJhbGciOiJIUzI1NiIs...`

### New Format (Recommended)
- ✅ `sb_publishable_...`: Replaces the `anon` key
- ✅ `sb_secret_...`: Replaces the `service_role` key

## Why Migrate?

1. **Easier Key Rotation**: Can rotate individual keys without downtime
2. **Better Security**: No tight coupling between JWT secret and keys
3. **Shorter Format**: Easier to work with and less error-prone
4. **Future-Proof**: Legacy JWT keys will eventually be deprecated

## Migration Steps

### 1. Get Your New Keys

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api-keys/new
2. Generate new publishable and secret keys
3. Keep both old and new keys active during migration (zero downtime)

### 2. Update Environment Variables

#### Local Development (.env)
```bash
# New format (recommended)
NUXT_PUBLIC_SUPABASE_KEY=sb_publishable_your_new_key
SUPABASE_SECRET_KEY=sb_secret_your_new_key
```

#### Production (Docker Secrets / Environment)
Update your deployment configuration to use the new key names:
- `NUXT_PUBLIC_SUPABASE_KEY` instead of `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`

### 3. Verify Configuration

The application supports both formats for backward compatibility:
```typescript
// Priority order (from highest to lowest):
1. SUPABASE_KEY (new format)
2. SUPABASE_ANON_KEY (legacy format)
3. Runtime config fallbacks
```

### 4. Test Your Application

1. Start your development server: `pnpm dev`
2. Verify that authentication works
3. Check that database queries execute properly
4. Test any server-side operations

### 5. Deploy to Production

1. Update your production environment variables
2. Deploy the updated code
3. Monitor for any issues

### 6. Deactivate Legacy Keys (Optional)

Once all your applications are using the new keys:
1. Go to Supabase Dashboard > Settings > API Keys
2. Check the "last used" indicators
3. Deactivate the old JWT-based keys when safe

## Code Changes Summary

### Environment Variables
- **Before**: `NUXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **After**: `NUXT_PUBLIC_SUPABASE_KEY`, `SUPABASE_SECRET_KEY`

### Configuration Files Updated
- ✅ `.env` - Updated with new key format
- ✅ `.env.example` - Documentation for new developers
- ✅ `nuxt.config.ts` - Supports both formats with fallback
- ✅ `server/utils/supabase.ts` - Supports both formats with fallback

## Backward Compatibility

The application maintains backward compatibility with legacy JWT keys:
- Old environment variable names still work
- Automatic fallback to legacy keys if new ones aren't provided
- No breaking changes for existing deployments

## Security Notes

1. **Never commit keys to git**: Already protected by `.gitignore`
2. **Rotate exposed keys immediately**: If any key is accidentally exposed
3. **Use secret keys only server-side**: Never expose `sb_secret_` keys in client code
4. **Publishable keys are safe for client use**: Can be safely bundled in frontend code

## References

- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)
- [Migration Announcement](https://supabase.com/docs/guides/api/api-keys#why-are-anon-and-service_role-jwt-based-keys-no-longer-recommended)

## Support

If you encounter any issues during migration:
1. Check the Supabase Dashboard for key status
2. Review application logs for authentication errors
3. Verify environment variables are correctly set
4. Contact the development team

---

**Last Updated**: October 16, 2025
**Migration Status**: ✅ Complete
