import { shallowRef, onUnmounted, type Ref } from 'vue'
import { Canvas as FabricCanvas } from 'fabric'

const HEADER_HEIGHT = 52

export function useCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  const canvas = shallowRef<FabricCanvas | null>(null)

  function init(options?: Record<string, unknown>): FabricCanvas {
    if (!canvasRef.value) throw new Error('Canvas element not found')

    const w = window.innerWidth
    const h = window.innerHeight - HEADER_HEIGHT

    canvas.value = new FabricCanvas(canvasRef.value, {
      width: w,
      height: h,
      selection: false,
      backgroundColor: '#FEFCFB',
      stopContextMenu: true,
      fireRightClick: true,
      ...options,
    })

    // 定位 Fabric 容器到 header 下方
    const container = canvasRef.value.parentElement
    if (container) {
      container.style.position = 'absolute'
      container.style.top = HEADER_HEIGHT + 'px'
      container.style.left = '0'
      container.style.width = w + 'px'
      container.style.height = h + 'px'
      container.style.pointerEvents = 'auto'
      container.style.zIndex = '1'
    }

    // 画布原点设为视口中心
    canvas.value.setViewportTransform([1, 0, 0, 1, w / 2, h / 2])

    return canvas.value
  }

  function resize() {
    if (!canvas.value || !canvasRef.value) return
    const w = window.innerWidth
    const h = window.innerHeight - HEADER_HEIGHT
    canvas.value.setDimensions({ width: w, height: h })
    const container = canvasRef.value.parentElement
    if (container) {
      container.style.width = w + 'px'
      container.style.height = h + 'px'
    }
  }

  function dispose() {
    window.removeEventListener('resize', resize)
    canvas.value?.dispose()
    canvas.value = null
  }

  function screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    if (!canvas.value) return { x: 0, y: 0 }
    const vpt = canvas.value.viewportTransform
    const scale = vpt[0]
    return {
      x: (screenX - vpt[4]) / scale,
      y: (screenY - vpt[5]) / scale,
    }
  }

  function worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    if (!canvas.value) return { x: 0, y: 0 }
    const vpt = canvas.value.viewportTransform
    const scale = vpt[0]
    return {
      x: worldX * scale + vpt[4],
      y: worldY * scale + vpt[5],
    }
  }

  function getPointerPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0]
      return { x: t.clientX, y: t.clientY }
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
  }

  onUnmounted(() => dispose())

  return { canvas, init, resize, dispose, screenToWorld, worldToScreen, getPointerPos }
}
