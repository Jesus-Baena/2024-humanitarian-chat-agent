import { getSupabaseServerClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerClient(event)
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const { userId } = body

  // Verify that the userId matches the authenticated user
  if (userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: Cannot delete another user\'s account'
    })
  }

  try {
    // Delete user's data from the web schema
    // First, delete all messages associated with the user's chats
    const { error: deleteMessagesError } = await supabase
      .schema('web')
      .from('messages')
      .delete()
      .eq('user_id', userId)

    if (deleteMessagesError) {
      console.error('Error deleting messages:', deleteMessagesError)
      throw deleteMessagesError
    }

    // Delete all chats associated with the user
    const { error: deleteChatsError } = await supabase
      .schema('web')
      .from('chats')
      .delete()
      .eq('user_id', userId)

    if (deleteChatsError) {
      console.error('Error deleting chats:', deleteChatsError)
      throw deleteChatsError
    }

    // Delete the user's profile
    const { error: deleteProfileError } = await supabase
      .schema('web')
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError)
      throw deleteProfileError
    }

    // Note: The actual user account deletion from Supabase Auth
    // requires admin privileges. This would typically be done via
    // Supabase Admin API or trigger a background job.
    // For now, we're just deleting the user's data from the web schema.

    return { success: true }
  } catch (error) {
    console.error('Error deleting account:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to delete account'
    })
  }
})
