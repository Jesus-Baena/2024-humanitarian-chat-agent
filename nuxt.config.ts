import { fileURLToPath } from 'node:url'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const supabaseUrl
  = process.env.NUXT_PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL
    || ''
// Support both new (sb_publishable_) and legacy (JWT anon) key formats
const supabaseKey
  = process.env.NUXT_PUBLIC_SUPABASE_KEY // New publishable key format
    || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY // Legacy JWT format
    || process.env.SUPABASE_ANON_KEY // Legacy fallback
    || ''
const flowiseUrl = process.env.NUXT_PUBLIC_FLOWISE_URL || ''
const flowiseApiKey = process.env.NUXT_PUBLIC_FLOWISE_API_KEY || ''
const authBase = process.env.NUXT_PUBLIC_AUTH_BASE || ''
const loginPath = process.env.NUXT_PUBLIC_LOGIN_PATH || '/login'
const logoutPath = process.env.NUXT_PUBLIC_LOGOUT_PATH || '/logout'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/ui-pro',
    '@nuxtjs/mdc',
    ['@nuxtjs/supabase', {
      redirectOptions: {
        login: '/',
        callback: '/',
        exclude: ['/', '/chat/*']
      }
    }]
  ],

  devtools: {
    enabled: true
  },

  srcDir: 'app',

  css: ['~/assets/css/main.css'],

  mdc: {
    highlight: {
      shikiEngine: 'javascript'
    },
    components: {
      prose: true
    }
  },

  runtimeConfig: {
    supabaseUrl,
    supabaseKey,
    // Support both new (sb_secret_) and legacy (service_role) key formats
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    public: {
      siteUrl,
      supabaseUrl,
      supabaseKey,
      flowiseUrl,
      flowiseApiKey,
      authBase,
      loginPath,
      logoutPath
    }
  },

  compatibilityDate: '2024-07-11',

  supabase: {
    url: supabaseUrl,
    key: supabaseKey,
    redirectOptions: {
      login: '/',
      callback: '/',
      exclude: ['/']
    }
  },

  nitro: {
    experimental: {
      openAPI: true
    }
  },

  vite: {
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./app', import.meta.url)),
        '@': fileURLToPath(new URL('./app', import.meta.url))
      }
    }
  }
})
