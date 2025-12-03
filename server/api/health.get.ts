/**
 * Health check endpoint that verifies critical configuration is present
 * Returns 200 if app is healthy, 503 if critical config is missing
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const flowiseUrl = config.flowiseUrl || config.public.flowiseUrl
  const flowiseApiKey = config.flowiseApiKey
  
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
        url: !!flowiseUrl,
        apiKey: !!flowiseApiKey,
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
  if (!flowiseUrl) {
    checks.status = 'unhealthy'
    checks.checks.flowise.status = 'error'
    checks.checks.flowise.error = 'NUXT_PUBLIC_FLOWISE_URL not configured - AI completions will fail'
  } else if (!flowiseApiKey) {
    checks.status = 'unhealthy'
    checks.checks.flowise.status = 'error'
    checks.checks.flowise.error = 'Flowise API key missing - AI completions will fail'
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
