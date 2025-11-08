export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()

  // If there's no user and we're trying to access a protected route, redirect to login
  if (!user.value) {
    return navigateTo('/login')
  }
})
