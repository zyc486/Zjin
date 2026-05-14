<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMemoryStore } from '@/stores/memory'
import { useRealtime } from '@/composables/useRealtime'

import { useCanvas } from '@/composables/useCanvas'
import { usePanZoom } from '@/composables/usePanZoom'
import { useDrawTools } from '@/composables/useDrawTools'
import { useCardRenderer } from '@/composables/useCardRenderer'
import { useDrawingPersistence } from '@/composables/useDrawingPersistence'
import { useHistory } from '@/composables/useHistory'

import CanvasToolbar from '@/components/CanvasToolbar.vue'
import CanvasContextMenu from '@/components/CanvasContextMenu.vue'
import CanvasSearchBar from '@/components/CanvasSearchBar.vue'
import QuickCreatePanel from '@/components/QuickCreatePanel.vue'
import MemoryDetailPanel from '@/components/MemoryDetailPanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

import type { Memory, DrawState, CardMoveData, DrawPathData, DrawEraseData } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const memoryStore = useMemoryStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

// ── Composables ──────────────────────────────────────
const { canvas, init, resize, screenToWorld, getPointerPos } = useCanvas(canvasRef)
const panZoom = usePanZoom(canvas)
const drawTools = useDrawTools(canvas, handlePathCreated, handlePathErased)
const cardRenderer = useCardRenderer(canvas)
const drawingPersistence = useDrawingPersistence(canvas)
const history = useHistory()

// 注册撤销/重做处理器
history.registerHandler('card:move',
  async (op) => { // undo
    const d = op.data as CardMoveData
    cardRenderer.moveCard(d.memoryId, d.from.x, d.from.y)
    memoryStore.updateCanvasPosition(d.memoryId, { canvas_x: d.from.x, canvas_y: d.from.y })
  },
  async (op) => { // redo
    const d = op.data as CardMoveData
    cardRenderer.moveCard(d.memoryId, d.to.x, d.to.y)
    memoryStore.updateCanvasPosition(d.memoryId, { canvas_x: d.to.x, canvas_y: d.to.y })
  },
)

history.registerHandler('draw:path',
  async (op) => { // undo: 删除路径
    const d = op.data as DrawPathData
    const c = canvas.value
    if (!c) return
    for (const [path, id] of drawingPersistence.drawingIdMap) {
      if (id === d.drawingId) {
        c.remove(path)
        drawingPersistence.drawingIdMap.delete(path)
        drawingPersistence.deletePath(d.drawingId)
        c.requestRenderAll()
        break
      }
    }
  },
  async (op) => { // redo: 恢复路径
    const d = op.data as DrawPathData
    const c = canvas.value
    if (!c) return
    const { Path } = await import('fabric')
    const path = await Path.fromObject(d.pathJson as any)
    path.set({ selectable: false, evented: false })
    c.add(path)
    const newId = await drawingPersistence.savePath(d.pathJson)
    if (newId) drawingPersistence.onPathCreated(path, newId)
    c.requestRenderAll()
  },
)

history.registerHandler('draw:erase',
  async (op) => { // undo: 恢复被擦除的路径
    const d = op.data as DrawEraseData
    const c = canvas.value
    if (!c) return
    const { Path } = await import('fabric')
    const path = await Path.fromObject(d.pathJson as any)
    path.set({ selectable: false, evented: false })
    c.add(path)
    const newId = await drawingPersistence.savePath(d.pathJson)
    if (newId) drawingPersistence.onPathCreated(path, newId)
    c.requestRenderAll()
  },
  async (op) => { // redo: 再次擦除
    const d = op.data as DrawEraseData
    const c = canvas.value
    if (!c) return
    for (const [path, id] of drawingPersistence.drawingIdMap) {
      if (id === d.drawingId) {
        c.remove(path)
        drawingPersistence.drawingIdMap.delete(path)
        drawingPersistence.deletePath(d.drawingId)
        c.requestRenderAll()
        break
      }
    }
  },
)

// ── Realtime ─────────────────────────────────────────
useRealtime()

