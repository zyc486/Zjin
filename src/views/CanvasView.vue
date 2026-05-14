<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Canvas as FabricCanvas, Rect, Text, Group, FabricImage, PencilBrush, Path } from 'fabric'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/stores/auth'
import { useMemoryStore } from '@/stores/memory'
import { useCategoryStore } from '@/stores/category'
import { useRealtime } from '@/composables/useRealtime'

import QuickCreatePanel from '@/components/QuickCreatePanel.vue'
import CanvasToolbar from '@/components/CanvasToolbar.vue'
import CanvasContextMenu from '@/components/CanvasContextMenu.vue'
import CanvasSearchBar from '@/components/CanvasSearchBar.vue'
import type { DrawState, DrawTool } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const memoryStore = useMemoryStore()
const categoryStore = useCategoryStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const showMenu = ref(false)
const showQuickCreate = ref(false)
const quickCreateX = ref(0)
const quickCreateY = ref(0)
const drawState = ref<DrawState>({ tool: 'select', color: '#4A3728', size: 3 })
const ctxMenu = ref({ visible: false, x: 0, y: 0, memoryId: '', isPinned: false })
const searchQuery = ref('')

let fabricCanvas: FabricCanvas | null = null
let isPanning = false
let lastPosX = 0
let lastPosY = 0
let clickTimer: ReturnType<typeof setTimeout> | null = null
let longPressTimer: ReturnType<typeof setTimeout> | null = null

useRealtime()

onMounted(async () => {
  await Promise.all([
    memoryStore.fetchMemories(),
    categoryStore.fetchCategories(),
  ])
  await nextTick()
  initCanvas()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (clickTimer) clearTimeout(clickTimer)
  if (longPressTimer) clearTimeout(longPressTimer)
  if (saveTimer) clearTimeout(saveTimer)
  fabricCanvas?.dispose()
  fabricCanvas = null
})

function initCanvas() {
  if (!canvasRef.value) return

  const headerHeight = 52
  const w = window.innerWidth
  const h = window.innerHeight - headerHeight

  fabricCanvas = new FabricCanvas(canvasRef.value, {
    width: w,
    height: h,
    selection: false,
    backgroundColor: '#FEFCFB',
    stopContextMenu: true,
    fireRightClick: true,
  })

  // 确保 Fabric.js 容器定位正确（在 header 下方）
  const container = canvasRef.value.parentElement
  if (container) {
    container.style.position = 'absolute'
    container.style.top = '52px'
    container.style.left = '0'
    container.style.width = w + 'px'
    container.style.height = h + 'px'
    container.style.pointerEvents = 'auto'
    container.style.zIndex = '1'
  }
  const upperCanvas = container?.querySelector('.upper-canvas') as HTMLElement
  if (upperCanvas) {
    upperCanvas.style.pointerEvents = 'auto'
    upperCanvas.style.cursor = 'grab'
  }

  fabricCanvas.isDrawingMode = false
  fabricCanvas.setViewportTransform([1, 0, 0, 1, w / 2, h / 2])

  setupEvents()
  renderCards()
  restoreDrawings()
}

