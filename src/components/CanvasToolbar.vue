<script setup lang="ts">
import { ref } from 'vue'
import type { DrawTool, DrawState } from '@/types'

const emit = defineEmits<{ change: [state: DrawState] }>()

const tool = ref<DrawTool>('select')
const color = ref('#4A3728')
const size = ref(3)
const expanded = ref(false)

const colors = [
  '#4A3728', '#E8A0BF', '#D4A574', '#7B68EE',
  '#4A90D9', '#5BBD6B', '#E74C3C', '#F39C12',
]

function selectTool(t: DrawTool) {
  tool.value = t
  expanded.value = t !== 'select'
  emitChange()
}

function selectColor(c: string) {
  color.value = c
  emitChange()
}

function selectSize(s: number) {
  size.value = s
  emitChange()
}

function toggleExpand() {
  expanded.value = !expanded.value
}

function emitChange() {
  emit('change', { tool: tool.value, color: color.value, size: size.value })
}
</script>

<template>
  <div class="toolbar-wrapper">
    <!-- 展开的工具选项 -->
    <Transition name="toolbar-expand">
      <div v-if="expanded && tool !== 'select'" class="toolbar-options glass">
        <!-- 颜色选择 -->
        <div class="option-row">
          <button
            v-for="c in colors"
            :key="c"
            class="color-dot"
            :class="{ active: color === c }"
            :style="{ background: c }"
            @click="selectColor(c)"
          />
        </div>
        <!-- 粗细选择 -->
        <div class="option-row size-row">
          <button
            v-for="s in [2, 4, 8, 12]"
            :key="s"
            class="size-btn"
            :class="{ active: size === s }"
            @click="selectSize(s)"
          >
            <span class="size-dot" :style="{ width: s + 'px', height: s + 'px' }"></span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 主工具栏 -->
    <div class="toolbar glass">
      <!-- 选择/移动 -->
      <button class="tool-btn" :class="{ active: tool === 'select' }" @click="selectTool('select')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M4 4l7 17 2.5-6.5L20 12z" />
        </svg>
      </button>

      <!-- 画笔 -->
      <button class="tool-btn" :class="{ active: tool === 'pen' }" @click="selectTool('pen')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      </button>

      <!-- 荧光笔 -->
      <button class="tool-btn" :class="{ active: tool === 'highlighter' }" @click="selectTool('highlighter')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="6" y="2" width="12" height="8" rx="2" transform="rotate(45 12 12)" />
          <line x1="6" y1="18" x2="2" y2="22" />
          <line x1="18" y1="18" x2="14" y2="22" />
        </svg>
      </button>

      <!-- 橡皮擦 -->
      <button class="tool-btn" :class="{ active: tool === 'eraser' }" @click="selectTool('eraser')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M20 20H7L3 16l9-9 8 8-4 4" />
          <path d="M6 11l8 8" />
        </svg>
      </button>

      <!-- 展开/收起 -->
      <button class="tool-btn expand-btn" @click="toggleExpand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" :style="{ transform: expanded ? 'rotate(180deg)' : '' }">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar-wrapper {
  position: absolute;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  pointer-events: none;
}

.toolbar,
.toolbar-options {
  pointer-events: auto;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 20px rgba(74, 55, 40, 0.12);
}

.toolbar-options {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 20px rgba(74, 55, 40, 0.12);
}

.option-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: center;
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.color-dot.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(232, 160, 191, 0.3);
  transform: scale(1.15);
}

.color-dot:active {
  transform: scale(0.9);
}

.size-row {
  gap: 0.5rem;
}

.size-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.size-btn.active {
  border-color: var(--color-accent);
  background: rgba(232, 160, 191, 0.1);
}

.size-dot {
  border-radius: 50%;
  background: var(--color-text);
}

.tool-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-light);
  transition: all 0.2s var(--ease-soft);
}

.tool-btn svg {
  width: 20px;
  height: 20px;
}

.tool-btn.active {
  background: var(--color-accent);
  color: white;
  box-shadow: 0 2px 8px rgba(232, 160, 191, 0.4);
}

.tool-btn:active {
  transform: scale(0.9);
}

.expand-btn svg {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}

/* 展开动画 */
.toolbar-expand-enter-active,
.toolbar-expand-leave-active {
  transition: all 0.25s var(--ease-soft);
}

.toolbar-expand-enter-from,
.toolbar-expand-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}
</style>
