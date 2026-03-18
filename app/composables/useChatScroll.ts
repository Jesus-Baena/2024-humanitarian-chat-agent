export default function useChatScroll() {
  const scrollContainer = useTemplateRef<HTMLDivElement>('scrollContainer')
  const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaRef')
  const isAtBottom = ref<boolean>(true)
  const showScrollButton = ref<boolean>(false)

  const checkScrollPosition = (): void => {
    if (scrollContainer.value) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
      isAtBottom.value = scrollTop + clientHeight >= scrollHeight - 200
      showScrollButton.value = !isAtBottom.value
    }
  }

  const scrollToBottom = (immediate = false): void => {
    if (!scrollContainer.value) return
    if (immediate) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    } else {
      scrollContainer.value.scrollTo({ top: scrollContainer.value.scrollHeight, behavior: 'smooth' })
    }
  }

  async function pinToBottom() {
    if (isAtBottom.value && scrollContainer.value) {
      await nextTick()
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  }

  onMounted(() => {
    if (scrollContainer.value) {
      scrollContainer.value.addEventListener('scroll', checkScrollPosition)
      nextTick(() => {
        scrollToBottom(true)
        textareaRef.value?.focus()
      })
    }
  })

  onUnmounted(() => {
    if (scrollContainer.value) {
      scrollContainer.value.removeEventListener('scroll', checkScrollPosition)
    }
  })

  onUpdated(() => {
    checkScrollPosition()
  })

  return {
    isAtBottom,
    showScrollButton,
    scrollToBottom,
    scrollContainer,
    textareaRef,
    pinToBottom
  } as const
}