function setupEvents() {
  const c = fabricCanvas!
  let longPressTarget: string | null = null
  let wasLongPress = false
  let wasRightClick = false
  let lastDist = 0

  // === mouse:down:before → 右键菜单 ===
  c.on('mouse:down:before', (opt) => {
    const e = opt.e as MouseEvent
    const target = opt.target as (Group & { memoryId?: string }) | undefined

    if (e.button === 2 || e.ctrlKey) {
      wasRightClick = true
      if (target?.memoryId) {
        e.preventDefault?.()
        const m = memoryStore.memories.find(m => m.id === target.memoryId)
        ctxMenu.value = {
          visible: true,
          x: (e as MouseEvent).clientX || 100,
          y: (e as MouseEvent).clientY || 100,
          memoryId: target.memoryId,
          isPinned: m?.is_pinned || false,
        }
      }
      return
    }
  })

  // === mouse:down → 橡皮擦 / 长按 / 选择卡片 / 平移 ===
  c.on('mouse:down', (opt) => {
    const e = opt.e as MouseEvent | TouchEvent
    const target = opt.target as (Group & { memoryId?: string }) | undefined

    // 橡皮擦
    if (drawState.value.tool === 'eraser') {
      handleEraserClick(opt)
      return
    }

    // 绘画模式下不做其他处理
    if (c.isDrawingMode) return

    // 点击了卡片
    if (target?.memoryId) {
      // 记录拖拽起点用于判断是否拖拽过
      target._dragStartPos = { x: target.left ?? 0, y: target.top ?? 0 }
      c.setActiveObject(target)
      c.requestRenderAll()

      // 长按检测（移动端）
      longPressTarget = target.memoryId
      const pos = 'touches' in e
        ? { x: e.touches[0]?.clientX || 0, y: e.touches[0]?.clientY || 0 }
        : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
      longPressTimer = setTimeout(() => {
        if (longPressTarget) {
          wasLongPress = true
          const m = memoryStore.memories.find(m => m.id === longPressTarget)
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

    // 空白区域 → 开始平移
    isPanning = true
    c.defaultCursor = 'grabbing'
    const pos = getPointerPos(e)
    lastPosX = pos.x
    lastPosY = pos.y
  })

  // === mouse:move → 平移画布（非绘画、非拖拽卡片时） ===
  c.on('mouse:move', (opt) => {
    if (!isPanning) return
    const e = opt.e as MouseEvent | TouchEvent
    const pos = getPointerPos(e)
    const vpt = c.viewportTransform
    vpt[4] += pos.x - lastPosX
    vpt[5] += pos.y - lastPosY
    c.requestRenderAll()
    lastPosX = pos.x
    lastPosY = pos.y
  })

  // === mouse:up → 拖拽保存 / 单击 / 双击 ===
  c.on('mouse:up', (opt) => {
    c.defaultCursor = 'grab'

    // 清除长按
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
    longPressTarget = null

    // 平移结束
    if (isPanning) { isPanning = false; return }

    // 长按或右键触发后松手，跳过单击逻辑
    if (wasLongPress) { wasLongPress = false; return }
    if (wasRightClick) { wasRightClick = false; return }

    const target = opt.target as (Group & { memoryId?: string }) | undefined
    const now = Date.now()

    if (target?.memoryId) {
      const objX = target.left ?? 0
      const objY = target.top ?? 0
      const p = target._dragStartPos
      const wasDrag = p && (Math.abs(objX - p.x) > 2 || Math.abs(objY - p.y) > 2)

      if (wasDrag) {
        // 拖拽结束，保存新位置
        const vpt = c.viewportTransform
        const scale = vpt[0]
        memoryStore.updateCanvasPosition(target.memoryId, {
          canvas_x: (objX - vpt[4]) / scale,
          canvas_y: (objY - vpt[5]) / scale,
        })
        target._dragStartPos = null
        return
      }

      // 单击 → 延迟缩放（双击由 mouse:dblclick 处理）
      if (clickTimer) clearTimeout(clickTimer)
      clickTimer = setTimeout(() => {
        toggleCardZoom(target)
      }, 300)
    } else {

    }
  })

  // === 滚轮缩放 ===
  c.on('mouse:wheel', (opt) => {
    const delta = opt.e.deltaY
    let zoom = c.getZoom()
    zoom *= 0.999 ** delta
    zoom = Math.min(3, Math.max(0.3, zoom))
    c.zoomToPoint(opt.pointer, zoom)
    opt.e.preventDefault()
    opt.e.stopPropagation()
  })

  // === 双指缩放（touch:move 替代已废弃的 touch:gesture） ===
  c.on('touch:move', (opt) => {
    const e = opt.e as TouchEvent
    if (e.touches?.length === 2) {
      e.preventDefault()
      isPanning = false
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      if (lastDist > 0) {
        let zoom = c.getZoom() * (dist / lastDist)
        zoom = Math.min(3, Math.max(0.3, zoom))
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
        c.zoomToPoint({ x: cx, y: cy } as any, zoom)
      }
      lastDist = dist
    }
  })

  c.on('touch:end', () => {
    lastDist = 0
  })

  // === 双击 → 编辑卡片 / 创建新回忆 ===
  c.on('mouse:dblclick', (opt) => {
    // 清除单击缩放定时器
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
    const target = opt.target as (Group & { memoryId?: string }) | undefined
    if (target?.memoryId) {

      router.push(`/memory/${target.memoryId}`)
    } else {
      const vpt = c.viewportTransform
      const scale = vpt[0]
      quickCreateX.value = (opt.pointer.x - vpt[4]) / scale
      quickCreateY.value = (opt.pointer.y - vpt[5]) / scale
      showQuickCreate.value = true
    }
  })

  // === 涂鸦保存 ===
  c.on('path:created', () => {
    saveDrawings()
  })

  window.addEventListener('resize', handleResize)
}

function getPointerPos(e: MouseEvent | TouchEvent) {
  if ('touches' in e) {
    const t = e.touches[0] || e.changedTouches[0]
    return { x: t.clientX, y: t.clientY }
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
}

function toggleCardZoom(target: Group) {
  if (!fabricCanvas) return
  const isZoomed = (target as any)._zoomed
  const toScale = isZoomed ? 1 : 1.12
  const duration = 280

  // 置顶显示
  if (!isZoomed) fabricCanvas.bringObjectToFront(target)

  target.animate(
    { scaleX: toScale, scaleY: toScale },
    {
      duration,
      easing: (t: number) => 1 - Math.pow(1 - t, 3), // easeOutCubic
      onChange: () => fabricCanvas?.requestRenderAll(),
      onComplete: () => {
        ;(target as any)._zoomed = !isZoomed
        target.setCoords()
      },
    },
  )
}

function handleResize() {
  if (!fabricCanvas) return
  const headerHeight = 52
  const w = window.innerWidth
  const h = window.innerHeight - headerHeight
  fabricCanvas.setDimensions({ width: w, height: h })
  const container = canvasRef.value?.parentElement
  if (container) {
    container.style.width = w + 'px'
    container.style.height = h + 'px'
  }
}

function renderCards() {
  if (!fabricCanvas) return
  const c = fabricCanvas
  const memories = memoryStore.memories

  // 保留涂鸦路径，只清除卡片
  const paths = c.getObjects().filter((obj) => obj.type === 'path')
  c.clear()
  c.backgroundColor = '#FEFCFB'
  // 重新添加涂鸦
  paths.forEach((p) => c.add(p))

  const gridCols = Math.ceil(Math.sqrt(memories.length))
  const spacing = 300

  memories.forEach((memory, i) => {
    let x = memory.canvas_x
    let y = memory.canvas_y

    if (x == null || y == null || (x === 0 && y === 0)) {
      const col = i % gridCols
      const row = Math.floor(i / gridCols)
      const jitter = hashStr(memory.id)
      x = col * spacing - (gridCols * spacing) / 2 + spacing / 2 + (jitter % 20 - 10)
      y = row * spacing - (gridCols * spacing) / 2 + spacing / 2 + ((jitter >> 4) % 20 - 10)
    }

    createMemoryCard(memory, x, y)
  })

  c.requestRenderAll()
}

const FONT = '"SF Pro Display", "PingFang SC", "Noto Sans SC", sans-serif'

function createMemoryCard(memory: Memory, x: number, y: number) {
  if (!fabricCanvas) return
  const c = fabricCanvas
  const hasImage = !!memory.media?.length
  const W = 240
  const pad = 14
  const coverH = hasImage ? 180 : 0
  const textAreaH = 80
  const H = hasImage ? coverH + textAreaH : textAreaH
  // 所有 Y 坐标以 Group 中心 (0) 为基准
  const topEdge = -H / 2
  const titleY = hasImage ? topEdge + coverH + 18 : -24
  const metaY = titleY + 22
  const tagY = metaY + 20

  const colors = [
    '#F5E6E0', '#FDE8E0', '#E8D5F0', '#D5E8F0',
    '#E0F0D5', '#F0E8D5', '#F0D5D5', '#D5F0E8',
  ]
  const bgColor = memory.bg_color || colors[Math.abs(hashStr(memory.id)) % colors.length]
  const isPinned = memory.is_pinned

  // 背景
  const bg = new Rect({
    width: W,
    height: H,
    rx: 16,
    ry: 16,
    fill: '#FFFFFF',
    originX: 'center',
    originY: 'center',
    shadow: isPinned
      ? '0 6px 28px rgba(232, 160, 191, 0.35)'
      : '0 4px 20px rgba(74, 55, 40, 0.12)',
    stroke: isPinned ? 'rgba(232, 160, 191, 0.5)' : 'rgba(74, 55, 40, 0.06)',
    strokeWidth: isPinned ? 2 : 1,
  })

  // 标题
  const titleText = new Text(memory.title || '未命名', {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT,
    fill: '#4A3728',
    width: W - pad * 2,
    originX: 'center',
    originY: 'center',
    left: 0,
    top: titleY,
  })

  // 日期
  const d = new Date(memory.date)
  const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`
  const metaText = new Text(dateStr, {
    fontSize: 12,
    fontFamily: FONT,
    fill: '#B5A89A',
    originX: 'center',
    originY: 'center',
    left: 0,
    top: metaY,
  })

  // 标签
  const tags = memory.tags?.slice(0, 2) || []
  const tagTexts: Text[] = []
  let tagLeft = -W / 2 + pad
  tags.forEach((tag) => {
    const tt = new Text(`#${tag.tag}`, {
      fontSize: 11,
      fontFamily: FONT,
      fill: '#C4B5A8',
      originX: 'left',
      originY: 'center',
      left: tagLeft,
      top: tagY,
    })
    tagTexts.push(tt)
    tagLeft += (tag.tag.length + 1) * 12 + 10
  })

  const elements: any[] = [bg, titleText, metaText, ...tagTexts]

  // 置顶标记
  if (isPinned) {
    const pinBg = new Rect({
      width: 24,
      height: 24,
      rx: 12,
      ry: 12,
      fill: 'rgba(232, 160, 191, 0.9)',
      originX: 'center',
      originY: 'center',
      left: W / 2 - pad - 12,
      top: topEdge + pad + 12,
      selectable: false,
      evented: false,
    })
    const pinIcon = new Text('♥', {
      fontSize: 13,
      fill: '#FFFFFF',
      originX: 'center',
      originY: 'center',
      left: W / 2 - pad - 12,
      top: topEdge + pad + 13,
      selectable: false,
      evented: false,
    })
    elements.push(pinBg, pinIcon)
  }

  const cardGroup = new Group(elements, {
    left: x,
    top: y,
    originX: 'center',
    originY: 'center',
    hasControls: false,
    hasBorders: false,
    hoverCursor: 'pointer',
    moveCursor: 'grabbing',
    subTargetCheck: false,
    _zoomed: false,
  })
  ;(cardGroup as any).memoryId = memory.id
  c.add(cardGroup)

  // 异步加载封面图
  if (hasImage) {
    const firstMedia = [...memory.media!].sort((a, b) => a.sort_order - b.sort_order)[0]
    if (firstMedia?.url) {
      const imgEl = new Image()
      imgEl.crossOrigin = 'anonymous'
      imgEl.onload = () => {
        if (!fabricCanvas) return
        const img = new FabricImage(imgEl, {
          originX: 'center',
          originY: 'center',
          top: topEdge + coverH / 2,
        })
        const scale = Math.max(W / (img.width || 1), coverH / (img.height || 1))
        img.scaleX = scale
        img.scaleY = scale
        img.clipPath = new Rect({
          width: W,
          height: coverH,
          rx: 16,
          ry: 16,
          originX: 'center',
          originY: 'center',
        })
        cardGroup.insertAt(0, img)
        cardGroup.setCoords()
        c.requestRenderAll()
      }
      imgEl.src = firstMedia.url
    }
  } else {
    // 无图片：显示首字占位
    const emoji = new Text(memory.title?.[0] || '✦', {
      fontSize: 40,
      fontWeight: '600',
      fontFamily: FONT,
      fill: bgColor,
      opacity: 0.5,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
      selectable: false,
      evented: false,
    })
    cardGroup.insertAt(0, emoji)
    cardGroup.setCoords()
    c.requestRenderAll()
  }
}

function hashStr(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return h
}

async function handleLogout() {
  showMenu.value = false
  await auth.logout()
  router.push('/login')
}

// 浮动按钮 → 画布中心创建
function openQuickCreateAtCenter() {
  if (!fabricCanvas) return
  const vpt = fabricCanvas.viewportTransform
  const scale = vpt[0]
  const w = fabricCanvas.getWidth()
  const h = fabricCanvas.getHeight()
  quickCreateX.value = (w / 2 - vpt[4]) / scale
  quickCreateY.value = (h / 2 - vpt[5]) / scale
  showQuickCreate.value = true
}

async function handleQuickCreate(title: string) {
  showQuickCreate.value = false
  try {
    await memoryStore.createMemoryOnCanvas(title, quickCreateX.value, quickCreateY.value)
  } catch (e) {
    console.error('快速创建失败:', e)
  }
}

// 绘图工具切换
function handleToolChange(state: DrawState) {
  drawState.value = state
  const c = fabricCanvas
  if (!c) return

  if (state.tool === 'pen' || state.tool === 'highlighter') {
    c.isDrawingMode = true
    const brush = new PencilBrush(c)
    brush.color = state.tool === 'highlighter'
      ? hexToRgba(state.color, 0.35)
      : state.color
    brush.width = state.tool === 'highlighter' ? state.size * 4 : state.size
    c.freeDrawingBrush = brush
  } else {
    c.isDrawingMode = false
  }

  // 更新光标
  if (state.tool === 'pen' || state.tool === 'highlighter') {
    c.defaultCursor = 'crosshair'
  } else if (state.tool === 'eraser') {
    c.defaultCursor = 'pointer'
  } else {
    c.defaultCursor = 'grab'
  }

  // 清除选中状态，选择模式下允许拖拽卡片
  c.discardActiveObject()
  c.selection = false
  c.forEachObject((obj) => {
    if ((obj as any).memoryId) {
      obj.selectable = state.tool === 'select'
      obj.evented = state.tool === 'select' || state.tool === 'eraser'
    }
  })
}

function hexToRgba(hex: string, alpha: number) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// 橡皮擦：点击删除涂鸦路径
function handleEraserClick(opt: any) {
  if (drawState.value.tool !== 'eraser') return
  const target = opt.target
  if (target && !(target as any).memoryId) {
    fabricCanvas?.remove(target)
    fabricCanvas?.requestRenderAll()
    saveDrawings()
  }
}

// 防抖保存涂鸦
let saveTimer: ReturnType<typeof setTimeout> | null = null
let isSaving = false
let pendingSave = false
function saveDrawings() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveDrawingsToSupabase, 800)
}

