/**
 * Manual token refresh management with rate limiting protection.
 * 
 * Since autoRefreshToken is disabled in nuxt.config.ts, this plugin:
 * - Manually refreshes tokens when needed (before they expire)
 * - Detects and clears invalid tokens immediately on page load
 * - Prevents refresh loops that cause 429 rate limit errors
 * - Only refreshes when the session is actually valid and not expired
 */

export default defineNuxtPlugin({
  name: 'supabase-refresh-guard',
  dependsOn: ['supabase'],
  setup() {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    
    let isRefreshing = false
    let lastRefreshAttempt = 0
    const MIN_REFRESH_INTERVAL = 60000 // Minimum 1 minute between refresh attempts
    
    // Check session validity immediately on mount
    if (import.meta.client) {
      onMounted(async () => {
        await checkAndCleanSession()
        
        // Set up periodic token refresh only if we have a valid session
        // Refresh 5 minutes before expiry (tokens are valid for 1 hour by default)
        if (user.value) {
          const refreshInterval = setInterval(async () => {
            await maybeRefreshToken()
          }, 5 * 60 * 1000) // Check every 5 minutes
          
          // Clean up on unmount
          onUnmounted(() => clearInterval(refreshInterval))
        }
      })
    }
    
    // Monitor auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        isRefreshing = false
      }
      
      if (event === 'SIGNED_IN' && session) {
        console.info('[supabase-refresh-guard] User signed in successfully')
      }
      
      // If we get a token refreshed event without a session, something is wrong
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.error('[supabase-refresh-guard] Token refresh failed - clearing invalid session')
        clearInvalidSession()
      }
    })
    
    /**
     * Check if the current session is valid, clear it if not
     */
    async function checkAndCleanSession() {
      const hasAuthCookies = document.cookie.includes('sb-')
      
      if (!hasAuthCookies) {
        return // No cookies, nothing to check
      }
      
      try {
        // Get the current session from cookies (doesn't trigger refresh)
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('[supabase-refresh-guard] Session check error:', error.message)
          
          // Common errors that mean we should clear the session
          if (
            error.message.includes('refresh_token_not_found') ||
            error.message.includes('invalid') ||
            error.message.includes('expired')
          ) {
            console.warn('[supabase-refresh-guard] Detected invalid session, clearing cookies')
            clearInvalidSession()
          }
          return
        }
        
        if (!data.session) {
          console.warn('[supabase-refresh-guard] Found auth cookies but no session, clearing')
          clearInvalidSession()
        }
      } catch (err) {
        console.error('[supabase-refresh-guard] Error checking session:', err)
        // On any unexpected error, clear to be safe
        clearInvalidSession()
      }
    }
    
    /**
     * Manually refresh the token if needed, with rate limiting
     */
    async function maybeRefreshToken() {
      // Don't refresh if already refreshing or if we refreshed recently
      const now = Date.now()
      if (isRefreshing || (now - lastRefreshAttempt < MIN_REFRESH_INTERVAL)) {
        return
      }
      
      // Only refresh if we have a user
      if (!user.value) {
        return
      }
      
      try {
        isRefreshing = true
        lastRefreshAttempt = now
        
        const { data, error } = await supabase.auth.refreshSession()
        
        if (error) {
          console.error('[supabase-refresh-guard] Token refresh failed:', error.message)
          
          // If refresh fails with specific errors, clear the session
          if (
            error.message.includes('refresh_token_not_found') ||
            error.message.includes('invalid_grant') ||
            error.message.includes('over_request_rate_limit')
          ) {
            console.warn('[supabase-refresh-guard] Clearing invalid session due to refresh error')
            clearInvalidSession()
          }
        } else if (data.session) {
          console.info('[supabase-refresh-guard] Token refreshed successfully')
        }
      } catch (err) {
        console.error('[supabase-refresh-guard] Exception during token refresh:', err)
      } finally {
        isRefreshing = false
      }
    }
    
    /**
     * Clear all Supabase auth cookies (but preserve chat_session_id)
     */
    function clearInvalidSession() {
      // Sign out locally (doesn't make API call)
      supabase.auth.signOut({ scope: 'local' })
      
      // Clear ONLY Supabase auth cookies (sb-*), preserve chat_session_id for anonymous usage
      if (import.meta.client) {
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const eqIndex = cookie.indexOf('=')
          if (eqIndex === -1) continue
          
          const name = cookie.substring(0, eqIndex).trim()
          // Only clear Supabase auth cookies, NOT chat_session_id
          if (name.startsWith('sb-')) {
            // Clear for current domain
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
            
            // Also try with domain attribute (for cross-subdomain cookies)
            const hostname = window.location.hostname
            const parts = hostname.split('.')
            if (parts.length >= 2) {
              const parentDomain = `.${parts.slice(-2).join('.')}`
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${parentDomain}`
            }
          }
        }
      }
      
      isRefreshing = false
      console.info('[supabase-refresh-guard] Invalid auth session cleared. You can continue using anonymous chat or sign in again.')
    }
  }
})
