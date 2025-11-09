<template>
  <div class="p-4">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center gap-3">
      <USkeleton class="h-8 w-8 rounded-full flex-shrink-0" />
      <div class="flex-1 space-y-2">
        <USkeleton class="h-3 w-24" />
        <USkeleton class="h-2 w-32" />
      </div>
    </div>

    <!-- Logged In: User Dropdown with Avatar -->
    <UDropdownMenu
      v-else-if="user"
      :items="items"
      :popper="{ placement: 'top-start' }"
    >
      <template #default="{ open }">
        <UButton
          color="neutral"
          variant="ghost"
          class="w-full justify-start gap-3"
          :class="{ 'bg-elevated': open }"
        >
          <template #leading>
            <UAvatar
              :src="user.user_metadata?.avatar_url"
              :alt="displayName"
              size="sm"
              :ui="{
                root: 'bg-primary-500 dark:bg-primary-400',
                fallback: 'text-white dark:text-white text-xs font-semibold'
              }"
            >
              <template v-if="!user.user_metadata?.avatar_url" #fallback>
                {{ userInitials }}
              </template>
            </UAvatar>
          </template>
          <div class="flex-1 flex flex-col items-start overflow-hidden">
            <span class="text-sm font-medium truncate w-full">{{ displayName }}</span>
            <span class="text-xs text-muted truncate w-full">{{ user.email }}</span>
          </div>
          <UIcon name="i-lucide-chevron-down" class="h-4 w-4 text-muted flex-shrink-0" />
        </UButton>
      </template>
      <template #item="{ item }">
        <span class="truncate">{{ item.label }}</span>
        <UIcon
          v-if="item.icon"
          :name="item.icon"
          class="flex-shrink-0 h-4 w-4 text-gray-400 dark:text-gray-500 ms-auto"
        />
      </template>
    </UDropdownMenu>

    <!-- Not Logged In: Sign In Button -->
    <div v-else>
      <UButton
        color="primary"
        variant="solid"
        block
        icon="i-lucide-log-in"
        label="Sign In"
        class="justify-center"
        @click="handleSignIn"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import useUser from '~/composables/useUser'
import { resolveAuthLinks } from '~/utils/authLinks'

const { logout } = useUser()
const supabaseUser = useSupabaseUser()
const config = useRuntimeConfig()

// Use Supabase user as the source of truth
const user = computed(() => supabaseUser.value)
const loading = ref(false)

const handleSignIn = () => {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : undefined
  const links = resolveAuthLinks(config.public || {}, {
    currentUrl,
    redirectParamLogin: 'redirect_to'
  })
  if (links.login.startsWith('http')) {
    window.location.href = links.login
  } else {
    navigateTo(links.login)
  }
}

const profileUrl = computed(() => resolveAuthLinks(config.public || {}).profile)

const displayName = computed(() => {
  if (!user.value) return ''
  return user.value.user_metadata?.full_name || user.value.email || 'User'
})

const userInitials = computed(() => {
  if (!user.value) return ''
  const name = user.value.user_metadata?.full_name || user.value.email || 'U'
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

interface DropdownItemBase {
  label: string
  icon?: string
}

interface DropdownItemSlot extends DropdownItemBase {
  slot: string
  disabled: boolean
}

interface DropdownItemLink extends DropdownItemBase {
  to: string
}

interface DropdownItemAction extends DropdownItemBase {
  click: () => Promise<void> | void
}

type DropdownItem = DropdownItemSlot | DropdownItemLink | DropdownItemAction

const items = computed<DropdownItem[][]>(() => {
  if (!user.value) {
    return []
  }
  return [
    [
      {
        label: user.value.email || '',
        slot: 'account',
        disabled: true
      }
    ],
    [
      {
        label: 'Profile',
        icon: 'i-lucide-user',
        to: profileUrl.value
      }
    ],
    [
      {
        label: 'Logout',
        icon: 'i-lucide-log-out',
        click: logout
      }
    ]
  ]
})
</script>
