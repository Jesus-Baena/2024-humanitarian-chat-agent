import { ref, nextTick, onMounted } from 'vue'
import type { ChatMessage } from '~/types'

export function useChat(chatId: string) {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isError = ref(false)
  const errorMessage = ref('')
  const isTyping = ref(false)
  let abortController: AbortController | null = null
  const MAX_CONTEXT_PAIRS = 10
  let lastStreamPayload: ChatMessage[] | null = null
  const { getCompletion } = useAssistants()
  const { pinToBottom, scrollContainer } = useChatScroll()

  const nextSeq = ref(1)

  async function loadHistory() {
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      if (res.ok) {
        const data: unknown = await res.json()
        const arr = Array.isArray(data) ? data as Array<Record<string, unknown>> : []
        const list: ChatMessage[] = arr
          .map((m, idx: number) => ({
            id: String(m.id),
            chatId,
            role: (String(m.role) === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: String(m.content ?? ''),
            createdAt: new Date(String(m.createdAt ?? new Date().toISOString())),
            seq: idx + 1
          }))
        messages.value = list
        nextSeq.value = list.length + 1
        await nextTick()
        pinToBottom()
      }
    } catch (e) {
      // non-fatal
      console.warn('[useChat] failed loading history', e)
    }
  }

  const generateId = (role: 'user' | 'assistant') => {
    try {
      if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${role}-${(crypto as Crypto).randomUUID()}`
      }
    } catch {
      // ignore
    }
    return `${role}-${Date.now()}-${nextSeq.value}-${Math.random().toString(36).slice(2, 8)}`
  }

  const addMessage = (m: ChatMessage) => {
    if (m.seq == null) {
      m.seq = nextSeq.value++
    }
    messages.value.push(m)
  }

  const persistMessage = async (
    role: 'user' | 'assistant',
    content: string,
    titleHint?: string
  ): Promise<string | null> => {
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role, content, titleHint })
      })
      if (!res.ok) return null
      const data = await res.json().catch(() => null)
      return (data && data.id) || null
    } catch {
      return null
    }
  }

  const cancelStream = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
      isLoading.value = false
      isTyping.value = false
    }
  }

  const retryStream = async () => {
    if (lastStreamPayload) {
      isError.value = false
      errorMessage.value = ''
      await handleStreamCompletion(lastStreamPayload)
    }
  }

  function extractStreamingText(parsed: unknown): string | undefined {
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        // Return string as-is if it's not JSON
        return parsed as string
      }
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const data = parsed as Record<string, unknown>
      // Handle SSE event format
      if (data.event === 'token' && typeof data.data === 'string') {
        return data.data
      }
      // Try various common field names for streaming text
      const text = (data.text as string) 
        || (data.data as string) 
        || (data.token as string) 
        || (data.chunk as string) 
        || (data.content as string)
        || (data.delta as string)
      if (typeof text === 'string') {
        return text
      }
      // Handle nested data structures
      if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
        const choice = data.choices[0] as Record<string, unknown>
        if (choice.delta && typeof choice.delta === 'object') {
          const delta = choice.delta as Record<string, unknown>
          if (typeof delta.content === 'string') {
            return delta.content
          }
        }
        if (typeof choice.text === 'string') {
          return choice.text
        }
      }
    }
    return undefined
  }

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === 'string') return err
    if (typeof err === 'object' && err && 'message' in err) {
      const maybeMessage = (err as Record<string, unknown>).message
      if (typeof maybeMessage === 'string') return maybeMessage
    }
    return 'Unexpected error'
  }

  const normalizeContent = (raw: string): string => {
    let out = raw
      // Remove trailing [DONE] markers
      .replace(/(?:message\s*)?(\[?DONE\]?)[\s]*$/gi, '')
      // Remove duplicate words (case-sensitive, capitalized words)
      .replace(/\b([A-Z][a-z]{1,30})(\1)\b/g, '$1')
      // Remove duplicate words separated by spaces
      .replace(/\b(\w+)(?:\s+\1){1,2}\b/g, '$1')
      // Remove duplicates at sentence boundaries
      .replace(/(^|[.!?]\s+)([A-Z][a-z]{1,30})\s+\2\b/g, '$1$2')
    
    // Enhanced acronym deduplication
    out = out
      // Remove internal duplicates within acronyms (ECHECHO -> ECHO, DGDG -> DG)
      // This must come first to handle patterns like ECHECHO
      .replace(/\b([A-Z]{2,})(\1)+\b/g, '$1')
      // Remove duplicate acronyms separated by space (DG DG -> DG)
      .replace(/\b([A-Z]{2,6})\s+\1\b/gi, '$1')
      // Remove duplicate at start of line followed by word (DGDG ECHO -> DG ECHO)
      .replace(/^([A-Z]{2,6})\1+(\s+[A-Z])/m, '$1$2')
    
    return out.trimEnd()
  }

  const handleStreamCompletion = async (payload?: ChatMessage[]): Promise<void> => {
    isLoading.value = true
    isTyping.value = true
    isError.value = false
    errorMessage.value = ''
    abortController = new AbortController()
    lastStreamPayload = payload || messages.value.slice()
    const assistantMessageId = generateId('assistant')
    addMessage({ id: assistantMessageId, chatId, content: '', role: 'assistant', createdAt: new Date() })
    const assistantIndex = messages.value.findIndex((m: ChatMessage) => m.id === assistantMessageId)

    // Batched UI update state
    let pendingContent: string | null = null
    let scheduled = false
    let firstVisible = true

    const scheduleFlushCommit = () => {
      if (scheduled) return
      scheduled = true
      setTimeout(async () => {
        scheduled = false
        if (pendingContent != null && assistantIndex !== -1) {
          const current = messages.value[assistantIndex]
          if (current) {
            current.content = pendingContent
            if (firstVisible && current.content) {
              isTyping.value = false
              firstVisible = false
            }
          }
          pendingContent = null
          await nextTick()
          pinToBottom()
        }
        if (pendingContent != null) scheduleFlushCommit()
      }, 40)
    }

    let completion: Awaited<ReturnType<typeof getCompletion>> | undefined
    try {
      const context = (lastStreamPayload || messages.value).slice(-MAX_CONTEXT_PAIRS * 2)
      completion = await getCompletion(context, abortController.signal)
    } catch (e: unknown) {
      isLoading.value = false
      isTyping.value = false
      isError.value = true
      errorMessage.value = getErrorMessage(e) || 'Failed to connect to assistant.'
      if (assistantIndex !== -1 && messages.value[assistantIndex]) {
        messages.value[assistantIndex]!.content = 'Error: ' + errorMessage.value
      }
      return
    }
    if (!completion?.body) {
      isLoading.value = false
      isTyping.value = false
      isError.value = true
      errorMessage.value = 'No response from assistant.'
      if (assistantIndex !== -1 && messages.value[assistantIndex]) {
        messages.value[assistantIndex]!.content = errorMessage.value
      }
      return
    }

    const reader = completion.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const lastUser = lastStreamPayload?.filter(m => m.role === 'user').pop()?.content.trim() || ''
    let accumulated = ''
    let echoDone = lastUser === ''
    let dataLines: string[] = []
    let lastTokenSeen = '' // Track last token to prevent duplicate accumulation

    const flush = () => {
      if (!dataLines.length) return
      const raw = dataLines.join('\n').trim()
      dataLines = []
      if (!raw) return
      const marker = raw.replace(/"/g, '')
      if (/^\[?DONE\]?$/i.test(marker) || marker === 'DONE') return
      let text: string | undefined
      try {
        text = extractStreamingText(JSON.parse(raw))
      } catch {
        text = extractStreamingText(raw)
      }
      if (!text || assistantIndex === -1) return
      
      // Prevent duplicate token accumulation
      if (text === lastTokenSeen && text.length < 50) {
        // Skip if it's the exact same short token as last time
        if (import.meta.dev) console.debug('[useChat] Skipping duplicate token:', text)
        return
      }
      lastTokenSeen = text
      
      const current = messages.value[assistantIndex]
      if (!current) return
      
      // Check if this text would create a duplicate at the end
      const wouldBeDuplicate = accumulated.endsWith(text) && text.length > 5
      if (wouldBeDuplicate) {
        // Skip this token as it's a duplicate
        if (import.meta.dev) console.debug('[useChat] Skipping duplicate at end:', text)
        return
      }
      
      accumulated += text
      if (!echoDone && lastUser) {
        if (accumulated.startsWith(lastUser + lastUser)) {
          accumulated = accumulated.slice(lastUser.length)
          echoDone = true
          if (import.meta.dev) console.debug('[useChat] Removed double echo')
        } else if (accumulated.startsWith(lastUser)) {
          const boundary = accumulated[lastUser.length]
          if (boundary && /[\s.!?:;,'")\]]/.test(boundary)) {
            accumulated = accumulated.slice(lastUser.length).trimStart()
            echoDone = true
            if (import.meta.dev) console.debug('[useChat] Removed echo with boundary')
          } else if (accumulated.length - lastUser.length > 120) {
            echoDone = true
          }
        }
      }
      pendingContent = normalizeContent(accumulated)
      scheduleFlushCommit()
    }

    try {
      while (true) {
        if (abortController?.signal.aborted) break
        const { done, value } = await reader.read()
        if (done) {
          flush()
          break
        }
        buffer += decoder.decode(value, { stream: true })
        buffer = buffer.replace(/\r\n/g, '\n')
        let idx: number
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 1)
          if (line === '') {
            flush()
            continue
          }
          const t = line.trim()
          if (t.startsWith('event:')) {
            flush()
            continue
          }
          if (t.startsWith('data:') || t.startsWith('message:')) {
            const payload = t.startsWith('data:') ? t.slice(5).trim() : t.slice(8).trim()
            if (dataLines.length) flush()
            const markerLine = payload.replace(/"/g, '')
            if (/^\[?DONE\]?$/i.test(markerLine) || markerLine === 'DONE') {
              flush()
              continue
            }
            dataLines.push(payload)
            flush()
            continue
          }
          dataLines.push(t)
        }
      }
    } catch (e: unknown) {
      isError.value = true
      errorMessage.value = getErrorMessage(e) || 'Streaming failed.'
      if (assistantIndex !== -1 && messages.value[assistantIndex]) {
        messages.value[assistantIndex]!.content = 'Error: ' + errorMessage.value
      }
    } finally {
      isLoading.value = false
      isTyping.value = false
      abortController = null
      // Persist final assistant message
      const final = assistantIndex !== -1 ? messages.value[assistantIndex] : undefined
      if (final && final.content) {
        await persistMessage('assistant', final.content)
      }
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim()) return
    const trimmed = content.trim()
    const userLocalId = generateId('user')
    addMessage({ id: userLocalId, chatId, content: trimmed, role: 'user', createdAt: new Date() })
    // Persist user message before streaming; also hints a title for new chat
    // Don't await - fire and forget to avoid blocking
    persistMessage('user', trimmed, trimmed).catch(err => {
      console.error('[useChat] Failed to persist user message:', err)
    })
    await handleStreamCompletion(messages.value.slice())
  }

  onMounted(loadHistory)

  return { messages, sendMessage, scrollContainer, isLoading, isError, errorMessage, isTyping, cancelStream, retryStream }
}
