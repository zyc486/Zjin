<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const auth = useAuthStore()

onMounted(() => {
  auth.init()
})
</script>

<template>
  <div v-if="auth.loading" class="loading-screen">
    <div class="loading-content">
      <div class="loading-icon">💕</div>
      <p class="loading-text font-display">Zjin</p>
    </div>
  </div>
  <AppLayout v-else />
</template>

<style scoped>
.loading-screen {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}

.loading-content {
  text-align: center;
  animation: pulse 2s ease-in-out infinite;
}

.loading-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.loading-text {
  font-size: 1.5rem;
  color: var(--color-text-light);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.98); }
}
</style>
