import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { getHeader, setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'

/**
 * Create a Supabase server client wired to H3/Nitro cookies.
 * - In dev (localhost), no cookie domain is set.
 * - In prod, cookies are set for the parent domain so subdomains share auth (e.g. .baena.ai).
 */
export function getSupabaseServerClient(event: H3Event) {
  const runtimeConfig = useRuntimeConfig()
  const url
    = process.env.SUPABASE_URL
      || runtimeConfig.supabaseUrl
      || runtimeConfig.public.supabaseUrl
  // Support both new (sb_publishable_) and legacy (JWT anon) key formats
  const key
    = process.env.SUPABASE_KEY // New publishable key format
      || process.env.SUPABASE_ANON_KEY // Legacy JWT format
      || runtimeConfig.supabaseKey
      || runtimeConfig.public.supabaseKey
  if (!url || !key) {
    throw new Error('Missing Supabase URL or key')
  }

  const host = getHeader(event, 'host') || ''
  const isLocalhost = /localhost(:\d+)?$/i.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host)

  // Compute a sensible parent domain for sharing across subdomains.
  // For baena.ai and chat.baena.ai -> .baena.ai
  const computeCookieDomain = () => {
    if (isLocalhost) return undefined
    const hostname = host.split(':')[0] ?? ''
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      const parent = parts.slice(-2).join('.')
      return `.${parent}`
    }
    return undefined
  }

  const cookieDomain = computeCookieDomain()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        const header = getHeader(event, 'cookie') ?? ''
        const parsed = parseCookieHeader(header)
        // Ensure a non-optional string value for each cookie entry
        return parsed.map(c => ({ name: c.name, value: c.value ?? '' }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(event, name, value, {
            ...options,
            // Share across subdomains in prod. Browsers ignore Domain=localhost.
            domain: cookieDomain ?? options?.domain,
            path: options?.path ?? '/'
          })
        })
      }
    }
  })
}
