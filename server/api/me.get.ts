import { getSupabaseServerClient } from '../utils/supabase'
import { getOrCreateSessionId } from '../utils/session'
import { getOrCreateProfileId } from '../utils/profiles'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerClient(event)
  // Validate the session and fetch the user
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    // Anonymous allowed: return null user
    return null
  }
  const { user } = data

  // Claim guest chats: associate them with the user and remove the session_id
  // so they don't show up when logged out.
  const sessionId = getOrCreateSessionId(event)
  const profileId = await getOrCreateProfileId(supabase, user.id)

  if (profileId && sessionId) {
    await supabase
      .schema('web')
      .from('chats')
      .update({ user_id: profileId, session_id: null })
      .eq('session_id', sessionId)
      .is('user_id', null)
  }

  return {
    id: user.id,
    email: user.email ?? undefined,
    user_metadata: user.user_metadata ?? {}
  }
})
