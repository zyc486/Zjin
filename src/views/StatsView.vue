<script setup lang="ts">
</script>

<template>
  <div class="stats-page">
    <div class="coming-soon">
      <div class="icon">📊</div>
      <p class="hint">开发中</p>
    </div>
  </div>
</template>

<style scoped>
.stats-page {
  min-height: 100%;
  padding: 1.5rem;
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

.hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
