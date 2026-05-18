import { ref, watch } from 'vue'
import { useMemoryStore } from '@/stores/memory'
import { useAuthStore } from '@/stores/auth'

const subscribedCoupleId = ref<string | null>(null)

export function useRealtime() {
  const memoryStore = useMemoryStore()
  const authStore = useAuthStore()

  function doSubscribe() {
    const coupleId = authStore.user?.couple_id
    if (coupleId && coupleId !== subscribedCoupleId.value) {
      if (subscribedCoupleId.value) {
        memoryStore.unsubscribeRealtime()
      }
      memoryStore.subscribeRealtime()
      subscribedCoupleId.value = coupleId
    }
  }

  function doUnsubscribe() {
    if (subscribedCoupleId.value) {
      memoryStore.unsubscribeRealtime()
      subscribedCoupleId.value = null
    }
  }

  watch(
    () => authStore.user?.couple_id,
    (newCoupleId, oldCoupleId) => {
      if (newCoupleId && newCoupleId !== oldCoupleId) {
        doSubscribe()
      } else if (!newCoupleId && oldCoupleId) {
        doUnsubscribe()
      }
    },
    { immediate: true }
  )

  return {
    subscribe: doSubscribe,
    unsubscribe: doUnsubscribe,
  }
}
