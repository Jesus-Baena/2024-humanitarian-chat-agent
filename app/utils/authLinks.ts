export interface AuthLinks {
  login: string
  logout: string
  profile: string
}

interface ResolveOptions {
  currentUrl?: string | null
  redirectParamLogin?: string
  redirectParamLogout?: string
}

interface RuntimeConfigSubset {
  authBase?: string
  loginPath?: string
  logoutPath?: string
}

function trimTrailingSlash(path: string): string {
  return path.replace(/\/$/, '')
}

export function resolveAuthLinks(
  config: RuntimeConfigSubset,
  options: ResolveOptions = {}
): AuthLinks {
  const authBase = (config.authBase || '').trim()
  const loginPath = config.loginPath || '/login'
  const logoutPath = config.logoutPath || '/logout'
  const redirectParamLogin = options.redirectParamLogin || 'redirect_to'
  const redirectParamLogout = options.redirectParamLogout || 'redirectTo'
  const currentUrl = options.currentUrl?.trim()

  if (!authBase) {
    return {
      login: '/login',
      logout: '/auth/logout',
      profile: '/profile'
    }
  }

  const base = trimTrailingSlash(authBase)
  const buildRedirect = (param: string) =>
    currentUrl ? `?${param}=${encodeURIComponent(currentUrl)}` : ''

  return {
    login: `${base}${loginPath}${buildRedirect(redirectParamLogin)}`,
    logout: `${base}${logoutPath}${buildRedirect(redirectParamLogout)}`,
    profile: `${base}/profile`
  }
}
