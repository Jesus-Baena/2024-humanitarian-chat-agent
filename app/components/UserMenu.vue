<template>
  <div class="p-4">
    <div v-if="loading" class="flex items-center space-x-2">
      <USkeleton class="h-8 w-8 rounded-full" />
      <div class="space-y-2">
        <USkeleton class="h-4 w-[100px]" />
      </div>
    </div>
    <UDropdownMenu
      v-else-if="user"
      :items="items"
      :popper="{ placement: 'top-start' }"
    >
      <template #default>
        <UButton
          color="neutral"
          variant="ghost"
          class="w-full justify-start"
          :label="user.user_metadata?.full_name || user.email"
        >
          <template #leading>
            <UAvatar
              :src="user.user_metadata?.avatar_url"
              :alt="user.user_metadata?.full_name || user.email"
              size="xs"
              :ui="{
                root: 'bg-primary-500 dark:bg-primary-400',
                fallback: 'text-white dark:text-white text-xs font-medium'
              }"
            />
          </template>
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
    <!-- Login button removed - auth handled externally -->
  </div>
</template>

<script setup lang="ts">
import useUser from '~/composables/useUser'

const { user, loading, logout } = useUser()

const config = useRuntimeConfig()
const loginUrl = computed(() => {
  const base = (config.public?.authBase as string) || ''
  const path = '/login'
  if (typeof window !== 'undefined') {
    const redirectTo = window.location.href
    const qs = `?redirectTo=${encodeURIComponent(redirectTo)}`
    return base ? `${base.replace(/\/$/, '')}${path}${qs}` : `${path}${qs}`
  }
  return base ? `${base.replace(/\/$/, '')}${path}` : path
})

const profileUrl = computed(() => {
  const base = (config.public?.authBase as string) || ''
  const path = '/profile'
  return base ? `${base.replace(/\/$/, '')}${path}` : path
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
