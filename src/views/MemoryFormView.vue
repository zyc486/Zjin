<script setup lang="ts">
</script>

<template>
  <div class="memory-form-page">
    <div class="page-header">
      <h1 class="page-title font-display">记录这一刻</h1>
    </div>

    <div class="coming-soon">
      <div class="icon">📝</div>
      <p class="text">即将在 V0.2 版本实现</p>
      <p class="hint">回忆记录表单正在开发中</p>
    </div>
  </div>
</template>

<style scoped>
.memory-form-page {
  min-height: 100%;
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  color: var(--color-text);
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