// ── UI 状态 ──────────────────────────────────────────
const showMenu = ref(false)
const showQuickCreate = ref(false)
const quickCreatePos = ref({ x: 0, y: 0 })
const ctxMenu = ref({ visible: false, x: 0, y: 0, memoryId: '', isPinned: false })
const detailMemory = ref<Memory | null>(null)
const confirmDialog = ref({ visible: false, memoryId: '' })
const searchQuery = ref('')

let clickTimer: ReturnType<typeof setTimeout> | null = null
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let longPressTarget: string | null = null
let wasLongPress = false
let wasRightClick = false

// ── 生命周期 ─────────────────────────────────────────
onMounted(async () => {
  await memoryStore.fetchMemories()
  init()
  setupCanvasEvents()
  cardRenderer.syncCards(memoryStore.memories)
  drawingPersistence.restore()
  drawingPersistence.subscribe()
  panZoom.activate()
  window.addEventListener('resize', resize)
})

// ── 画布事件编排 ─────────────────────────────────────
function setupCanvasEvents() {
  const c = canvas.value!
  let dragStartPos: { x: number; y: number } | null = null

  // 右键菜单
  c.on('mouse:down:before', (opt) => {
    const e = opt.e as MouseEvent
    const target = opt.target as any
    if (e.button === 2 || e.ctrlKey) {
      wasRightClick = true
      if (target?.memoryId) {
        const m = memoryStore.memories.find(mem => mem.id === target.memoryId)
        ctxMenu.value = {
          visible: true,
          x: e.clientX || 100,
          y: e.clientY || 100,
          memoryId: target.memoryId,
          isPinned: m?.is_pinned || false,
        }
      }
      return
    }
  })

  // 鼠标按下
  c.on('mouse:down', (opt) => {
    const e = opt.e as MouseEvent | TouchEvent
    const target = opt.target as any

    // 橡皮擦
    if (drawTools.handleCanvasClick(opt)) return

    // 绘画模式下不做其他处理
    if (c.isDrawingMode) return

    // 点击了卡片
    if (target?.memoryId) {
      dragStartPos = { x: target.left ?? 0, y: target.top ?? 0 }
      c.setActiveObject(target)
      c.requestRenderAll()

      // 长按检测
      longPressTarget = target.memoryId
      const pos = 'touches' in e
        ? { x: e.touches[0]?.clientX || 0, y: e.touches[0]?.clientY || 0 }
        : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }

      longPressTimer = setTimeout(() => {
        if (longPressTarget) {
          wasLongPress = true
          const m = memoryStore.memories.find(mem => mem.id === longPressTarget)
          ctxMenu.value = {
            visible: true,
            x: pos.x,
            y: pos.y,
            memoryId: longPressTarget,
            isPinned: m?.is_pinned || false,
          }
          longPressTarget = null
        }
      }, 600)
      return
    }

    // 空白区域由 usePanZoom 处理平移
  })

  // 鼠标松开
  c.on('mouse:up', (opt) => {
    // 清除长按
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
    longPressTarget = null

    if (wasLongPress) { wasLongPress = false; return }
    if (wasRightClick) { wasRightClick = false; return }

    const target = opt.target as any
    if (target?.memoryId) {
      const objX = target.left ?? 0
      const objY = target.top ?? 0
      const wasDrag = dragStartPos && (Math.abs(objX - dragStartPos.x) > 2 || Math.abs(objY - dragStartPos.y) > 2)

      if (wasDrag) {
        // 拖拽结束，保存位置 + 记录撤销
        const worldPos = screenToWorld(objX, objY)
        const fromWorld = screenToWorld(dragStartPos!.x, dragStartPos!.y)
        memoryStore.updateCanvasPosition(target.memoryId, { canvas_x: worldPos.x, canvas_y: worldPos.y })
        history.push({
          type: 'card:move',
          timestamp: Date.now(),
          data: {
            memoryId: target.memoryId,
            from: { x: fromWorld.x, y: fromWorld.y },
            to: { x: worldPos.x, y: worldPos.y },
          } as CardMoveData,
        })
        dragStartPos = null
        return
      }

      // 单击 → 显示详情面板
      if (clickTimer) clearTimeout(clickTimer)
      clickTimer = setTimeout(() => {
        const m = memoryStore.memories.find(mem => mem.id === target.memoryId)
        if (m) detailMemory.value = m
      }, 250)

      dragStartPos = null
    }
  })

  // 双击
  c.on('mouse:dblclick', (opt) => {
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
    const target = opt.target as any
    if (target?.memoryId) {
      // 双击 → 编辑
      detailMemory.value = null
      router.push(`/memory/${target.memoryId}`)
    } else {
      // 空白双击 → 快速创建
      const pos = screenToWorld(opt.pointer.x, opt.pointer.y)
      quickCreatePos.value = { x: pos.x, y: pos.y }
      showQuickCreate.value = true
    }
  })
}

