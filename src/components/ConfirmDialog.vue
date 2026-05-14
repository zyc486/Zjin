<script setup lang="ts">
defineProps<{
  visible: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="cd">
      <div v-if="visible" class="cd-overlay" @click.self="emit('cancel')" @keydown="handleKeydown">
        <div class="cd-panel glass">
          <h3 v-if="title" class="cd-title">{{ title }}</h3>
          <p class="cd-message">{{ message }}</p>
          <div class="cd-actions">
            <button class="cd-cancel" @click="emit('cancel')">
              {{ cancelText || '取消' }}
            </button>
            <button
              class="cd-confirm"
              :class="{ danger: variant === 'danger' }"
              @click="emit('confirm')"
            >
              {{ confirmText || '确定' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cd-overlay {
  position: fixed;
  inset: 0;
  z-index: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 55, 40, 0.2);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.cd-panel {
  width: calc(100% - 3rem);
  max-width: 320px;
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 1.5rem 1.25rem;
  box-shadow: 0 16px 48px rgba(74, 55, 40, 0.15);
  text-align: center;
}

.cd-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.cd-message {
  font-size: 0.9rem;
  color: var(--color-text-light);
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.cd-actions {
  display: flex;
  gap: 0.75rem;
}

.cd-cancel,
.cd-confirm {
  flex: 1;
  padding: 0.7rem;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s var(--ease-soft);
}

.cd-cancel {
  background: var(--color-primary);
  color: var(--color-text);
}

.cd-confirm {
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-warm) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(232, 160, 191, 0.3);
}

.cd-confirm.danger {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.cd-cancel:active,
.cd-confirm:active {
  transform: scale(0.97);
}

/* 动画 */
.cd-enter-active,
.cd-leave-active {
  transition: all 0.25s var(--ease-soft);
}

.cd-enter-active .cd-panel,
.cd-leave-active .cd-panel {
  transition: transform 0.25s var(--ease-soft), opacity 0.25s var(--ease-soft);
}

.cd-enter-from,
.cd-leave-to {
  opacity: 0;
}

.cd-enter-from .cd-panel,
.cd-leave-to .cd-panel {
  transform: scale(0.9);
  opacity: 0;
}
</style>
