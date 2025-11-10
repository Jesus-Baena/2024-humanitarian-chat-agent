/**
 * Custom Supabase client configuration for cross-subdomain authentication.
 * 
 * This plugin ensures that Supabase auth cookies are set with the correct domain
 * (.baena.ai) so they can be shared between baena.ai and chat.baena.ai.
 * 
 * The @nuxtjs/supabase module doesn't support dynamic cookie domain configuration,
 * so we override the cookie storage behavior here.
 */

import { createBrowserClient } from '@supabase/ssr'

export default defineNuxtPlugin({
  name: 'supabase-cookie-domain',
  enforce: 'post', // Run after the @nuxtjs/supabase plugin
  setup() {
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl as string
    const supabaseKey = config.public.supabaseKey as string

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[supabase-cookie-domain] Missing Supabase credentials')
      return
    }

    // Compute the cookie domain based on the current hostname
    const computeCookieDomain = () => {
      if (import.meta.env.DEV) {
        return undefined // localhost doesn't support domain attribute
      }

      if (typeof window === 'undefined') {
        return undefined
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

    // Only apply custom storage if we have a cookie domain (production)
    if (!cookieDomain) {
      return
    }

    console.log('[supabase-cookie-domain] Setting cookie domain:', cookieDomain)

    // Create a custom storage that sets cookies with the correct domain
    const customCookieStorage = {
      getItem: (key: string): string | null => {
        if (typeof document === 'undefined') return null
        const cookies = document.cookie.split('; ')
        const cookie = cookies.find(c => c.startsWith(`${key}=`))
        return cookie ? (cookie.split('=')[1] ?? null) : null
      },
      setItem: (key: string, value: string) => {
        if (typeof document === 'undefined') return

        const maxAge = 60 * 60 * 8 // 8 hours (matching server config)
        const secure = window.location.protocol === 'https:'
        
        document.cookie = `${key}=${value}; path=/; domain=${cookieDomain}; max-age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`
      },
      removeItem: (key: string) => {
        if (typeof document === 'undefined') return
        document.cookie = `${key}=; path=/; domain=${cookieDomain}; max-age=0`
      }
    }

    // Create a new Supabase client with custom cookie storage
    const client = createBrowserClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: customCookieStorage,
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      },
      cookieOptions: {
        domain: cookieDomain,
        path: '/',
        sameSite: 'lax',
        secure: window.location.protocol === 'https:'
      }
    })

    // Replace the Nuxt-provided Supabase client
    // @ts-ignore - nuxtApp.$supabase exists but isn't typed
    const nuxtApp = useNuxtApp()
    if (nuxtApp.$supabase) {
      // @ts-ignore
      nuxtApp.$supabase = client
      console.log('[supabase-cookie-domain] Replaced Supabase client with custom storage')
    }

    return {
      provide: {
        supabase: client
      }
    }
  }
})
