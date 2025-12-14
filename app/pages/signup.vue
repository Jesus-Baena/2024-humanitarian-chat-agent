<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['unauthenticated']
})

useSeoMeta({
  title: 'Create Account - AI Chat',
  description: 'Sign up for a new account to access the humanitarian AI assistant'
})

const toast = useToast()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Redirect if already logged in
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/')
  }
}, { immediate: true })

// Form state
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const isSubmitting = ref(false)

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
  if (value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters'
    return false
  }
  passwordError.value = ''
  return true
}

function validateConfirmPassword(value: string) {
  if (!value) {
    confirmPasswordError.value = 'Please confirm your password'
    return false
  }
  if (value !== password.value) {
    confirmPasswordError.value = 'Passwords do not match'
    return false
  }
  confirmPasswordError.value = ''
  return true
}

async function onSubmit() {
  // Validate form
  const emailValid = validateEmail(email.value)
  const passwordValid = validatePassword(password.value)
  const confirmValid = validateConfirmPassword(confirmPassword.value)

  if (!emailValid || !passwordValid || !confirmValid) {
    return
  }

  try {
    isSubmitting.value = true

    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Account created! Check your email to confirm your account.'
    })

    // Redirect to login after brief delay
    setTimeout(() => {
      navigateTo('/login')
    }, 2000)
  } catch (error: unknown) {
    // Enhanced error handling for rate limits and common auth errors
    let errorMessage = 'Failed to create account'
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'Too many signup attempts. Please wait a few minutes and try again.'
      } else if (error.message.includes('already registered') || error.message.includes('already exists')) {
        errorMessage = 'An account with this email already exists. Try signing in instead.'
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
      <!-- Logo -->
      <div class="text-center">
        <NuxtLink to="/" class="inline-block mb-4">
          <Logo class="h-8 w-auto" />
        </NuxtLink>
        <h1 class="text-3xl font-bold tracking-tight">Create account</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Join the humanitarian AI assistant
        </p>
      </div>

      <!-- Signup Form -->
      <form class="space-y-6" @submit.prevent="onSubmit">
        <!-- Email Field -->
        <UFormGroup label="Email address">
          <UInput
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            :disabled="isSubmitting"
            @blur="validateEmail(email)"
          />
          <span v-if="emailError" class="text-sm text-red-500">{{ emailError }}</span>
        </UFormGroup>

        <!-- Password Field -->
        <UFormGroup label="Password">
          <UInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            :disabled="isSubmitting"
            @blur="validatePassword(password)"
          />
          <span v-if="passwordError" class="text-sm text-red-500">{{ passwordError }}</span>
        </UFormGroup>

        <!-- Confirm Password Field -->
        <UFormGroup label="Confirm password">
          <UInput
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            :disabled="isSubmitting"
            @blur="validateConfirmPassword(confirmPassword)"
          />
          <span v-if="confirmPasswordError" class="text-sm text-red-500">{{ confirmPasswordError }}</span>
        </UFormGroup>

        <!-- Submit Button -->
        <UButton
          type="submit"
          block
          size="lg"
          :loading="isSubmitting"
          :disabled="isSubmitting"
        >
          Create account
        </UButton>
      </form>

      <!-- Login Link -->
      <p class="text-center text-sm text-muted-foreground">
        Already have an account?
        <ULink to="/login" class="font-semibold text-primary hover:underline">
          Sign in
        </ULink>
      </p>

      <!-- Links Back to Portfolio -->
      <div class="flex items-center justify-center gap-4 pt-4 border-t border-muted">
        <ULink to="/" class="text-xs text-muted-foreground hover:text-foreground">
          ← Back to home
        </ULink>
        <span class="text-xs text-muted-foreground">•</span>
        <ULink to="https://baena.ai" external class="text-xs text-muted-foreground hover:text-foreground">
          Visit portfolio ↗
        </ULink>
      </div>
    </div>
  </div>
</template>
