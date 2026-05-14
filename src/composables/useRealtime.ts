import { onMounted, onUnmounted, watch } from 'vue'
import { useMemoryStore } from '@/stores/memory'
import { useAuthStore } from '@/stores/auth'

export function useRealtime() {
  const memoryStore = useMemoryStore()
  const authStore = useAuthStore()

  onMounted(() => {
    if (authStore.hasCouple) {
      memoryStore.subscribeRealtime()
    }
  })

  onUnmounted(() => {
    memoryStore.unsubscribeRealtime()
  })

  watch(() => authStore.hasCouple, (has) => {
    if (has) {
      memoryStore.subscribeRealtime()
    } else {
      memoryStore.unsubscribeRealtime()
    }
  })
}
