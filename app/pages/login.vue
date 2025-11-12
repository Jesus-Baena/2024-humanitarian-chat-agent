<script setup lang="ts">
import { resolveAuthLinks } from '~/utils/authLinks'

definePageMeta({
  layout: 'default',
  middleware: [] // Allow login page even when authenticated for re-auth
})

useSeoMeta({
  title: 'Sign in to AI Chat',
  description: 'Sign in to your account to access the humanitarian AI assistant'
})

const toast = useToast()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const config = useRuntimeConfig()

const usingExternalAuth = computed(() => {
  const base = (config.public.authBase as string) || ''
  return base.trim().length > 0
})

function normalizeRedirectTarget(target: string): string {
  if (typeof window === 'undefined') {
    return target
  }
  if (!target) {
    return window.location.origin
  }
  if (target.startsWith('http')) {
    return target
  }
  const origin = window.location.origin.replace(/\/$/, '')
  const formatted = target.startsWith('/') ? target : `/${target}`
  return `${origin}${formatted}`
}

const triggerExternalLogin = () => {
  if (!usingExternalAuth.value || typeof window === 'undefined') {
    return
  }
  const destination = normalizeRedirectTarget(redirectTo.value)
  const link = resolveAuthLinks(config.public || {}, {
    currentUrl: destination,
    redirectParamLogin: 'redirect_to'
  }).login
  if (link.startsWith('http')) {
    window.location.href = link
  } else {
    navigateTo(link)
  }
}

// Get the base URL for OAuth redirects (production URL in production, local in dev)
const baseUrl = config.public.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '')

// Handle redirect_to parameter for cross-domain auth
// Supports: baena.ai -> chat.baena.ai
const redirectTo = computed(() => {
  const path = route.query.redirect_to?.toString() || route.query.redirectTo?.toString()
  if (path) {
    // Allow redirects to chat.baena.ai from baena.ai
    if (path.startsWith('http://localhost:3001') || 
        path.startsWith('https://chat.baena.ai') ||
        path.startsWith('http://chat.localhost:3001')) {
      return path
    }
  }
  // Default to index page
  return '/'
})

onMounted(() => {
  if (usingExternalAuth.value) {
    triggerExternalLogin()
  }
})

// Redirect if already logged in (but allow manual re-auth)
const isLoggingIn = ref(false)
watch(user, (newUser) => {
  // Only redirect if not manually trying to login
  if (newUser && !isLoggingIn.value) {
    if (redirectTo.value.startsWith('http')) {
      window.location.href = redirectTo.value
    } else {
      navigateTo(redirectTo.value, { external: false })
    }
  }
}, { immediate: true })

// Form fields - using UInput built-in validation
const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')

function validateEmail(value: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!value) {
    emailError.value = 'Email is required'
    return false
  }
  if (!emailRegex.test(value)) {
    emailError.value = 'Invalid email address'
    return false
  }
  emailError.value = ''
  return true
}

function validatePassword(value: string) {
  if (!value) {
    passwordError.value = 'Password is required'
    return false
  }
  if (value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
    return false
  }
  passwordError.value = ''
  return true
}

// OAuth providers
const providers = usingExternalAuth.value
  ? []
  : [{
      label: 'Google',
      icon: 'i-simple-icons-google',
      onClick: async () => {
        try {
          isLoggingIn.value = true
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectTo.value.startsWith('http') 
                ? redirectTo.value 
                : `${baseUrl}/auth/callback?redirectTo=${encodeURIComponent(redirectTo.value)}`
            }
          })
          if (error) throw error
        } catch (error: unknown) {
          isLoggingIn.value = false
          
          // Enhanced error handling for OAuth
          let errorMessage = 'Failed to sign in with Google'
          if (error instanceof Error) {
            if (error.message.includes('rate limit') || error.message.includes('429')) {
              errorMessage = 'Too many authentication attempts. Please wait a few minutes and try again.'
            } else {
              errorMessage = error.message
            }
          }
          
          toast.add({
            title: 'Error',
            description: errorMessage
          })
        }
      }
    }]

// Validation schema
const isSubmitting = ref(false)