// ── 涂鸦回调 ─────────────────────────────────────────
async function handlePathCreated(path: fabric.Path) {
  const pathJson = path.toJSON()
  const drawingId = await drawingPersistence.savePath(pathJson)
  if (drawingId) {
    drawingPersistence.onPathCreated(path, drawingId)
    history.push({
      type: 'draw:path',
      timestamp: Date.now(),
      data: { drawingId, pathJson } as DrawPathData,
    })
  }
}

function handlePathErased(path: fabric.Path) {
  const drawingId = drawingPersistence.drawingIdMap.get(path)
  if (drawingId) {
    const pathJson = path.toJSON()
    drawingPersistence.onPathErased(path)
    history.push({
      type: 'draw:erase',
      timestamp: Date.now(),
      data: { drawingId, pathJson } as DrawEraseData,
    })
  }
}

// ── 监听 memories 变化（增量更新） ───────────────────
watch(() => memoryStore.memories, (memories) => {
  cardRenderer.syncCards(memories)
}, { deep: true })

// ── 搜索 ─────────────────────────────────────────────
function handleSearch(query: string) {
  searchQuery.value = query
  cardRenderer.filterBySearch(query, memoryStore.memories)
}

function handleSearchClear() {
  searchQuery.value = ''
  cardRenderer.filterBySearch('', memoryStore.memories)
}

// ── 快速创建 ─────────────────────────────────────────
function openQuickCreateAtCenter() {
  if (!canvas.value) return
  const w = canvas.value.getWidth()
  const h = canvas.value.getHeight()
  const pos = screenToWorld(w / 2, h / 2)
  quickCreatePos.value = { x: pos.x, y: pos.y }
  showQuickCreate.value = true
}

async function handleQuickCreate(title: string) {
  showQuickCreate.value = false
  try {
    await memoryStore.createMemoryOnCanvas(title, quickCreatePos.value.x, quickCreatePos.value.y)
  } catch (e) {
    console.error('快速创建失败:', e)
  }
}

// ── 工具切换 ─────────────────────────────────────────
function handleToolChange(state: DrawState) {
  drawTools.updateState(state)
  if (state.tool !== 'select') {
    panZoom.deactivate()
  } else {
    panZoom.activate()
  }
}

// ── 上下文菜单操作 ───────────────────────────────────
function handleCtxPin() {
  memoryStore.togglePin(ctxMenu.value.memoryId)
  ctxMenu.value.visible = false
}

function handleCtxEdit() {
  router.push(`/memory/${ctxMenu.value.memoryId}`)
  ctxMenu.value.visible = false
}

function handleCtxDelete() {
  confirmDialog.value = { visible: true, memoryId: ctxMenu.value.memoryId }
  ctxMenu.value.visible = false
}

async function handleConfirmDelete() {
  confirmDialog.value.visible = false
  try {
    await memoryStore.deleteMemory(confirmDialog.value.memoryId)
  } catch (e) {
    console.error('删除失败:', e)
  }
}

