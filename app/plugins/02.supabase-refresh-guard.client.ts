/**
 * Guard against infinite refresh token loops that cause rate limiting.
 * 
 * This plugin monitors auth errors and clears invalid tokens when:
 * - Refresh token is not found (expired/revoked)
 * - Too many refresh attempts fail in a short period
 * 
 * Prevents 429 rate limit errors from Supabase auth service.
 */

export default defineNuxtPlugin({
  name: 'supabase-refresh-guard',
  dependsOn: ['supabase'],
  setup() {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    
    let failedRefreshCount = 0
    let lastFailureTime = 0
    const FAILURE_THRESHOLD = 3
    const RESET_WINDOW_MS = 10000 // 10 seconds
    
    // Monitor auth state changes for errors
    supabase.auth.onAuthStateChange((event, session) => {
      const now = Date.now()
      
      // Reset counter if enough time has passed
      if (now - lastFailureTime > RESET_WINDOW_MS) {
        failedRefreshCount = 0
      }
      
      // Detect failed token refresh attempts
      if (event === 'TOKEN_REFRESHED' && !session) {
        failedRefreshCount++
        lastFailureTime = now
        
        console.warn(`[supabase-refresh-guard] Token refresh failed (${failedRefreshCount}/${FAILURE_THRESHOLD})`)
        
        // If we've failed too many times, clear the session
        if (failedRefreshCount >= FAILURE_THRESHOLD) {
          console.error('[supabase-refresh-guard] Too many refresh failures. Clearing session to prevent rate limiting.')
          clearInvalidSession()
        }
      }
      
      // Successful refresh or sign in resets the counter
      if (event === 'SIGNED_IN' || (event === 'TOKEN_REFRESHED' && session)) {
        failedRefreshCount = 0
      }
    })
    
    // Also check on initial load
    if (import.meta.client) {
      // Check if we have cookies but no valid user
      const hasAuthCookies = document.cookie.includes('sb-')
      
      if (hasAuthCookies && !user.value) {
        // Give it a moment for auth to initialize
        setTimeout(async () => {
          try {
            const { data, error } = await supabase.auth.getSession()
            
            if (error || !data.session) {
              console.warn('[supabase-refresh-guard] Found auth cookies but no valid session. Clearing.')
              clearInvalidSession()
            }
          } catch (err) {
            console.error('[supabase-refresh-guard] Error checking session:', err)
            clearInvalidSession()
          }
        }, 2000)
      }
    }
    
    function clearInvalidSession() {
      // Sign out to clear all cookies
      supabase.auth.signOut({ scope: 'local' })
      
      // Clear all sb- cookies manually as a fallback
      if (import.meta.client) {
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const eqIndex = cookie.indexOf('=')
          if (eqIndex === -1) continue
          
          const name = cookie.substring(0, eqIndex).trim()
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
      
      failedRefreshCount = 0
      console.info('[supabase-refresh-guard] Invalid session cleared. Please sign in again.')
    }
  }
})
