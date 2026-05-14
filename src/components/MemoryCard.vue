<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Memory } from '@/types'

const props = defineProps<{ memory: Memory }>()
const router = useRouter()

const coverImage = computed(() => {
  if (props.memory.media?.length) {
    return props.memory.media.sort((a, b) => a.sort_order - b.sort_order)[0]
  }
  return null
})

const formattedDate = computed(() => {
  const d = new Date(props.memory.date)
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const authorName = computed(() => {
  return props.memory.author?.nickname || ''
})

const visibleTags = computed(() => {
  return (props.memory.tags || []).slice(0, 3)
})

function openMemory() {
  router.push(`/memory/${props.memory.id}`)
}
</script>

<template>
  <div class="memory-card card" @click="openMemory">
    <div class="card-cover">
      <img v-if="coverImage" :src="coverImage.url" class="cover-img" loading="lazy" />
      <div
        v-else
        class="cover-placeholder"
        :style="{ background: memory.bg_color || 'var(--color-primary)' }"
      >
        <span class="cover-text">{{ memory.title?.[0] || '✦' }}</span>
      </div>
    </div>
    <div class="card-body">
      <h3 class="card-title">{{ memory.title || '未命名' }}</h3>
      <div class="card-meta">
        <span class="card-date">{{ formattedDate }}</span>
        <span v-if="authorName" class="card-author">{{ authorName }}</span>
      </div>
      <div v-if="visibleTags.length" class="card-tags">
        <span v-for="tag in visibleTags" :key="tag.id" class="tag-chip">{{ tag.tag }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.memory-card {
  cursor: pointer;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  transition: transform 0.3s var(--ease-soft), box-shadow 0.3s var(--ease-soft);
}

.memory-card:active {
  transform: scale(0.97);
}

.card-cover {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-text {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.3;
}

.card-body {
  padding: 0.75rem;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.4rem;
}

.tag-chip {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-light);
}
</style>