// ── 登出 ─────────────────────────────────────────────
async function handleLogout() {
  showMenu.value = false
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="canvas-page">
    <!-- 顶部栏 -->
    <header class="canvas-header">
      <h1 class="app-title font-display">Zjin</h1>
      <div class="header-actions">
        <button class="avatar-btn" @click="showMenu = !showMenu">
          <span class="avatar-letter">{{ auth.user?.nickname?.[0] || '👤' }}</span>
        </button>
        <Transition name="fade">
          <div v-if="showMenu" class="user-menu glass" @click.stop>
            <p class="menu-name">{{ auth.user?.nickname }}</p>
            <p class="menu-partner">与 {{ auth.partner?.nickname }} 的空间</p>
            <button class="menu-logout" @click="handleLogout">退出登录</button>
          </div>
        </Transition>
      </div>
    </header>

    <!-- 空状态 -->
    <div v-if="!memoryStore.memories.length && !memoryStore.loading" class="empty-state">
      <div class="empty-icon">📷</div>
      <p class="empty-hint">双击画布空白处创建回忆</p>
    </div>

    <!-- Fabric.js 画布 -->
    <canvas ref="canvasRef" class="canvas-host"></canvas>

    <!-- 搜索栏 -->
    <CanvasSearchBar @search="handleSearch" @clear="handleSearchClear" />

    <!-- 浮动创建按钮 -->
    <button class="fab-create" @click="openQuickCreateAtCenter">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>

    <!-- 绘图工具栏 -->
    <CanvasToolbar @change="handleToolChange" />

    <!-- 右键/长按菜单 -->
    <CanvasContextMenu
      :visible="ctxMenu.visible"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :is-pinned="ctxMenu.isPinned"
      @pin="handleCtxPin"
      @edit="handleCtxEdit"
      @delete="handleCtxDelete"
      @close="ctxMenu.visible = false"
    />

    <!-- 快速创建面板 -->
    <QuickCreatePanel
      :visible="showQuickCreate"
      @confirm="handleQuickCreate"
      @close="showQuickCreate = false"
    />

    <!-- 回忆详情面板 -->
    <MemoryDetailPanel
      :memory="detailMemory"
      @close="detailMemory = null"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :visible="confirmDialog.visible"
      title="删除回忆"
      message="确定删除这条回忆吗？此操作不可撤销。"
      confirm-text="删除"
      variant="danger"
      @confirm="handleConfirmDelete"
      @cancel="confirmDialog.visible = false"
    />

    <!-- 遮罩关闭菜单 -->
    <div v-if="showMenu" class="menu-overlay" @click="showMenu = false"></div>
  </div>
</template>

<style scoped>
.canvas-page {
  position: relative;
  flex: 1;
  min-height: 0;
  height: 100dvh;
  overflow: hidden;
  background: var(--color-bg);
}

.canvas-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  z-index: 100;
  background: rgba(254, 252, 251, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  pointer-events: auto;
}

.app-title {
  font-size: 1.5rem;
  color: var(--color-accent);
  letter-spacing: 0.02em;
}

.header-actions {
  position: relative;
}

.avatar-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-accent);
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s var(--ease-soft);
}

.avatar-btn:active {
  transform: scale(0.9);
}

.avatar-letter {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent);
}

.user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 32px var(--color-shadow);
  z-index: 200;
}

.menu-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.menu-partner {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.15rem;
  margin-bottom: 0.6rem;
}

.menu-logout {
  width: 100%;
  padding: 0.5rem;
  font-size: 0.8rem;
  color: #e74c3c;
  background: none;
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s;
}

.menu-logout:active {
  background: rgba(231, 76, 60, 0.08);
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
}

.canvas-host {
  position: absolute;
  top: 0;
  left: 0;
  touch-action: none;
}

/* 空状态 */
.empty-state {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  z-index: 50;
  pointer-events: none;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

/* 浮动创建按钮 */
.fab-create {
  position: absolute;
  bottom: calc(140px + env(safe-area-inset-bottom, 0px));
  right: 1.25rem;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-warm) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 90;
  box-shadow: 0 6px 20px rgba(232, 160, 191, 0.45);
  transition: all 0.3s var(--ease-soft);
}

.fab-create svg {
  width: 24px;
  height: 24px;
}

.fab-create:active {
  transform: scale(0.9);
  box-shadow: 0 3px 12px rgba(232, 160, 191, 0.35);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s var(--ease-soft);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
