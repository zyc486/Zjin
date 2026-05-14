<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  confirm: [title: string]
  close: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const title = ref('')
const loading = ref(false)

watch(() => props.visible, async (v) => {
  if (v) {
    title.value = ''
    loading.value = false
    await nextTick()
    inputRef.value?.focus()
  }
})

async function handleConfirm() {
  if (loading.value) return
  loading.value = true
  emit('confirm', title.value.trim() || '新回忆')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleConfirm()
  }
  if (e.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="qc">
      <div v-if="visible" class="qc-overlay" @click.self="emit('close')">
        <div class="qc-panel glass">
          <div class="qc-handle"><span class="handle-bar"></span></div>
          <h3 class="qc-title">新建回忆</h3>
          <input
            ref="inputRef"
            v-model="title"
            class="qc-input"
            placeholder="写点什么..."
            maxlength="100"
            @keydown="handleKeydown"
          />
          <div class="qc-actions">
            <button class="qc-cancel" @click="emit('close')">取消</button>
            <button class="qc-confirm" :disabled="loading" @click="handleConfirm">
              {{ loading ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.qc-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 55, 40, 0.15);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.qc-panel {
  width: calc(100% - 3rem);
  max-width: 340px;
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 1.25rem;
  box-shadow: 0 16px 48px rgba(74, 55, 40, 0.15);
}

.qc-handle {
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
}

.qc-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  margin-bottom: 1rem;
}

.qc-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font-size: 1rem;
  color: var(--color-text);
  outline: none;
  transition: border-color 0.2s;
}

.qc-input:focus {
  border-color: var(--color-accent);
}

.qc-input::placeholder {
  color: var(--color-text-muted);
}

.qc-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.qc-cancel,
.qc-confirm {
  flex: 1;
  padding: 0.7rem;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s var(--ease-soft);
}

.qc-cancel {
  background: var(--color-primary);
  color: var(--color-text);
}

.qc-confirm {
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-warm) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(232, 160, 191, 0.3);
}

.qc-confirm:disabled {
  opacity: 0.6;
}

.qc-confirm:active,
.qc-cancel:active {
  transform: scale(0.97);
}

/* 动画 */
.qc-enter-active,
.qc-leave-active {
  transition: all 0.3s var(--ease-soft);
}

.qc-enter-active .qc-panel,
.qc-leave-active .qc-panel {
  transition: transform 0.3s var(--ease-soft), opacity 0.3s var(--ease-soft);
}

.qc-enter-from,
.qc-leave-to {
  opacity: 0;
}

.qc-enter-from .qc-panel,
.qc-leave-to .qc-panel {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}
</style>
