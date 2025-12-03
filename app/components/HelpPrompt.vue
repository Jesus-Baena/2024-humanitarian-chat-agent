<script setup lang="ts">
async function handleSendMessage(message: string) {
  if (!message.trim()) return

  const chatId = Date.now().toString()
  await navigateTo(`/chat/${chatId}?message=${encodeURIComponent(message.trim())}`)
}
</script>

<template>
  <UContainer class="flex-1 flex items-center justify-center py-8">
    <div class="w-full max-w-3xl flex flex-col space-y-6">
      <!-- Title -->
      <div class="text-center">
        <h1 class="text-3xl font-semibold mb-2">
          How can I help you today?
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Start a conversation by typing your question below
        </p>
      </div>

      <!-- Input -->
      <div class="w-full">
        <ChatInput @send-message="handleSendMessage" />
      </div>

      <!-- <div class="flex justify-center">
        <AssistantSelect />
      </div> -->

      <!-- Suggested prompts -->
      <div class="flex flex-wrap gap-2 justify-center">
        <UButton
          variant="outline"
          rounded="full"
          class="flex items-center space-x-2 text-gray-600 dark:text-gray-400"
          @click="handleSendMessage('Can ECHO funding pay for business cards?')"
        >
          <UIcon name="i-heroicons-banknotes-solid" class="h-4 w-4" />
          <span>Can ECHO funding pay for business cards?</span>
        </UButton>
        <UButton
          variant="outline"
          rounded="full"
          class="flex items-center space-x-2 text-gray-600 dark:text-gray-400"
          @click="handleSendMessage('Does UNDSS covers the security of NGOs?')"
        >
          <UIcon
            name="i-heroicons-document-currency-dollar-solid"
            class="h-4 w-4"
          />
          <span>Does UNDSS covers the security of NGOs?</span>
        </UButton>
        <UButton
          variant="outline"
          rounded="full"
          class="flex items-center space-x-2 text-gray-600 dark:text-gray-400"
          @click="handleSendMessage('What is an L4 emergency?')"
        >
          <UIcon name="i-heroicons-globe-europe-africa-solid" class="h-4 w-4" />
          <span>What is an L4 emergency?</span>
        </UButton>
        <UButton
          variant="outline"
          rounded="full"
          class="flex items-center space-x-2 text-gray-600 dark:text-gray-400"
          @click="handleSendMessage('Difference between key indicators and sphere standards??')"
        >
          <UIcon name="i-heroicons-truck-solid" class="h-4 w-4" />
          <span>What is the difference between key indicators and sphere standards?</span>
        </UButton>
      </div>
    </div>
  </UContainer>
</template>
