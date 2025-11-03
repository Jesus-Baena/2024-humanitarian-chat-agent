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

onMounted(async () => {
  // Exchange the code for a session
  const { data, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Auth callback error:', error)
  }
  
  // Redirect to home or the original destination
  const redirectTo = new URLSearchParams(window.location.search).get('redirectTo') || '/'
  await router.push(redirectTo)
})
</script>
