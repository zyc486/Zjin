<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="canvas-page">
    <div class="page-header">
      <h1 class="page-title font-display">我们的回忆</h1>
      <p class="page-subtitle">{{ auth.partner ? `和 ${auth.partner.nickname} 的小宇宙` : '你的回忆空间' }}</p>
    </div>

    <div class="empty-state">
      <div class="empty-icon">✨</div>
      <p class="empty-text">还没有回忆</p>
      <p class="empty-hint">点击下方 + 按钮开始记录</p>
    </div>
  </div>
</template>

<style scoped>
.canvas-page {
  min-height: 100%;
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty-text {
  font-size: 1.1rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
