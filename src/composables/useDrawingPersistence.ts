import { type Ref, onUnmounted } from 'vue'
import { Canvas as FabricCanvas, Path } from 'fabric'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/stores/auth'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useDrawingPersistence(canvas: Ref<FabricCanvas | null>) {
  const auth = useAuthStore()
  const drawingIdMap = new Map<fabric.Path, string>() // Path 对象 → DB UUID
  let channel: RealtimeChannel | null = null

  async function restore(): Promise<void> {
    const c = canvas.value
    if (!c || !auth.user?.couple_id) return

    const { data, error } = await supabase
      .from('canvas_drawings')
      .select('*')
      .eq('couple_id', auth.user.couple_id)
      .order('sort_order', { ascending: true })

    if (error || !data?.length) return

    for (const drawing of data) {
      try {
        const path = await Path.fromObject(drawing.path_data as any)
        path.set({ selectable: false, evented: false })
        c.add(path)
        drawingIdMap.set(path, drawing.id)
      } catch (e) {
        console.warn('恢复涂鸦路径失败:', e)
      }
    }
    c.requestRenderAll()
  }

  async function savePath(pathJson: any): Promise<string | null> {
    if (!auth.user?.couple_id) return null

    const { data, error } = await supabase
      .from('canvas_drawings')
      .insert({
        couple_id: auth.user.couple_id,
        path_data: pathJson,
        sort_order: drawingIdMap.size,
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('保存涂鸦失败:', error)
      return null
    }
    return data.id
  }

  async function deletePath(drawingId: string): Promise<void> {
    const { error } = await supabase
      .from('canvas_drawings')
      .delete()
      .eq('id', drawingId)

    if (error) {
      console.error('删除涂鸦失败:', error)
    }
  }

  function onPathCreated(path: fabric.Path, drawingId: string) {
    drawingIdMap.set(path, drawingId)
  }

  function onPathErased(path: fabric.Path) {
    const drawingId = drawingIdMap.get(path)
    if (drawingId) {
      deletePath(drawingId)
      drawingIdMap.delete(path)
    }
  }

  function subscribe() {
    if (!auth.user?.couple_id || channel) return
    const coupleId = auth.user.couple_id

    channel = supabase
      .channel('canvas-drawings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_drawings',
          filter: `couple_id=eq.${coupleId}`,
        },
        async (payload) => {
          const c = canvas.value
          if (!c) return

          if (payload.eventType === 'INSERT') {
            // 伴侣新建了涂鸦
            const record = payload.new as any
            try {
              const path = await Path.fromObject(record.path_data)
              path.set({ selectable: false, evented: false })
              // 标记为远程路径，避免 path:created 循环
              ;(path as any)._remote = true
              c.add(path)
              drawingIdMap.set(path, record.id)
              c.requestRenderAll()
            } catch (e) {
              console.warn('同步伴侣涂鸦失败:', e)
            }
          } else if (payload.eventType === 'DELETE') {
            // 伴侣删除了涂鸦
            const deletedId = (payload.old as any).id
            for (const [path, id] of drawingIdMap) {
              if (id === deletedId) {
                c.remove(path)
                drawingIdMap.delete(path)
                c.requestRenderAll()
                break
              }
            }
          }
        },
      )
      .subscribe()
  }

  function unsubscribe() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  onUnmounted(() => unsubscribe())

  return {
    restore,
    savePath,
    deletePath,
    onPathCreated,
    onPathErased,
    subscribe,
    unsubscribe,
    drawingIdMap,
  }
}
