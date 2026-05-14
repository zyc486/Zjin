import type { Ref } from 'vue'
import { Canvas as FabricCanvas } from 'fabric'

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3.0

export function usePanZoom(canvas: Ref<FabricCanvas | null>) {
  let isPanning = false
  let lastPosX = 0
  let lastPosY = 0
  let lastPinchDist = 0
  let active = false

  // 事件处理器引用（用于移除）
  let onMouseDown: ((opt: fabric.IEvent<MouseEvent>) => void) | null = null
  let onMouseMove: ((opt: fabric.IEvent<MouseEvent>) => void) | null = null
  let onMouseUp: ((opt: fabric.IEvent<MouseEvent>) => void) | null = null
  let onMouseWheel: ((opt: fabric.IEvent<WheelEvent>) => void) | null = null
  let onTouchMove: ((opt: fabric.IEvent<TouchEvent>) => void) | null = null
  let onTouchEnd: (() => void) | null = null

  function getPointerPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0]
      return { x: t.clientX, y: t.clientY }
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
  }

  function activate() {
    const c = canvas.value
    if (!c || active) return
    active = true

    // 鼠标按下 → 开始平移（仅空白区域）
    onMouseDown = (opt) => {
      const target = opt.target
      if (target) return // 点击了对象，不平移
      isPanning = true
      c.defaultCursor = 'grabbing'
      const pos = getPointerPos(opt.e as MouseEvent)
      lastPosX = pos.x
      lastPosY = pos.y
    }

    // 鼠标移动 → 平移视口
    onMouseMove = (opt) => {
      if (!isPanning) return
      const pos = getPointerPos(opt.e as MouseEvent)
      const vpt = c.viewportTransform
      vpt[4] += pos.x - lastPosX
      vpt[5] += pos.y - lastPosY
      c.requestRenderAll()
      lastPosX = pos.x
      lastPosY = pos.y
    }

    // 鼠标松开 → 结束平移
    onMouseUp = () => {
      if (isPanning) {
        isPanning = false
        c.defaultCursor = 'grab'
      }
    }

    // 滚轮缩放
    onMouseWheel = (opt) => {
      const delta = opt.e.deltaY
      let zoom = c.getZoom()
      zoom *= 0.999 ** delta
      zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
      c.zoomToPoint(opt.pointer, zoom)
      opt.e.preventDefault()
      opt.e.stopPropagation()
    }

    // 双指缩放
    onTouchMove = (opt) => {
      const e = opt.e as TouchEvent
      if (e.touches?.length === 2) {
        e.preventDefault()
        isPanning = false
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        if (lastPinchDist > 0) {
          let zoom = c.getZoom() * (dist / lastPinchDist)
          zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
          c.zoomToPoint({ x: cx, y: cy } as any, zoom)
        }
        lastPinchDist = dist
      }
    }

    onTouchEnd = () => {
      lastPinchDist = 0
    }

    c.on('mouse:down', onMouseDown)
    c.on('mouse:move', onMouseMove)
    c.on('mouse:up', onMouseUp)
    c.on('mouse:wheel', onMouseWheel)
    c.on('touch:move', onTouchMove)
    c.on('touch:end', onTouchEnd)

    c.defaultCursor = 'grab'
  }

  function deactivate() {
    const c = canvas.value
    if (!c || !active) return
    active = false

    if (onMouseDown) c.off('mouse:down', onMouseDown)
    if (onMouseMove) c.off('mouse:move', onMouseMove)
    if (onMouseUp) c.off('mouse:up', onMouseUp)
    if (onMouseWheel) c.off('mouse:wheel', onMouseWheel)
    if (onTouchMove) c.off('touch:move', onTouchMove)
    if (onTouchEnd) c.off('touch:end', onTouchEnd)

    onMouseDown = onMouseMove = onMouseUp = onMouseWheel = onTouchMove = onTouchEnd = null
    isPanning = false
  }

  function getZoom(): number {
    return canvas.value?.getZoom() ?? 1
  }

  function setZoom(zoom: number, point?: { x: number; y: number }) {
    const c = canvas.value
    if (!c) return
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
    if (point) {
      c.zoomToPoint(point as any, zoom)
    } else {
      c.setZoom(zoom)
    }
  }

  function resetViewport() {
    const c = canvas.value
    if (!c) return
    const w = c.getWidth()
    const h = c.getHeight()
    c.setViewportTransform([1, 0, 0, 1, w / 2, h / 2])
    c.requestRenderAll()
  }

  return {
    activate,
    deactivate,
    getZoom,
    setZoom,
    resetViewport,
    get isPanning() { return isPanning },
  }
}
