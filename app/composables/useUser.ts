import { resolveAuthLinks } from '~/utils/authLinks'

interface User {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
  [key: string]: unknown
}

const useUser = () => {
  const user = useState<User | null>('user', () => null)
  const loading = useState<boolean>('user-loading', () => true)

  const fetchUser = async () => {
    loading.value = true
    const { public: publicCfg } = useRuntimeConfig()
    const base: string = (publicCfg.apiBase as string) || ''
    // Prefer relative URL to leverage same-origin cookies; prepend base if provided.
    const url: string = base ? `${base.replace(/\/$/, '')}/api/me` : '/api/me'
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      if (!response.ok) {
        // If CORS blocked, response.type may be 'opaque'.
        if (import.meta.dev)
          console.warn(
            '[useUser] Non-ok user response',
            response.status,
            response.type
          )
        user.value = null
      } else {
        const data = await response.json().catch(() => null)
        user.value = data && data.id ? data : null
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      user.value = null
    } finally {
      loading.value = false
    }
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      fetchUser()
    }
  }

  onMounted(() => {
    fetchUser()
    window.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    window.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  const logout = async () => {
    const { public: publicCfg } = useRuntimeConfig()
    const apiBase: string = (publicCfg.apiBase as string) || ''
    const current = typeof window !== 'undefined' ? window.location.href : ''
    const links = resolveAuthLinks(publicCfg || {}, {
      currentUrl: current,
      redirectParamLogout: 'redirectTo'
    })
    if (links.logout.startsWith('http')) {
      window.location.href = links.logout
      return
    }
    const base = apiBase ? apiBase.replace(/\/$/, '') : ''
    const path = links.logout.startsWith('/') ? links.logout : `/${links.logout}`
    window.location.href = `${base}${path}`
  }

  return {
    user,
    loading,
    fetchUser,
    logout
  } as const
}

export default useUser
