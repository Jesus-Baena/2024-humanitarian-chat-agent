import type { ChatMessage } from '~/types'

/**
 * Central assistant/completion abstraction.
 * Supports a single Flowise-style endpoint (simple JSON response or SSE / streaming)
 */
export function useAssistants() {
  const PROXY_PATH = '/api/flowise.proxy'

  /** Normalise arbitrary Flowise JSON shapes to plain text */
  function extractText(parsed: unknown): string | undefined {
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed) } catch { /* keep as string */ }
    }
    const data = (typeof parsed === 'object' && parsed !== null)
      ? (parsed as Record<string, unknown>)
      : undefined
    if (data) {
      for (const key of ['text', 'output', 'response', 'result']) {
        if (typeof data[key] === 'string' && (data[key] as string).trim()) return data[key] as string
      }
      const nested = (data.data as Record<string, unknown> | undefined)?.text
      if (typeof nested === 'string' && nested.trim()) return nested
    }
    if (typeof parsed === 'string') return parsed
    try { return JSON.stringify(parsed) } catch { return undefined }
  }

  interface CompletionResult {
    body?: ReadableStream<Uint8Array> | null
    text?: string
  }

  async function getCompletion(
    messages: ChatMessage[],
    signal?: AbortSignal
  ): Promise<CompletionResult> {
    const question: string = messages.map((m: ChatMessage) => `${m.role}: ${m.content}`).join('\n')
    if (!question.trim()) {
      throw new Error('No content to send to the assistant.')
    }

    const response: Response = await fetch(PROXY_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json, */*',
      },
      body: JSON.stringify({ question, streaming: true }),
      signal
    }).catch(() => {
      throw new Error('Network error contacting Flowise proxy')
    })

    if (!response.ok) {
      let detail = ''
      try { detail = await response.text() } catch { /* ignore */ }
      throw new Error(
        `Flowise error ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`
      )
    }

    const ct = response.headers.get('content-type') || ''

    // If streaming, pass the body through directly
    const isStreamLike
      = ct.includes('text/event-stream')
        || ct.includes('application/x-ndjson')
        || ct.startsWith('text/')
    if (isStreamLike && response.body) {
      return { body: response.body }
    }

    // Otherwise parse as JSON and wrap as a simple stream
    let parsed: unknown
    try {
      if (ct.includes('application/json')) {
        parsed = await response.json()
      } else {
        const raw: string = await response.text()
        try { parsed = JSON.parse(raw) } catch { parsed = raw }
      }
    } catch {
      const raw: string = await response.text().catch(() => '')
      return { body: new Response(raw).body, text: raw }
    }

    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed) } catch { /* ignore */ }
    }

    const text = extractText(parsed) || 'Empty response'
    return { body: new Response(text).body, text }
  }

  return { getCompletion }
}
