/**
 * Health check endpoint that verifies critical configuration is present
 * Returns 200 if app is healthy, 503 if critical config is missing
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  
  const checks: {
    timestamp: string
    status: 'healthy' | 'unhealthy'
    checks: {
      flowise: {
        url: boolean
        apiKey: boolean
        status: string
        error?: string
      }
      supabase: {
        url: boolean
        key: boolean
        status: string
        error?: string
      }
    }
  } = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      flowise: {
        url: !!config.public.flowiseUrl,
        apiKey: !!config.public.flowiseApiKey,
        status: 'ok'
      },
      supabase: {
        url: !!config.public.supabaseUrl,
        key: !!config.public.supabaseKey,
        status: 'ok'
      }
    }
  }

  // Check Flowise configuration
  if (!config.public.flowiseUrl) {
    checks.status = 'unhealthy'
    checks.checks.flowise.status = 'error'
    checks.checks.flowise.error = 'NUXT_PUBLIC_FLOWISE_URL not configured - AI completions will fail'
  }

  // Check Supabase configuration
  if (!config.public.supabaseUrl || !config.public.supabaseKey) {
    checks.status = 'unhealthy'
    checks.checks.supabase.status = 'error'
    checks.checks.supabase.error = 'Supabase configuration incomplete - auth and data will fail'
  }

  // Return 503 Service Unavailable if any critical checks fail
  if (checks.status === 'unhealthy') {
    setResponseStatus(event, 503)
  }

  return checks
})