async function onSubmit() {
  if (usingExternalAuth.value) {
    return
  }
  // Validate form
  if (!validateEmail(email.value) || !validatePassword(password.value)) {
    return
  }

  try {
    isSubmitting.value = true
    isLoggingIn.value = true

    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Signed in successfully'
    })

    // Navigate after successful login
    if (redirectTo.value.startsWith('http')) {
      window.location.href = redirectTo.value
    } else {
      await navigateTo(redirectTo.value)
    }
  } catch (error: unknown) {
    isLoggingIn.value = false
    
    // Enhanced error handling for rate limits and common auth errors
    let errorMessage = 'Failed to sign in'
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'Too many login attempts. Please wait a few minutes and try again.'
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in'
      } else {
        errorMessage = error.message
      }
    }
    
    toast.add({
      title: 'Error',
      description: errorMessage
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-background to-muted/30">
    <div class="w-full max-w-md space-y-8">
      <template v-if="usingExternalAuth">
        <div class="text-center">
          <NuxtLink to="/" class="inline-block mb-4">
            <Logo class="h-8 w-auto" />
          </NuxtLink>
          <h1 class="text-3xl font-bold tracking-tight">Continue to sign in</h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Redirecting you to the portfolio authentication page.
          </p>
        </div>

        <div class="bg-card/50 backdrop-blur-sm rounded-lg border border-border p-6 text-center space-y-4">
          <UIcon name="i-lucide-loader-2" class="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p class="text-sm text-muted-foreground">
            If nothing happens, use the button below to continue.
          </p>
          <UButton
            color="primary"
            block
            size="lg"
            @click="triggerExternalLogin"
          >
            Continue to portfolio login
          </UButton>
        </div>
      </template>

      <template v-else>
      <!-- Logo -->
      <div class="text-center">
        <NuxtLink to="/" class="inline-block mb-4">
          <Logo class="h-8 w-auto" />
        </NuxtLink>
        <h1 class="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Sign in to your humanitarian AI assistant
        </p>
      </div>

      <!-- Auth Form -->
      <div class="bg-card/50 backdrop-blur-sm rounded-lg border border-border p-6">
        <form class="space-y-6" @submit.prevent="onSubmit">
          <!-- Email Field -->
          <UFormGroup label="Email address" class="space-y-2">
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              size="lg"
              :disabled="isSubmitting || isLoggingIn"
              @blur="validateEmail(email)"
            />
            <span v-if="emailError" class="text-sm text-red-500">{{ emailError }}</span>
          </UFormGroup>

          <!-- Password Field -->
          <UFormGroup label="Password" class="space-y-2">
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              required
              size="lg"
              :disabled="isSubmitting || isLoggingIn"
              @blur="validatePassword(password)"
            />
            <span v-if="passwordError" class="text-sm text-red-500">{{ passwordError }}</span>
          </UFormGroup>

          <!-- Submit Button -->
          <UButton 
            type="submit" 
            block 
            size="lg"
            :loading="isSubmitting"
            :disabled="isSubmitting || isLoggingIn"
            class="mt-8"
          >
            Sign in
          </UButton>
        </form>
      </div>

      <!-- OAuth Divider -->
      <div class="relative my-8">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-muted" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-4 bg-background text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <!-- OAuth Buttons -->
      <div class="bg-card/50 backdrop-blur-sm rounded-lg border border-border p-6">
        <UButton
          v-for="provider in providers"
          :key="provider.label"
          :icon="provider.icon"
          :label="provider.label"
          color="neutral"
          variant="outline"
          block
          size="lg"
          :disabled="isSubmitting || isLoggingIn"
          @click="provider.onClick"
        >
          {{ provider.label }}
        </UButton>
      </div>

      <!-- Signup Link -->
      <p class="text-center text-sm text-muted-foreground mt-6">
        Don't have an account?
        <ULink to="/signup" class="font-semibold text-primary hover:underline">
          Sign up
        </ULink>
      </p>

      <!-- Links Back to Portfolio -->
      <div class="flex items-center justify-center gap-4 pt-6 mt-6 border-t border-muted">
        <ULink to="/" class="text-xs text-muted-foreground hover:text-foreground">
          ← Back to home
        </ULink>
        <span class="text-xs text-muted-foreground">•</span>
        <ULink to="https://baena.ai" external class="text-xs text-muted-foreground hover:text-foreground">
          Visit portfolio ↗
        </ULink>
      </div>
      </template>
    </div>
  </div>
</template>
