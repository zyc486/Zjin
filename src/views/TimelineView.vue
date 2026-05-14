<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores/memory'
import { useRealtime } from '@/composables/useRealtime'

const router = useRouter()
const memoryStore = useMemoryStore()

useRealtime()

onMounted(() => {
  memoryStore.fetchMemories()
})

const monthGroups = computed(() => {
  const groups = memoryStore.memoriesByMonth
  return Object.entries(groups).map(([key, memories]) => {
    const [year, month] = key.split('-')
    return {
      key,
      label: `${year}年${parseInt(month)}月`,
      memories,
    }
  })
})

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function openMemory(id: string) {
  router.push(`/memory/${id}`)
}
</script>

<template>
  <div class="timeline-page">
    <header class="timeline-header">
      <h1 class="page-title font-display">时间轴</h1>
    </header>

    <!-- 时间轴内容 -->
    <div v-if="monthGroups.length" class="timeline-content">
      <div v-for="group in monthGroups" :key="group.key" class="month-group">
        <div class="month-label">{{ group.label }}</div>
        <div class="month-memories">
          <div
            v-for="memory in group.memories"
            :key="memory.id"
            class="timeline-item"
            @click="openMemory(memory.id)"
          >
            <div class="timeline-dot"></div>
            <div class="timeline-card">
              <div class="timeline-date">{{ formatDate(memory.date) }}</div>
              <div class="timeline-title">{{ memory.title || '未命名' }}</div>
              <div v-if="memory.media?.length" class="timeline-thumb">
                <img :src="memory.media[0].url" loading="lazy" />
              </div>
              <p v-if="memory.content" class="timeline-excerpt">
                {{ memory.content.slice(0, 60) }}{{ memory.content.length > 60 ? '...' : '' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📖</div>
      <p class="empty-hint">开始记录后，这里会按时间展示</p>
    </div>
  </div>
</template>

<style scoped>
.timeline-page {
  min-height: 100%;
  padding: 0 1rem 1.5rem;
}

.timeline-header {
  padding: 1rem 0;
}

.page-title {
  font-size: 1.4rem;
  color: var(--color-accent);
}

.timeline-content {
  position: relative;
  padding-left: 1.5rem;
}

/* 竖线 */
.timeline-content::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
}

.month-group {
  margin-bottom: 1.5rem;
}

.month-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
  position: relative;
}

.month-memories {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.timeline-item {
  position: relative;
  cursor: pointer;
}

.timeline-dot {
  position: absolute;
  left: -1.5rem;
  top: 0.75rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--color-bg);
  transform: translateX(-4px);
}

.timeline-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  transition: transform 0.2s var(--ease-soft);
}

.timeline-card:active {
  transform: scale(0.98);
}

.timeline-date {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.timeline-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.35rem;
}

.timeline-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 0.35rem;
}

.timeline-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.timeline-excerpt {
  font-size: 0.75rem;
  color: var(--color-text-light);
  line-height: 1.5;
}

/* 空状态 */
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

.empty-hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
