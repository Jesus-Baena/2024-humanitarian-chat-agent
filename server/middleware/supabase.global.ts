import { getSupabaseServerClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseServerClient(event)
    // Trigger a lightweight auth call to ensure cookies are refreshed when needed.
    // await supabase.auth.getUser()
  } catch {
    // ignore
  }
})
