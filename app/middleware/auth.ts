export default defineNuxtRouteMiddleware((to, _from) => {
  const user = useSupabaseUser()

  // If there's no user and we're trying to access a protected route, redirect to login
  if (!user.value) {
    return navigateTo('/login')
  }
})
