<script setup lang="ts">
import { onMounted, nextTick } from 'vue'

interface Props {
  chatId: string
  initialMessage?: string
}

const props = defineProps<Props>()

const {
  messages,
  sendMessage,
  scrollContainer,
  isLoading,
  isError,
  errorMessage,
  isTyping,
  cancelStream,
  retryStream
} = useChat(props.chatId)

const { user, loading: userLoading } = useUser()

// Handle initial message - wait for the component to mount and history to load
onMounted(() => {
  if (props.initialMessage) {
    // Use nextTick to ensure the chat history has been loaded first
    const message = decodeURIComponent(props.initialMessage)
    nextTick(() => {
      sendMessage(message)
    })
  }
})
</script>

<template>
  <div class="flex flex-col h-full relative min-h-0">
    <!-- Messages container -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto p-6 pb-40 min-h-0">
      <UContainer>
        <div class="space-y-6">
          <!-- Chat messages (render by role) -->
          <div v-for="message in messages" :key="message.id" class="space-y-4">
            <!-- User message -->
            <div
              v-if="message.role === 'user'"
              class="flex items-start space-x-4"
            >
              <div class="flex-shrink-0">
                <UAvatar icon="i-heroicons-user" />
              </div>
              <div class="flex-1 min-w-0">
                <div
                  class="bg-primary-500/20 dark:bg-primary-400/10 rounded-lg p-4"
                >
                  <p class="text-gray-900 dark:text-gray-100">
                    <!-- Render user message with MDC -->
                    <MDC :value="message.content" tag="div" />
                  </p>
                </div>
              </div>
            </div>

            <!-- Assistant message -->
            <div v-else class="flex items-start space-x-4">
              <div class="flex-shrink-0">
                <UAvatar icon="i-heroicons-cpu-chip" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4">
                  <div class="prose dark:prose-invert max-w-none">
                    <!-- Show placeholder while streaming and content is empty -->
                    <template v-if="isTyping && !message.content">
                      <span class="text-gray-400 animate-pulse">...</span>
                    </template>
                    <template v-else>
                      <MDC :value="message.content" tag="div" />
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Login hint -->
          <div v-if="!user && !userLoading" class="mt-4 text-sm text-gray-500">
            <UAlert
              icon="i-heroicons-information-circle"
              color="primary"
              variant="soft"
              title="Log in to keep your chats"
            />
          </div>
        </div>
      </UContainer>
    </div>

    <!-- Streaming controls and indicators -->
    <div class="absolute left-0 right-0 bottom-0 z-10 p-4">
      <UContainer>
        <div class="flex items-center space-x-2 mb-2">
          <template v-if="isLoading">
            <UButton
              size="sm"
              variant="soft"
              color="error"
              @click="cancelStream"
            >
              Cancel
            </UButton>
            <span v-if="isTyping" class="ml-2 text-gray-500 animate-pulse">...
            </span>
          </template>
          <template v-else-if="isError">
            <UButton
              size="sm"
              variant="soft"
              color="primary"
              @click="retryStream"
            >
              Retry
            </UButton>
            <span class="ml-2 text-red-500">{{ errorMessage }}</span>
          </template>
        </div>
        <ChatInput @send-message="sendMessage" />
      </UContainer>
    </div>
  </div>
</template>
