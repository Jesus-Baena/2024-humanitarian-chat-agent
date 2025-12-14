<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin mx-auto mb-4" />
      <p class="text-muted-foreground">Completing sign in...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()
const route = useRoute()
const { data: { session } } = await useAsyncData('session', () => supabase.auth.getSession())

onMounted(async () => {
  const redirectTo = route.query.redirectTo?.toString() || '/'

  try {
    // Supabase SSR client handles code exchange; verify session and redirect.
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Auth callback error:', error)
      await router.push('/login')
      return
    }

    if (!data.session) {
      console.warn('No session established after callback')
      await router.push('/login')
      return
    }

    if (redirectTo.startsWith('http')) {
      window.location.href = redirectTo
    } else {
      await router.push(redirectTo)
    }
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    await router.push('/login')
  }
})
</script>