async function saveDrawingsToSupabase() {
  if (isSaving) { pendingSave = true; return }
  if (!fabricCanvas || !auth.user?.couple_id) return
  isSaving = true
  const coupleId = auth.user.couple_id
  const paths = fabricCanvas.getObjects().filter((obj) => obj.type === 'path')

  // 先删除旧涂鸦
  await supabase.from('canvas_drawings').delete().eq('couple_id', coupleId)

  // 插入新涂鸦
  if (paths.length > 0) {
    const records = paths.map((p, i) => ({
      couple_id: coupleId,
      path_data: p.toJSON(),
      sort_order: i,
    }))
    await supabase.from('canvas_drawings').insert(records)
  }
  isSaving = false
  // 如果保存期间有新的保存请求，再次执行
  if (pendingSave) {
    pendingSave = false
    saveDrawingsToSupabase()
  }
}

// 恢复涂鸦
async function restoreDrawings() {
  if (!fabricCanvas || !auth.user?.couple_id) return
  const { data, error } = await supabase
    .from('canvas_drawings')
    .select('*')
    .eq('couple_id', auth.user.couple_id)
    .order('sort_order', { ascending: true })

  if (error || !data?.length) return

  for (const drawing of data) {
    try {
      const pd = drawing.path_data
      // 使用 fromObject 从 JSON 恢复 Path
      const path = await Path.fromObject(pd)
      path.set({ selectable: false, evented: false })
      fabricCanvas.add(path)
    } catch (e) {
      console.warn('恢复涂鸦路径失败:', e)
    }
  }
  fabricCanvas.requestRenderAll()
}

