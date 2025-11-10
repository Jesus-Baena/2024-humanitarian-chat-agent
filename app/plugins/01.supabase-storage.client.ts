/**
 * Custom storage adapter for Supabase that sets cookies with cross-subdomain support.
 * 
 * The @nuxtjs/supabase module uses localStorage by default on the client side,
 * which doesn't share across subdomains. This plugin provides a cookie-based
 * storage adapter that sets cookies with domain=.baena.ai.
 */

export default defineNuxtPlugin({
  name: 'supabase-custom-storage',
  dependsOn: ['supabase'],
  setup() {
    const supabase = useSupabaseClient()

    // Compute cookie domain
    const getCookieDomain = () => {
      if (import.meta.env.DEV) return undefined
      const hostname = window.location.hostname
      const parts = hostname.split('.')
      if (parts.length >= 2) {
        return `.${parts.slice(-2).join('.')}`
      }
      return undefined
    }

    const domain = getCookieDomain()
    
    if (!domain) {
      console.log('[supabase-storage] Dev mode - using default storage')
      return
    }

    console.log('[supabase-storage] Production mode - using cookie storage with domain:', domain)

    // Custom cookie-based storage
    const cookieStorage = {
      getItem(key: string): string | null {
        const cookies = document.cookie.split('; ')
        const cookie = cookies.find(c => c.startsWith(`${key}=`))
        if (!cookie) return null
        
        const value = cookie.split('=')[1]
        return value ? decodeURIComponent(value) : null
      },
      
      setItem(key: string, value: string): void {
        const encodedValue = encodeURIComponent(value)
        const maxAge = 60 * 60 * 24 * 7 // 7 days
        const secure = window.location.protocol === 'https:'
        
        document.cookie = `${key}=${encodedValue}; domain=${domain}; path=/; max-age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`
        console.log('[supabase-storage] Set cookie:', key, 'with domain:', domain)
      },
      
      removeItem(key: string): void {
        document.cookie = `${key}=; domain=${domain}; path=/; max-age=0`
        console.log('[supabase-storage] Removed cookie:', key)
      }
    }

    // Replace the storage in the Supabase auth client
    // @ts-expect-error - accessing internal auth storage
    if (supabase.auth?.storage) {
      // @ts-expect-error - replacing internal storage
      supabase.auth.storage = cookieStorage
      console.log('[supabase-storage] Replaced auth storage with cookie-based storage')
    }
  }
})
