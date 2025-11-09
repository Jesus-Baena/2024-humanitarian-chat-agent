import { resolveAuthLinks } from '~/utils/authLinks'

export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()

  if (user.value) {
    return
  }

  const config = useRuntimeConfig()
  const currentUrl = process.server
    ? useRequestURL().href
    : typeof window !== 'undefined'
      ? window.location.href
      : undefined
  const links = resolveAuthLinks(config.public || {}, {
    currentUrl,
    redirectParamLogin: 'redirect_to'
  })

  return navigateTo(links.login, {
    external: links.login.startsWith('http')
  })
})
