<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin mx-auto mb-4" />
      <p class="text-muted">Completing sign in...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()
const toast = useToast()

onMounted(async () => {
  try {
    // Get the authorization code from the URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    
    if (code) {
      // Exchange the code for a session (PKCE flow)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        toast.add({
          title: 'Authentication Error',
          description: 'Failed to complete sign in. Please try again.',
          color: 'error'
        })
        await router.push('/login?error=auth_failed')
        return
      }
      
      console.log('Successfully authenticated:', data.user?.email)
      
      // Redirect to home or the original destination
      const redirectTo = params.get('redirectTo') || '/'
      await router.push(redirectTo)
    } else {
      // No code found - might be a direct navigation or error
      console.warn('No authorization code found in callback URL')
      
      // Check if there's already a valid session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session && !error) {
        // Session exists, redirect to home
        const redirectTo = params.get('redirectTo') || '/'
        await router.push(redirectTo)
      } else {
        // No session and no code - redirect to login
        await router.push('/login')
      }
    }
  } catch (error) {
    console.error('Auth callback error:', error)
    toast.add({
      title: 'Error',
      description: 'An unexpected error occurred during authentication.',
      color: 'error'
    })
    await router.push('/login?error=unexpected')
  }
})
</script>
