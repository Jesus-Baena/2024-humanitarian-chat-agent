<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const toast = useToast()

useSeoMeta({
  title: 'Profile',
  description: 'Manage your account profile'
})

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }

    toast.add({
      title: 'Success',
      description: 'Signed out successfully'
    })

    await navigateTo('/')
  } catch (error: unknown) {
    console.error('Sign out error:', error)
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to sign out',
      color: 'error'
    })
  }
}

async function deleteAccount() {
  if (!user.value) return
  if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return
  
  try {
    const res = await $fetch<{ success: boolean; error?: string }>('/api/delete-account', {
      method: 'POST',
      body: { userId: user.value.id }
    })
    
    if (res.error) throw new Error(res.error)
    
    toast.add({
      title: 'Account Deleted',
      description: 'Your account has been deleted successfully.'
    })
    
    await supabase.auth.signOut()
    await navigateTo('/')
  } catch (err) {
    toast.add({
      title: 'Error',
      description: err instanceof Error ? err.message : 'Failed to delete account',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-3xl">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Profile
          </h1>
          <UButton
            icon="i-lucide-arrow-left"
            to="/"
            color="neutral"
            variant="ghost"
            label="Back to Chat"
          />
        </div>
      </template>

      <div
        v-if="user"
        class="space-y-6"
      >
        <!-- User Avatar -->
        <div class="flex items-center gap-4">
          <UAvatar
            :src="user.user_metadata?.avatar_url"
            :alt="user.user_metadata?.full_name || user.email"
            size="xl"
            :ui="{
              root: 'bg-primary-500 dark:bg-primary-400',
              fallback: 'text-white dark:text-white text-2xl font-semibold'
            }"
          >
            <template v-if="!user.user_metadata?.avatar_url" #fallback>
              {{ (user.user_metadata?.full_name || user.email || 'U')
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) }}
            </template>
          </UAvatar>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ user.user_metadata?.full_name || 'User' }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ user.email }}
            </p>
          </div>
        </div>

        <USeparator />

        <!-- Account Information -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Account Information
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <p class="mt-1 text-gray-900 dark:text-white">
                {{ user.user_metadata?.full_name || 'Not provided' }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <p class="mt-1 text-gray-900 dark:text-white">
                {{ user.email }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Verified
              </label>
              <div class="mt-1 flex items-center gap-2">
                <UIcon
                  :name="user.email_confirmed_at ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                  :class="user.email_confirmed_at ? 'text-green-500' : 'text-gray-400'"
                />
                <span class="text-gray-900 dark:text-white">
                  {{ user.email_confirmed_at ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Member Since
              </label>
              <p class="mt-1 text-gray-900 dark:text-white">
                {{ new Date(user.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) }}
              </p>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Actions -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Account Actions
          </h3>
          
          <div class="flex flex-col sm:flex-row gap-4">
            <UButton
              label="Sign Out"
              color="neutral"
              variant="outline"
              icon="i-lucide-log-out"
              @click="signOut"
            />
            <UButton
              label="Delete Account"
              color="error"
              variant="outline"
              icon="i-lucide-trash"
              @click="deleteAccount"
            />
          </div>
        </div>

        <!-- Additional Info -->
        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-info" class="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <p class="font-medium text-gray-900 dark:text-white mb-1">About Your Data</p>
              <p>
                Your chat history is securely stored and associated with your account. 
                Deleting your account will permanently remove all your chats and messages.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500 dark:text-gray-400">
          Loading user information...
        </p>
      </div>
    </UCard>
  </div>
</template>
