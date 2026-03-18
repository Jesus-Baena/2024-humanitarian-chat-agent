import { ref, nextTick, onMounted } from 'vue'
import type { ChatMessage } from '~/types'

export function useChat(chatId: string) {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isError = ref(false)
  const errorMessage = ref('')
  const isTyping = ref(false)
  const ready = ref(false)
  let abortController: AbortController | null = null
  const MAX_CONTEXT_PAIRS = 10
  let lastStreamPayload: ChatMessage[] | null = null
  let sendLock = false
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
      console.warn('[useChat] failed loading history', e)
    } finally {
      ready.value = true
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

  interface PersistResult {
    success: boolean
    id?: string
    error?: string
  }

  const persistMessage = async (
    role: 'user' | 'assistant',
    content: string,
    titleHint?: string,
    clientId?: string
  ): Promise<PersistResult> => {
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role, content, titleHint, clientId })
      })
      if (!res.ok) {
        const message = await res.text().catch(() => '')
        console.error(`[useChat] Message API error: ${res.status} - ${message}`)
        return { success: false, error: message || `Server error (${res.status})` }
      }
      const data = await res.json().catch(() => null)
      return { success: true, id: (data && data.id) || undefined }
    } catch (err) {
      console.error('[useChat] Network error:', err)
      return { success: false, error: getErrorMessage(err) }
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

  /** Extract text from various SSE/JSON streaming payload shapes */
  function extractStreamingText(parsed: unknown): string | undefined {
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed) } catch { return parsed as string }
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const data = parsed as Record<string, unknown>
      if (data.event === 'token' && typeof data.data === 'string') return data.data
      // Skip non-token events (start, end, metadata, sourceDocuments, etc.)
      // to prevent duplicating text from summary/start payloads
      if (typeof data.event === 'string') return undefined
      for (const key of ['text', 'data', 'token', 'chunk', 'content', 'delta']) {
        if (typeof data[key] === 'string') return data[key] as string
      }
      if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
        const choice = data.choices[0] as Record<string, unknown>
        if (choice.delta && typeof choice.delta === 'object') {
          const delta = choice.delta as Record<string, unknown>
          if (typeof delta.content === 'string') return delta.content
        }
        if (typeof choice.text === 'string') return choice.text
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

  /** Minimal cleanup — only strip [DONE] markers */
  const cleanContent = (raw: string): string => {
    return raw.replace(/(?:message\s*)?(\[?DONE\]?)[\s]*$/gi, '').trimEnd()
  }

  const handleStreamCompletion = async (payload?: ChatMessage[]): Promise<void> => {
    isLoading.value = true
    isTyping.value = true
    isError.value = false
    errorMessage.value = ''
    abortController = new AbortController()
    lastStreamPayload = payload || messages.value.slice()
    const assistantMessageId = generateId('assistant')
    addMessage({
      id: assistantMessageId,
      chatId,
      content: '',
      role: 'assistant',
      createdAt: new Date(),
      status: 'pending'
    })
    const assistantIndex = messages.value.findIndex((m: ChatMessage) => m.id === assistantMessageId)

    // Simple throttled scroll — no RAF coalescing
    let lastScrollTime = 0
    const SCROLL_THROTTLE_MS = 100

    const updateContent = (text: string) => {
      if (assistantIndex === -1) return
      const current = messages.value[assistantIndex]
      if (!current) return
      current.content = text
      if (isTyping.value && text) {
        isTyping.value = false
      }
      // Throttled scroll
      const now = Date.now()
      if (now - lastScrollTime > SCROLL_THROTTLE_MS) {
        lastScrollTime = now
        nextTick(() => pinToBottom())
      }
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
    let accumulated = ''

    const processToken = (text: string) => {
      if (!text) return
      accumulated += text
      updateContent(cleanContent(accumulated))
    }

    const processLine = (line: string) => {
      const t = line.trim()
      if (!t || t.startsWith('event:')) return

      let payload = t
      if (t.startsWith('data:')) {
        payload = t.slice(5)
        // SSE spec: strip at most one leading space after "data:"
        if (payload.startsWith(' ')) payload = payload.slice(1)
      } else if (t.startsWith('message:')) {
        payload = t.slice(8)
        if (payload.startsWith(' ')) payload = payload.slice(1)
      }

      if (!payload) return
      // Check for [DONE] marker
      const marker = payload.replace(/"/g, '')
      if (/^\[?DONE\]?$/i.test(marker)) return

      // Try JSON parse, then extract text
      let text: string | undefined
      try {
        text = extractStreamingText(JSON.parse(payload))
      } catch {
        text = extractStreamingText(payload)
      }
      if (text) processToken(text)
    }

    try {
      while (true) {
        if (abortController?.signal.aborted) break
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = buffer.replace(/\r\n/g, '\n')

        let idx: number
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 1)
          processLine(line)
        }
      }
      // Process any remaining buffer content
      if (buffer.trim()) {
        processLine(buffer)
      }
    } catch (e: unknown) {
      isError.value = true
      errorMessage.value = getErrorMessage(e) || 'Streaming failed.'
      if (assistantIndex !== -1 && messages.value[assistantIndex]) {
        messages.value[assistantIndex]!.content = 'Error: ' + errorMessage.value
        messages.value[assistantIndex]!.status = 'failed'
      }
    } finally {
      // Final content commit
      if (assistantIndex !== -1 && messages.value[assistantIndex]) {
        const finalContent = cleanContent(accumulated)
        messages.value[assistantIndex]!.content = finalContent
      }

      // Final scroll
      await nextTick()
      pinToBottom()

      isLoading.value = false
      isTyping.value = false
      abortController = null

      // Persist final assistant message
      const final = assistantIndex !== -1 ? messages.value[assistantIndex] : undefined
      if (!isError.value && final && final.content) {
        const persistResult = await persistMessage('assistant', final.content)
        if (!persistResult.success) {
          isError.value = true
          errorMessage.value = persistResult.error || 'Failed to save assistant response.'
          final.status = 'failed'
        } else {
          final.status = 'sent'
          if (persistResult.id) final.serverId = persistResult.id
        }
      }
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || sendLock) return
    sendLock = true
    try {
      const trimmed = content.trim()
      const userLocalId = generateId('user')
      const userMessage = {
        id: userLocalId,
        chatId,
        content: trimmed,
        role: 'user' as const,
        createdAt: new Date(),
        status: 'pending' as const
      }
      addMessage(userMessage)
      isError.value = false
      errorMessage.value = ''

      await nextTick()
      pinToBottom()

      const persistResult = await persistMessage('user', trimmed, trimmed, userLocalId)
      if (!persistResult.success) {
        const current = messages.value.find(m => m.id === userLocalId)
        if (current) current.status = 'failed'
        isError.value = true
        errorMessage.value = persistResult.error || 'Failed to save your message.'

        const toast = useToast()
        toast.add({
          title: 'Failed to send message',
          description: persistResult.error || 'Please check your connection and try again.',
          color: 'error'
        })
        console.error('[useChat] Message persist failed:', persistResult.error)
        return
      }

      const current = messages.value.find(m => m.id === userLocalId)
      if (current) {
        current.status = 'sent'
        if (persistResult.id) current.serverId = persistResult.id
      }

      await handleStreamCompletion(messages.value.slice())
    } finally {
      sendLock = false
    }
  }

  onMounted(loadHistory)

  return { messages, sendMessage, scrollContainer, isLoading, isError, errorMessage, isTyping, cancelStream, retryStream, ready }
}
