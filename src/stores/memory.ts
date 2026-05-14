import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from './auth'
import { useMediaStore } from './media'
import type { Memory, MemoryFormData, MemoryMedia, MemoryTag } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const useMemoryStore = defineStore('memory', () => {
  const memories = ref<Memory[]>([])
  const loading = ref(false)
  let realtimeChannel: RealtimeChannel | null = null

  // 按日期排序
  const sortedMemories = computed(() =>
    [...memories.value].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateDiff !== 0) return dateDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  )

  // 按月分组（用于时间轴）
  const memoriesByMonth = computed(() => {
    const groups: Record<string, Memory[]> = {}
    for (const m of sortedMemories.value) {
      const key = m.date.slice(0, 7) // YYYY-MM
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    }
    return groups
  })

  // 获取单个回忆（含关联数据）
  async function fetchOne(id: string): Promise<Memory | null> {
    const { data, error } = await supabase
      .from('memories')
      .select('*, media:memory_media(*), tags:memory_tags(*), author:users(*)')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data as Memory
  }

  // 获取所有回忆
  async function fetchMemories() {
    const auth = useAuthStore()
    if (!auth.user?.couple_id) return

    loading.value = true
    const { data, error } = await supabase
      .from('memories')
      .select('*, media:memory_media(*), tags:memory_tags(*), author:users(*)')
      .eq('couple_id', auth.user.couple_id)
      .order('date', { ascending: false })

    if (!error && data) {
      memories.value = data as Memory[]
    }
    loading.value = false
  }

  // 创建回忆
  async function createMemory(
    form: MemoryFormData,
    mediaFiles: File[]
  ): Promise<string> {
    const auth = useAuthStore()
    const mediaStore = useMediaStore()

    if (!auth.user?.couple_id) throw new Error('未登录')

    // 1. 插入回忆记录
    const { data: memory, error } = await supabase
      .from('memories')
      .insert({
        couple_id: auth.user.couple_id,
        author_id: auth.user.id,
        title: form.title,
        content: form.content,
        date: form.date,
        mood: form.mood || null,
        location: form.location || null,
        bg_color: form.bg_color || null,
      })
      .select()
      .single()

    if (error || !memory) throw new Error(`创建失败: ${error?.message}`)

    // 2. 上传图片并插入 media 记录
    if (mediaFiles.length > 0) {
      const mediaRecords: Partial<MemoryMedia>[] = []
      for (let i = 0; i < mediaFiles.length; i++) {
        const url = await mediaStore.uploadImage(mediaFiles[i], auth.user.couple_id)
        mediaRecords.push({
          memory_id: memory.id,
          type: 'image',
          url,
          sort_order: i,
        })
      }
      await supabase.from('memory_media').insert(mediaRecords)
    }

    // 3. 插入标签
    if (form.tags.length > 0) {
      const tagRecords = form.tags.map(tag => ({
        memory_id: memory.id,
        tag,
      }))
      await supabase.from('memory_tags').insert(tagRecords)
    }

    // 4. 刷新本地数据
    const fullMemory = await fetchOne(memory.id)
    if (fullMemory) {
      memories.value.unshift(fullMemory)
    }

    return memory.id
  }

  // 更新回忆
  async function updateMemory(
    id: string,
    form: MemoryFormData,
    newMediaFiles: File[],
    deletedMediaIds: string[],
    newMediaCount: number
  ): Promise<void> {
    const auth = useAuthStore()
    const mediaStore = useMediaStore()

    if (!auth.user?.couple_id) throw new Error('未登录')

    // 1. 更新回忆记录
    const { error } = await supabase
      .from('memories')
      .update({
        title: form.title,
        content: form.content,
        date: form.date,
        mood: form.mood || null,
        location: form.location || null,
        bg_color: form.bg_color || null,
      })
      .eq('id', id)

    if (error) throw new Error(`更新失败: ${error.message}`)

    // 2. 删除已移除的媒体
    if (deletedMediaIds.length > 0) {
      // 先获取要删除的媒体 URL
      const { data: mediaToDelete } = await supabase
        .from('memory_media')
        .select('url')
        .in('id', deletedMediaIds)

      if (mediaToDelete) {
        for (const m of mediaToDelete) {
          await mediaStore.deleteImage(m.url)
        }
      }

      await supabase.from('memory_media').delete().in('id', deletedMediaIds)
    }

    // 3. 上传新图片
    if (newMediaFiles.length > 0) {
      // 获取当前最大 sort_order
      const { data: existingMedia } = await supabase
        .from('memory_media')
        .select('sort_order')
        .eq('memory_id', id)
        .order('sort_order', { ascending: false })
        .limit(1)

      let nextOrder = existingMedia?.[0]?.sort_order != null ? existingMedia[0].sort_order + 1 : 0

      const mediaRecords: Partial<MemoryMedia>[] = []
      for (const file of newMediaFiles) {
        const url = await mediaStore.uploadImage(file, auth.user.couple_id)
        mediaRecords.push({
          memory_id: id,
          type: 'image',
          url,
          sort_order: nextOrder++,
        })
      }
      await supabase.from('memory_media').insert(mediaRecords)
    }

    // 4. 更新标签（先删后插）
    await supabase.from('memory_tags').delete().eq('memory_id', id)
    if (form.tags.length > 0) {
      const tagRecords = form.tags.map(tag => ({
        memory_id: id,
        tag,
      }))
      await supabase.from('memory_tags').insert(tagRecords)
    }

    // 5. 刷新本地数据
    const fullMemory = await fetchOne(id)
    if (fullMemory) {
      const idx = memories.value.findIndex(m => m.id === id)
      if (idx !== -1) {
        memories.value[idx] = fullMemory
      }
    }
  }

  // 删除回忆
  async function deleteMemory(id: string): Promise<void> {
    const mediaStore = useMediaStore()

    // 获取关联的媒体文件
    const { data: media } = await supabase
      .from('memory_media')
      .select('url')
      .eq('memory_id', id)

    // 删除存储中的文件
    if (media) {
      for (const m of media) {
        await mediaStore.deleteImage(m.url)
      }
    }

    // 删除回忆（CASCADE 会处理 media 和 tags）
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`删除失败: ${error.message}`)

    // 从本地移除
    memories.value = memories.value.filter(m => m.id !== id)
  }

  // 订阅 Realtime
  function subscribeRealtime() {
    const auth = useAuthStore()
    if (!auth.user?.couple_id || realtimeChannel) return

    const coupleId = auth.user.couple_id

    realtimeChannel = supabase
      .channel('memories-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memories',
          filter: `couple_id=eq.${coupleId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const full = await fetchOne(payload.new.id)
            if (full) {
              const exists = memories.value.some(m => m.id === full.id)
              if (!exists) memories.value.unshift(full)
            }
          } else if (payload.eventType === 'UPDATE') {
            const full = await fetchOne(payload.new.id)
            if (full) {
              const idx = memories.value.findIndex(m => m.id === full.id)
              if (idx !== -1) memories.value[idx] = full
            }
          } else if (payload.eventType === 'DELETE') {
            memories.value = memories.value.filter(m => m.id !== payload.old.id)
          }
        }
      )
      .subscribe()
  }

  // 取消订阅
  function unsubscribeRealtime() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  return {
    memories,
    loading,
    sortedMemories,
    memoriesByMonth,
    fetchOne,
    fetchMemories,
    createMemory,
    updateMemory,
    deleteMemory,
    subscribeRealtime,
    unsubscribeRealtime,
  }
})
