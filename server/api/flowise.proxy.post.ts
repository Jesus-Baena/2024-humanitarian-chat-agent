import { getSupabaseServerClient } from '../utils/supabase'
import { getOrCreateSessionId } from '../utils/session'
import { getOrCreateProfileId } from '../utils/profiles'
import { readBody, setResponseStatus } from 'h3'

const RATE_LIMIT_WINDOW_MS = 30_000
const RATE_LIMIT_MAX_REQUESTS = 5
const RATE_LIMIT_STORE = new Map<string, { count: number; resetAt: number }>()
const MAX_PAYLOAD_BYTES = 120_000

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const flowiseUrl = config.flowiseUrl || config.public.flowiseUrl
  const flowiseApiKey = config.flowiseApiKey

  if (!flowiseUrl) {
    setResponseStatus(event, 400)
    return { error: 'Flowise URL not configured' }
  }

  const supabase = getSupabaseServerClient(event)
  const userRes = await supabase.auth.getUser().catch(() => null)
  const authUserId: string | null = userRes?.data?.user?.id ?? null
  const sessionId = getOrCreateSessionId(event)
  const profileId = authUserId ? await getOrCreateProfileId(supabase, authUserId) : null
  const identityKey = profileId ?? sessionId ?? 'anonymous'

  const now = Date.now()
  const rlEntry = RATE_LIMIT_STORE.get(identityKey)
  if (!rlEntry || rlEntry.resetAt <= now) {
    RATE_LIMIT_STORE.set(identityKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  } else {
    if (rlEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
      const retrySeconds = Math.max(1, Math.ceil((rlEntry.resetAt - now) / 1000))
      setResponseStatus(event, 429)
      return { error: `Rate limit exceeded. Try again in ${retrySeconds}s` }
    }
    rlEntry.count += 1
    RATE_LIMIT_STORE.set(identityKey, rlEntry)
  }

  const payload = await readBody(event).catch(() => null)
  if (!payload || typeof payload !== 'object') {
    setResponseStatus(event, 400)
    return { error: 'Missing request body' }
  }

  const serialized = JSON.stringify(payload)
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
    setResponseStatus(event, 413)
    return { error: 'Request payload too large' }
  }

  const controller = new AbortController()
  const req = event.node.req
  const onAbort = () => controller.abort()
  req?.on?.('close', onAbort)

  try {
    const response = await fetch(flowiseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json, */*',
        ...(flowiseApiKey ? { Authorization: `Bearer ${flowiseApiKey}` } : {})
      },
      body: serialized,
      signal: controller.signal,
      redirect: 'follow'
    })

    if (!response.ok) {
      const message = await response.text().catch(() => '')
      setResponseStatus(event, response.status)
      return { error: message || 'Flowise request failed' }
    }

    const filteredHeaders = new Headers(response.headers)
    filteredHeaders.delete('content-encoding')
    filteredHeaders.delete('transfer-encoding')
    const proxy = new Response(response.body, {
      status: response.status,
      headers: filteredHeaders
    })
    return proxy
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[flowise.proxy] fetch error', errorMessage)
    if (controller.signal.aborted) {
      setResponseStatus(event, 499)
      return { error: 'Request aborted' }
    }
    setResponseStatus(event, 502)
    return { error: `Unable to reach Flowise: ${errorMessage}` }
  } finally {
    req?.off?.('close', onAbort)
  }
})
