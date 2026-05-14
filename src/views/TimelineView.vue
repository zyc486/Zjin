<script setup lang="ts">
</script>

<template>
  <div class="timeline-page">
    <div class="page-header">
      <h1 class="page-title font-display">时间长河</h1>
      <p class="page-subtitle">翻阅我们的故事</p>
    </div>

    <div class="empty-state">
      <div class="empty-icon">📖</div>
      <p class="empty-text">还没有记录</p>
      <p class="empty-hint">开始记录后，这里会按时间展示所有回忆</p>
    </div>
  </div>
</template>

<style scoped>
.timeline-page {
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
