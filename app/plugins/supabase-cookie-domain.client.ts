/**
 * Cross-subdomain cookie domain patcher for Supabase authentication.
 * 
 * This plugin intercepts cookie-setting operations and ensures that Supabase
 * auth cookies are set with the correct domain (.baena.ai) so they can be
 * shared between baena.ai and chat.baena.ai.
 */

export default defineNuxtPlugin({
  name: 'supabase-cookie-domain',
  setup() {
    if (import.meta.server) return

    // Compute the cookie domain based on the current hostname
    const computeCookieDomain = () => {
      if (import.meta.env.DEV) {
        return undefined // localhost doesn't support domain attribute
      }

      const hostname = window.location.hostname
      const parts = hostname.split('.')

      // For subdomains like chat.baena.ai -> .baena.ai
      if (parts.length >= 2) {
        return `.${parts.slice(-2).join('.')}`
      }

      return undefined
    }

    const cookieDomain = computeCookieDomain()

    // Only patch in production with a valid cookie domain
    if (!cookieDomain) {
      return
    }

    console.log('[supabase-cookie-domain] Patching cookies with domain:', cookieDomain)

    // Intercept the cookie setter to add domain attribute
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
    const originalCookieSetter = originalCookieDescriptor?.set

    if (originalCookieSetter) {
      Object.defineProperty(Document.prototype, 'cookie', {
        ...originalCookieDescriptor,
        set(cookieString: string) {
          // Check if this is a Supabase auth cookie
          const isSupabaseCookie = cookieString.includes('sb-') && cookieString.includes('-auth-token')
          
          if (isSupabaseCookie && !cookieString.includes('domain=')) {
            // Add the domain attribute if it's missing
            const hasPath = cookieString.includes('path=')
            const separator = hasPath ? '; ' : ''
            const modifiedCookie = cookieString + `${separator}domain=${cookieDomain}`
            
            console.log('[supabase-cookie-domain] Patched cookie:', modifiedCookie.substring(0, 100) + '...')
            return originalCookieSetter.call(this, modifiedCookie)
          }

          return originalCookieSetter.call(this, cookieString)
        }
      })

      console.log('[supabase-cookie-domain] Cookie setter patched successfully')
    }
  }
})

