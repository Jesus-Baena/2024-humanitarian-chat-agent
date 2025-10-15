import { getSupabaseServerClient } from '../utils/supabase'
import { getOrCreateSessionId } from '../utils/session'
import { getOrCreateProfileId } from '../utils/profiles'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔍 Starting chats.get.ts handler')
    
    // Initialize Supabase client
    let supabase
    try {
      supabase = getSupabaseServerClient(event)
      console.log('✅ Supabase client created successfully')
    } catch (supabaseError) {
      console.error('❌ Failed to create Supabase client:', supabaseError)
      setResponseStatus(event, 500)
      return { error: 'Failed to initialize database connection', details: String(supabaseError) }
    }

    // Get authenticated user
    let authUserId: string | null = null
    try {
      const res = await supabase.auth.getUser()
      authUserId = res?.data?.user?.id ?? null
      console.log('🔐 Auth user ID:', authUserId ? 'Found' : 'Not authenticated')
    } catch (authError) {
      console.warn('⚠️  Auth error (continuing as anonymous):', authError)
      authUserId = null
    }

    // Get or create session ID
    let sessionId: string
    try {
      sessionId = getOrCreateSessionId(event)
      console.log('🍪 Session ID:', sessionId ? 'Found/Created' : 'Failed')
    } catch (sessionError) {
      console.error('❌ Failed to get session ID:', sessionError)
      setResponseStatus(event, 500)
      return { error: 'Failed to create session', details: String(sessionError) }
    }

    // Get or create profile ID if authenticated
    let profileId: string | null = null
    if (authUserId) {
      try {
        profileId = await getOrCreateProfileId(supabase, authUserId)
        console.log('👤 Profile ID:', profileId ? 'Found/Created' : 'Failed')
      } catch (profileError) {
        console.error('❌ Profile error:', profileError)
        // Continue without profile - will use session-based queries
        profileId = null
      }
    }

    // Build and execute query
    try {
      let query = supabase
        .schema('web')
        .from('chats')
        .select('id,title,created_at,updated_at,is_deleted,deleted_at,session_id,user_id')
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (profileId) {
        query = query.or(`user_id.eq.${profileId},session_id.eq.${sessionId}`)
        console.log('🔍 Querying with profile ID and session ID')
      } else {
        query = query.eq('session_id', sessionId)
        console.log('🔍 Querying with session ID only')
      }

      const { data, error } = await query
      
      if (error) {
        console.error('❌ Database query error:', error)
        setResponseStatus(event, 500)
        return { 
          error: 'Database query failed', 
          details: error.message,
          hint: error.hint || 'Check if the web.chats table exists and RLS policies are configured'
        }
      }

      console.log(`✅ Query successful, returned ${data?.length || 0} chats`)
      
      return (data || []).map(c => ({
        id: c.id as string,
        title: (c.title as string) || '',
        createdAt: c.created_at as string,
        updatedAt: c.updated_at as string
      }))

    } catch (queryError) {
      console.error('❌ Unexpected query error:', queryError)
      setResponseStatus(event, 500)
      return { 
        error: 'Unexpected database error', 
        details: (queryError as Error)?.message || String(queryError) || 'Unknown error'
      }
    }

  } catch (globalError) {
    console.error('❌ Global handler error:', globalError)
    setResponseStatus(event, 500)
    return { 
      error: 'Internal server error', 
      details: (globalError as Error)?.message || String(globalError) || 'Unknown error'
    }
  }
})