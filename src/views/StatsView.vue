<script setup lang="ts">
</script>

<template>
  <div class="stats-page">
    <div class="page-header">
      <h1 class="page-title font-display">回忆统计</h1>
      <p class="page-subtitle">我们的数据故事</p>
    </div>

    <div class="coming-soon">
      <div class="icon">📊</div>
      <p class="text">即将在 V0.5 版本实现</p>
      <p class="hint">数据统计中心正在开发中</p>
    </div>
  </div>
</template>

<style scoped>
.stats-page {
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

.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.text {
  font-size: 1.1rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
