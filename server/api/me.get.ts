import { getSupabaseServerClient } from '../utils/supabase'
import { getOrCreateSessionId } from '../utils/session'
import { getOrCreateProfileId } from '../utils/profiles'

export default defineEventHandler(async (event) => {
  console.log('[me.get] Request started')
  const supabase = getSupabaseServerClient(event)
  // Validate the session and fetch the user
  console.log('[me.get] Fetching user...')
  const { data, error } = await supabase.auth.getUser()
  console.log('[me.get] User fetch result:', { hasUser: !!data?.user, error: error?.message })
  if (error || !data?.user) {
    // Anonymous allowed: return null user
    console.log('[me.get] Returning null (anonymous)')
    return null
  }
  const { user } = data

  // Claim guest chats: associate them with the user and remove the session_id
  // so they don't show up when logged out.
  // We do this in the background to avoid blocking the user fetch.
  try {
    const sessionId = getOrCreateSessionId(event)
    
    // Fire and forget - don't await
    getOrCreateProfileId(supabase, user.id).then(async (profileId) => {
      if (profileId && sessionId) {
        const { error: updateError } = await supabase
          .schema('web')
          .from('chats')
          .update({ user_id: profileId, session_id: null })
          .eq('session_id', sessionId)
          .is('user_id', null)
        
        if (updateError) {
          console.error('[me.get] Error claiming chats:', updateError)
        }
      }
    }).catch(err => {
      console.error('[me.get] Error in background claim:', err)
    })
  } catch (e) {
    console.error('[me.get] Unexpected error initiating claim:', e)
  }

  return {
    id: user.id,
    email: user.email ?? undefined,
    user_metadata: user.user_metadata ?? {}
  }
})