// 搜索
function handleSearch(query: string) {
  searchQuery.value = query
  updateCardOpacity()
}

function handleSearchClear() {
  searchQuery.value = ''
  updateCardOpacity()
}

function updateCardOpacity() {
  if (!fabricCanvas) return
  const q = searchQuery.value.toLowerCase()
  fabricCanvas.forEachObject((obj) => {
    if (!(obj as any).memoryId) return
    const m = memoryStore.memories.find(m => m.id === (obj as any).memoryId)
    if (!m) return
    if (!q) {
      obj.opacity = 1
    } else {
      const match =
        m.title?.toLowerCase().includes(q) ||
        m.content?.toLowerCase().includes(q) ||
        m.tags?.some(t => t.tag.toLowerCase().includes(q))
      obj.opacity = match ? 1 : 0.2
    }
  })
  fabricCanvas.requestRenderAll()
}

// 上下文菜单操作
function handleCtxPin() {
  memoryStore.togglePin(ctxMenu.value.memoryId)
  ctxMenu.value.visible = false
  // 置顶状态变化需要重渲染卡片样式
  setTimeout(() => renderCards(), 100)
}

function handleCtxEdit() {
  router.push(`/memory/${ctxMenu.value.memoryId}`)
  ctxMenu.value.visible = false
}

async function handleCtxDelete() {
  if (!confirm('确定删除这条回忆吗？')) return
  try {
    await memoryStore.deleteMemory(ctxMenu.value.memoryId)
    ctxMenu.value.visible = false
  } catch (e) {
    console.error('删除失败:', e)
  }
}

// 监听 memories 增删，重新渲染
watch(() => memoryStore.memories.length, () => {
  if (fabricCanvas) renderCards()
})
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
</style>
