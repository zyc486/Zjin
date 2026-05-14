<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const emit = defineEmits<{
  search: [query: string]
  clear: []
}>()

const query = ref('')
const focused = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (val.trim()) {
      emit('search', val.trim())
    } else {
      emit('clear')
    }
  }, 250)
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

function handleClear() {
  query.value = ''
  emit('clear')
}
</script>

<template>
  <div class="search-bar" :class="{ focused }">
    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
    <input
      v-model="query"
      class="search-input"
      placeholder="搜索回忆..."
      @focus="focused = true"
      @blur="focused = false"
    />
    <button v-if="query" class="clear-btn" @click="handleClear">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.search-bar {
  position: absolute;
  top: 60px;
  left: 1rem;
  right: 1rem;
  max-width: 400px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1.5px solid var(--color-border);
  box-shadow: 0 2px 12px rgba(74, 55, 40, 0.06);
  transition: all 0.25s var(--ease-soft);
}

.search-bar.focused {
  border-color: var(--color-accent);
  box-shadow: 0 2px 16px rgba(232, 160, 191, 0.15);
}

.search-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.search-input {
  flex: 1;
  border: none;
  background: none;
  font-size: 0.9rem;
  color: var(--color-text);
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.clear-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s;
}

.clear-btn:active {
  background: var(--color-primary-dark);
}

.clear-btn svg {
  width: 14px;
  height: 14px;
  color: var(--color-text-light);
}
</style>
