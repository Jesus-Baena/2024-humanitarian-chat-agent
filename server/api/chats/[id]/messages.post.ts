import { getSupabaseServerClient } from '../../../utils/supabase'
import { getOrCreateSessionId } from '../../../utils/session'
import { getOrCreateProfileId } from '../../../utils/profiles'

/**
 * @typedef {{ role: 'user' | 'assistant', content: string, titleHint?: string }} Body
 */

const MAX_MESSAGE_LENGTH = 5000

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerClient(event)
  const id = getRouterParam(event, 'id') as string
  if (!id) {
    setResponseStatus(event, 400)
    return { error: 'Missing chat id' }
  }
  const raw = await readBody(event).catch(() => null)
  const body = raw as unknown as { role?: 'user' | 'assistant', content?: string, titleHint?: string } | null
  if (!body || !body.content || !body.role) {
    setResponseStatus(event, 400)
    return { error: 'Invalid body' }
  }
  if (body.role !== 'user' && body.role !== 'assistant') {
    setResponseStatus(event, 400)
    return { error: 'Invalid role' }
  }

  const safeContent = String(body.content).trim()
  if (!safeContent) {
    setResponseStatus(event, 400)
    return { error: 'Message cannot be empty' }
  }
  if (safeContent.length > MAX_MESSAGE_LENGTH) {
    setResponseStatus(event, 413)
    return { error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` }
  }

  const rawTitleHint = String(body.titleHint ?? 'New chat').trim() || 'New chat'

  const res = await supabase.auth.getUser().catch(() => null)
  const authUserId: string | null = res?.data?.user?.id ?? null
  const sessionId = getOrCreateSessionId(event)
  const profileId = authUserId ? await getOrCreateProfileId(supabase, authUserId) : null

  const { data: chats } = await supabase
    .schema('web')
    .from('chats')
    .select('id,user_id,session_id,title,is_deleted')
    .eq('id', id)
    .limit(1)

  let chat = (chats || [])[0] as { id: string, user_id: string | null, session_id: string | null, title: string | null, is_deleted: boolean } | undefined
  if (!chat) {
    const titleCandidate = body.role === 'user' ? safeContent : rawTitleHint
    const neatTitle = ((titleCandidate || 'New chat').split(/\r?\n/)[0] ?? 'New chat').slice(0, 80)
    const insertChat = {
      id,
      user_id: profileId,
      session_id: profileId ? null : sessionId,
      title: neatTitle || 'New chat',
      is_deleted: false
    }
    const { data: created, error: cErr } = await supabase
      .schema('web')
      .from('chats')
      .insert(insertChat)
      .select('*')
      .limit(1)
    if (cErr) {
      setResponseStatus(event, 500)
      return { error: cErr.message }
    }
    chat = (created || [])[0] as typeof chat
  } else {
    const owned = profileId ? chat.user_id === profileId : chat.session_id === sessionId
    if (!owned) {
      setResponseStatus(event, 403)
      return { error: 'Forbidden' }
    }
  }
  if (!chat || chat.is_deleted) {
    setResponseStatus(event, 404)
    return { error: 'Chat is deleted' }
  }

  const { data: inserted, error: mErr } = await supabase
    .schema('web')
    .from('messages')
    .insert({ chat_id: id, role: body.role, content: safeContent })
    .select('id')
    .limit(1)
  if (mErr) {
    console.error('[messages.post] Database error:', mErr.message)
    setResponseStatus(event, 500)
    return { error: mErr.message }
  }

  const titleCandidate = body.role === 'user' ? safeContent : rawTitleHint
  const neatTitle = ((titleCandidate || 'New chat').split(/\r?\n/)[0] ?? 'New chat').slice(0, 80)
  const titleUpdate = chat.title ? {} : { title: neatTitle || 'New chat' }
  const { error: updateErr } = await supabase
    .schema('web')
    .from('chats')
    .update({ ...titleUpdate, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (updateErr) {
    console.error('[messages.post] Chat update error:', updateErr.message)
  }

  return { id: inserted?.[0]?.id as string }
})
