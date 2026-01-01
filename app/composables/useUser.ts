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
    try {
      const supabase = useSupabaseClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error during sign out:', error)
    } finally {
      user.value = null
      
      const { public: publicCfg } = useRuntimeConfig()
      const current = typeof window !== 'undefined' ? window.location.href : ''
      const links = resolveAuthLinks(publicCfg || {}, {
        currentUrl: current,
        redirectParamLogout: 'redirectTo'
      })
      
      // Always use the local logout endpoint to ensure server-side cookies are cleared.
      // We pass the final destination (links.logout) as the redirectTo parameter.
      // If links.logout is already a local path, we just use it directly if it matches /api/auth/logout logic,
      // but to be safe and consistent, we route everything through /api/auth/logout.
      
      const localLogoutUrl = '/api/auth/logout'
      const finalRedirect = links.logout
      
      window.location.href = `${localLogoutUrl}?redirectTo=${encodeURIComponent(finalRedirect)}`
    }
  }

  return {
    user,
    loading,
    fetchUser,
    logout
  } as const
}

export default useUser
