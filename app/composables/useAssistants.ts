import type { ChatMessage } from '~/types'

/**
 * Central assistant/completion abstraction.
 * Currently supports a single Flowise-style endpoint (simple JSON response or SSE / streaming)
 */
export function useAssistants() {
  // Runtime config (nuxt.config.ts should expose runtimeConfig.public.flowiseUrl)
  const runtimeConfig = useRuntimeConfig()
  
  // DEBUG: Log what we actually have in runtime config
  console.log('[useAssistants] DEBUG - runtimeConfig.public:', {
    flowiseUrl: runtimeConfig.public?.flowiseUrl,
    flowiseApiKey: runtimeConfig.public?.flowiseApiKey ? '***SET***' : 'NOT SET',
    allKeys: Object.keys(runtimeConfig.public || {})
  })
  
  const viteEnv = (import.meta as unknown as { env?: Record<string, string> })
    .env
  const flowiseUrl: string | undefined
    = (runtimeConfig.public?.flowiseUrl as string | undefined)
      || viteEnv?.NUXT_PUBLIC_FLOWISE_URL
      || viteEnv?.VITE_FLOWISE_URL

  // --- GET THE API KEY FROM ENVIRONMENT VARIABLES ---
  // <-- ADD THIS BLOCK
  const flowiseApiKey: string | undefined
    = (runtimeConfig.public?.flowiseApiKey as string | undefined)
      || viteEnv?.NUXT_PUBLIC_FLOWISE_API_KEY
      || viteEnv?.VITE_FLOWISE_API_KEY

  console.log('[useAssistants] DEBUG - Final values:', {
    flowiseUrl: flowiseUrl || 'NOT SET',
    flowiseApiKey: flowiseApiKey ? '***SET***' : 'NOT SET'
  })

  if (!flowiseUrl) {
    // We only warn once in dev mode.
    if (import.meta.dev)
      console.warn(
        '[useAssistants] Missing Flowise URL (set NUXT_PUBLIC_FLOWISE_URL or public.flowiseUrl).'
      )
  }

  /** Normalise arbitrary Flowise JSON shapes to plain text */
  function extractText(parsed: unknown): string | undefined {
    // 1. If parsed looks like JSON string, try to unwrap
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        // keep as string
      }
    }
    const data = (typeof parsed === 'object' && parsed !== null)
      ? (parsed as Record<string, unknown>)
      : undefined
    // 2. Common direct fields
    const direct = (data?.text as string)
      || (data?.output as string)
      || (data?.response as string)
      || (data?.result as string)
      || ((data?.data as Record<string, unknown> | undefined)?.text as string)
    if (typeof direct === 'string' && direct.trim()) return direct
    // 3. If the parsed value itself is a string
    if (typeof parsed === 'string') return parsed
    // 4. Fallback – compact JSON string
    try {
      return JSON.stringify(parsed)
    } catch {
      return undefined
    }
  }

  interface CompletionResult {
    body?: ReadableStream<Uint8Array> | null
    text?: string
  }

  async function getCompletion(
    messages: ChatMessage[],
    signal?: AbortSignal
  ): Promise<CompletionResult> {
    if (!flowiseUrl) {
      throw new Error('No completion backend configured.')
    }

    const question: string = messages.map((m: ChatMessage) => `${m.role}: ${m.content}`).join('\n')

    const start = performance.now()
    // If user is logged in, include credentials for cross-app authentication
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json, */*',
        ...(flowiseApiKey ? { Authorization: `Bearer ${flowiseApiKey}` } : {})
      },
      body: JSON.stringify({ question, streaming: true }),
      signal
      // credentials removed to avoid CORS issues with Flowise
    }
    const response: Response = await fetch(flowiseUrl, fetchOptions).catch((err: unknown) => {
      console.error('[useAssistants] Network error', err)
      throw new Error('Network error contacting Flowise endpoint')
    })

    if (!response) throw new Error('No response received')
    const ct = response.headers.get('content-type') || ''
    if (!response.ok) {
      let detail = ''
      try {
        detail = await response.text()
      } catch {
        // ignore
      }
      throw new Error(
        `Flowise error ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`
      )
    }

    // If the endpoint already provides a streaming body (SSE / text / ndjson) forward it.
    const isStreamLike
      = ct.includes('text/event-stream')
        || ct.includes('application/x-ndjson')
        || ct.startsWith('text/')
    if (isStreamLike && response.body) {
      if (import.meta.dev)
        console.debug('[useAssistants] Streaming response detected', ct)
      return { body: response.body }
    }

    // Otherwise attempt JSON parse.
    let parsed: unknown
    try {
      if (ct.includes('application/json')) {
        parsed = await response.json()
      } else {
        // Fallback to text then attempt JSON
        const raw: string = await response.text()
        try {
          parsed = JSON.parse(raw)
        } catch {
          parsed = raw
        }
      }
    } catch (e: unknown) {
      console.warn(
        '[useAssistants] Failed to parse JSON, falling back to text',
        e
      )
      const raw: string = await response.text().catch(() => '')
      return { body: new Response(raw).body, text: raw }
    }

    // If parsed is a JSON string containing JSON, try one more level.
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        // ignore
      }
    }

    const text = extractText(parsed) || 'Empty response'
    if (import.meta.dev)
      console.debug(
        '[useAssistants] Parsed completion in',
        Math.round(performance.now() - start),
        'ms'
      )
    return { body: new Response(text).body, text }
  }

  return { getCompletion }
}
