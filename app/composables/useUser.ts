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
    const supabase = useSupabaseClient()
    await supabase.auth.signOut()
    user.value = null

    const { public: publicCfg } = useRuntimeConfig()
    const apiBase: string = (publicCfg.apiBase as string) || ''
    const current = typeof window !== 'undefined' ? window.location.href : ''
    const links = resolveAuthLinks(publicCfg || {}, {
      currentUrl: current,
      redirectParamLogout: 'redirectTo'
    })
    
    // If we have an external auth base, we can redirect there to ensure global logout,
    // but since we share cookies and just signed out locally, we might just want to
    // redirect to home or login page to avoid issues if the external logout is flaky.
    // However, to maintain the "ecosystem" feel, we'll stick to the plan but fallback
    // to local redirection if needed.
    
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
