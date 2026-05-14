<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Memory } from '@/types'

const props = defineProps<{ memory: Memory | null }>()
const emit = defineEmits<{ close: [] }>()
const router = useRouter()

const coverImage = computed(() => {
  if (!props.memory?.media?.length) return null
  return [...props.memory.media].sort((a, b) => a.sort_order - b.sort_order)[0]
})

const formattedDate = computed(() => {
  if (!props.memory) return ''
  const d = new Date(props.memory.date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const authorName = computed(() => props.memory?.author?.nickname || '')

const tags = computed(() => props.memory?.tags || [])

function editMemory() {
  if (!props.memory) return
  emit('close')
  router.push(`/memory/${props.memory.id}`)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="panel">
      <div v-if="memory" class="panel-overlay" @click.self="emit('close')">
        <div class="panel-sheet glass">
          <!-- 拖拽条 -->
          <div class="panel-handle" @click="emit('close')">
            <span class="handle-bar"></span>
          </div>

          <!-- 封面 -->
          <div v-if="coverImage" class="panel-cover">
            <img :src="coverImage.url" class="cover-img" />
          </div>

          <!-- 内容 -->
          <div class="panel-content">
            <h2 class="panel-title">{{ memory.title || '未命名' }}</h2>
            <div class="panel-meta">
              <span class="meta-date">{{ formattedDate }}</span>
              <span v-if="authorName" class="meta-author">{{ authorName }}</span>
              <span v-if="memory.mood" class="meta-mood">{{ memory.mood }}</span>
            </div>

            <div v-if="memory.location" class="panel-location">
              📍 {{ memory.location }}
            </div>

            <div v-if="tags.length" class="panel-tags">
              <span v-for="tag in tags" :key="tag.id" class="tag-chip">{{ tag.tag }}</span>
            </div>

            <p v-if="memory.content" class="panel-text">{{ memory.content }}</p>
          </div>

          <!-- 操作按钮 -->
          <div class="panel-actions">
            <button class="btn-edit" @click="editMemory">编辑回忆</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: flex-end;
  background: rgba(74, 55, 40, 0.2);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.panel-sheet {
  width: 100%;
  max-height: 72vh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-handle {
  display: flex;
  justify-content: center;
  padding: 0.6rem 0 0.2rem;
  cursor: pointer;
}

.handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
}

.panel-cover {
  width: 100%;
  max-height: 200px;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  max-height: 200px;
  object-fit: cover;
}

.panel-content {
  padding: 1rem 1.25rem 0;
  overflow-y: auto;
  flex: 1;
}

.panel-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
}

.panel-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.meta-date::before {
  content: '';
}

.panel-location {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-light);
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.6rem;
}

.tag-chip {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-light);
}

.panel-text {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text);
  white-space: pre-wrap;
}

.panel-actions {
  padding: 1rem 1.25rem;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}

.btn-edit {
  width: 100%;
  padding: 0.8rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: white;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-warm) 100%);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.3s var(--ease-soft);
  box-shadow: 0 4px 16px rgba(232, 160, 191, 0.3);
}

.btn-edit:active {
  transform: scale(0.97);
}

/* 过渡动画 */
.panel-enter-active,
.panel-leave-active {
  transition: all 0.35s var(--ease-soft);
}

.panel-enter-active .panel-sheet,
.panel-leave-active .panel-sheet {
  transition: transform 0.35s var(--ease-soft);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}

.panel-enter-from .panel-sheet,
.panel-leave-to .panel-sheet {
  transform: translateY(100%);
}
</style>
