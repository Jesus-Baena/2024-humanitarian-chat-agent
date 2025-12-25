import { getSupabaseServerClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const supabase = getSupabaseServerClient(event)
    await supabase.auth.signOut()
  } catch {
    // ignore
  }
  
  // Get redirect destination from query parameter
  const query = getQuery(event)
  const redirectTo = query.redirectTo?.toString() || query.redirect_to?.toString()
  
  // If redirectTo is provided and valid, use it; otherwise default to origin
  if (redirectTo) {
    // Allow redirects to same origin or to chat.baena.ai subdomain
    if (redirectTo.startsWith('/') || 
        redirectTo.includes('chat.baena.ai') || 
        redirectTo.includes('localhost:3001')) {
      return sendRedirect(event, redirectTo, 302)
    }
  }
  
  // Default: redirect to root of current site
  return sendRedirect(event, '/', 302)
})
