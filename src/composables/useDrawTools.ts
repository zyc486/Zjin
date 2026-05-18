import { ref, type Ref } from 'vue'
import { Canvas as FabricCanvas, PencilBrush } from 'fabric'
import type { DrawState, DrawTool } from '@/types'

export function useDrawTools(
  canvas: Ref<FabricCanvas | null>,
  onPathCreated: (path: fabric.Path) => void,
  onPathErased: (path: fabric.Path) => void,
) {
  const drawState = ref<DrawState>({ tool: 'select', color: '#4A3728', size: 3 })

  let pathCreatedHandler: ((opt: any) => void) | null = null

  function setTool(tool: DrawTool) {
    drawState.value.tool = tool
    applyToolState()
  }

  function setColor(color: string) {
    drawState.value.color = color
    applyToolState()
  }

  function setSize(size: number) {
    drawState.value.size = size
    applyToolState()
  }

  function updateState(state: DrawState) {
    drawState.value = state
    applyToolState()
  }

  function applyToolState() {
    const c = canvas.value
    if (!c) return
    const { tool, color, size } = drawState.value

    // 移除旧的 path:created 监听
    if (pathCreatedHandler) {
      c.off('path:created', pathCreatedHandler)
      pathCreatedHandler = null
    }

    if (tool === 'pen' || tool === 'highlighter') {
      c.isDrawingMode = true
      const brush = new PencilBrush(c)
      brush.color = tool === 'highlighter' ? hexToRgba(color, 0.35) : color
      brush.width = tool === 'highlighter' ? size * 4 : size
      c.freeDrawingBrush = brush

      // 监听新路径创建
      pathCreatedHandler = (opt: any) => {
        if (opt.path) {
          opt.path.set({ selectable: false, evented: false })
          onPathCreated(opt.path)
        }
      }
      c.on('path:created', pathCreatedHandler)
    } else {
      c.isDrawingMode = false
    }

    // 更新光标
    if (tool === 'pen' || tool === 'highlighter') {
      c.defaultCursor = 'crosshair'
    } else if (tool === 'eraser') {
      c.defaultCursor = 'pointer'
    } else {
      c.defaultCursor = 'grab'
    }

    // 清除选中状态，更新对象可交互性
    c.discardActiveObject()
    c.selection = false
    c.forEachObject((obj) => {
      const isMemory = !!(obj as any).memoryId
      if (isMemory) {
        obj.selectable = tool === 'select'
        obj.evented = tool === 'select' || tool === 'eraser'
      } else {
        // 涂鸦路径：橡皮擦模式下可点击
        obj.selectable = false
        obj.evented = tool === 'eraser'
      }
    })

    c.requestRenderAll()
  }

  function handleCanvasClick(opt: any): boolean {
    if (drawState.value.tool !== 'eraser') return false
    const target = opt.target
    if (target && !(target as any).memoryId) {
      canvas.value?.remove(target)
      canvas.value?.requestRenderAll()
      onPathErased(target)
      return true
    }
    return false
  }

  function hexToRgba(hex: string, alpha: number): string {
    let h = hex.replace('#', '')
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  function resetToSelect() {
    setTool('select')
  }

  return {
    drawState,
    setTool,
    setColor,
    setSize,
    updateState,
    applyToolState,
    handleCanvasClick,
    resetToSelect,
  }
}
