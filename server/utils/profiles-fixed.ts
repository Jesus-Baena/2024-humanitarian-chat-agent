import type { SupabaseClient } from '@supabase/supabase-js'

export async function getOrCreateProfileId(supabase: SupabaseClient, authUserId: string): Promise<string | null> {
  if (!authUserId) return null
  
  try {
    const { data: found, error: findErr } = await supabase
      .schema('web')
      .from('profiles')
      .select('id')
      .eq('user_id', authUserId)
      .limit(1)
    
    if (findErr) {
      console.error('Error finding profile:', findErr)
      return null
    }
    
    if (Array.isArray(found) && found[0]?.id) {
      return found[0].id as string
    }
    
    // Create a minimal profile row
    const { data: created, error: insErr } = await supabase
      .schema('web')
      .from('profiles')
      .insert({ user_id: authUserId })
      .select('id')
      .limit(1)
    
    if (insErr) {
      console.error('Error creating profile:', insErr)
      return null
    }
    
    return (created && created[0]?.id) || null
  } catch (error) {
    console.error('Unexpected error in getOrCreateProfileId:', error)
    return null
  }
}