import { ref, onMounted, onUnmounted } from 'vue'
import type { CanvasOperation, CanvasOperationType } from '@/types'

type OperationHandler = (op: CanvasOperation) => Promise<void>

const MAX_STACK_SIZE = 50

export function useHistory() {
  const undoStack = ref<CanvasOperation[]>([])
  const redoStack = ref<CanvasOperation[]>([])
  const canUndo = ref(false)
  const canRedo = ref(false)

  const undoHandlers = new Map<CanvasOperationType, OperationHandler>()
  const redoHandlers = new Map<CanvasOperationType, OperationHandler>()

  function registerHandler(
    type: CanvasOperationType,
    undoFn: OperationHandler,
    redoFn: OperationHandler,
  ) {
    undoHandlers.set(type, undoFn)
    redoHandlers.set(type, redoFn)
  }

  function push(op: CanvasOperation) {
    undoStack.value.push(op)
    if (undoStack.value.length > MAX_STACK_SIZE) {
      undoStack.value.shift()
    }
    // 新操作清空重做栈
    redoStack.value = []
    updateFlags()
  }

  async function undo() {
    const op = undoStack.value.pop()
    if (!op) return

    const handler = undoHandlers.get(op.type)
    if (handler) {
      await handler(op)
    }

    redoStack.value.push(op)
    updateFlags()
  }

  async function redo() {
    const op = redoStack.value.pop()
    if (!op) return

    const handler = redoHandlers.get(op.type)
    if (handler) {
      await handler(op)
    }

    undoStack.value.push(op)
    updateFlags()
  }

  function clear() {
    undoStack.value = []
    redoStack.value = []
    updateFlags()
  }

  function updateFlags() {
    canUndo.value = undoStack.value.length > 0
    canRedo.value = redoStack.value.length > 0
  }

  function handleKeydown(e: KeyboardEvent) {
    const isMod = e.ctrlKey || e.metaKey
    if (!isMod) return

    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault()
      redo()
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

  return {
    push,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    registerHandler,
  }
}
