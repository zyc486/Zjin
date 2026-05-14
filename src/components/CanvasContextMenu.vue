<script setup lang="ts">
defineProps<{
  visible: boolean
  x: number
  y: number
  isPinned: boolean
}>()

const emit = defineEmits<{
  pin: []
  edit: []
  delete: []
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="ctx">
      <div v-if="visible" class="ctx-overlay" @click="emit('close')" @contextmenu.prevent>
        <div
          class="ctx-menu glass"
          :style="{ left: Math.min(x, window.innerWidth - 180) + 'px', top: Math.min(y, window.innerHeight - 220) + 'px' }"
          @click.stop
        >
          <button class="ctx-item" @click="emit('pin')">
            <span class="ctx-icon">{{ isPinned ? '📌' : '📍' }}</span>
            <span>{{ isPinned ? '取消置顶' : '置顶' }}</span>
          </button>
          <button class="ctx-item" @click="emit('edit')">
            <span class="ctx-icon">✏️</span>
            <span>编辑</span>
          </button>
          <div class="ctx-divider"></div>
          <button class="ctx-item ctx-danger" @click="emit('delete')">
            <span class="ctx-icon">🗑️</span>
            <span>删除</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ctx-overlay {
  position: fixed;
  inset: 0;
  z-index: 700;
}

.ctx-menu {
  position: fixed;
  min-width: 150px;
  padding: 0.35rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 32px rgba(74, 55, 40, 0.15);
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.15s;
}

.ctx-item:active {
  background: var(--color-primary);
}

.ctx-danger {
  color: #e74c3c;
}

.ctx-icon {
  font-size: 1rem;
}

.ctx-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0.2rem 0.5rem;
}

.ctx-enter-active,
.ctx-leave-active {
  transition: all 0.2s var(--ease-soft);
}

.ctx-enter-from,
.ctx-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
