<template>
  <UDashboardPanel grow>
    <UDashboardNavbar />

    <ChatWindow :chat-id="chatId" :initial-message="initialMessage" />
  </UDashboardPanel>
</template>

<script setup lang="ts">
const route = useRoute()
const chatId = computed(() => route.params.id as string)
const initialMessage = computed(() => route.query.message as string | undefined)

useHead({
  title: 'baena.ai - Chat'
})
</script>
