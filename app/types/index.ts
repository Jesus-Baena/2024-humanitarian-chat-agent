export interface Chat {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export type MessageStatus = 'pending' | 'sent' | 'failed'

export interface ChatMessage {
  id: string
  chatId: string
  content: string
  role: 'user' | 'assistant'
  createdAt: Date
  /**
   * Local monotonically increasing ordering number (not yet persisted).
   * Helps us impose a stable order before introducing a database.
   */
  seq?: number
  serverId?: string
  status?: MessageStatus
}
