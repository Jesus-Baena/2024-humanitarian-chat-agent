/**
 * Warn in development if the Supabase browser client is not set up with cookie-based auth.
 *
 * Starting with @nuxtjs/supabase 1.3+, `createBrowserClient` already persists sessions
 * to cookies (via @supabase/ssr) when `useSsrCookies` is enabled. Historically we
 * replaced the storage layer manually; that is no longer necessary and can interfere
 * with the built-in chunked cookie writer. This plugin simply asserts that cookie mode
 * is active so we catch regressions during integration testing.
 */

export default defineNuxtPlugin({
  name: 'supabase-cookie-sanity-check',
  dependsOn: ['supabase'],
  setup() {
    if (import.meta.env.DEV) {
      const supabase = useSupabaseClient()

      // @ts-expect-error storage is an internal field but exposed on the auth client
      const storage = supabase.auth?.storage
      const isSupabaseSSRStorage = typeof storage?.setItem === 'function'
        && typeof storage?.getItem === 'function'
        // @supabase/ssr storage exposes flags we can sanity check
        && 'isServer' in storage === false

      if (!isSupabaseSSRStorage) {
        console.warn('[supabase-cookie-sanity-check] Unexpected auth storage detected. Cross-subdomain cookies may break.')
      }
    }
  }
})
