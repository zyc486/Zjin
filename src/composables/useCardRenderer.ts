import type { Ref } from 'vue'
import { Canvas as FabricCanvas, Rect, Text, Group, FabricImage } from 'fabric'
import type { Memory } from '@/types'

const CARD_W = 240
const PAD = 14
const COVER_H = 180
const TEXT_H = 80
const FONT = '"SF Pro Display", "PingFang SC", "Noto Sans SC", sans-serif'

const CARD_COLORS = [
  '#F5E6E0', '#FDE8E0', '#E8D5F0', '#D5E8F0',
  '#E0F0D5', '#F0E8D5', '#F0D5D5', '#D5F0E8',
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return h
}

export function useCardRenderer(canvas: Ref<FabricCanvas | null>) {
  const cardMap = new Map<string, Group>()
  // 追踪每张卡片的关键属性，用于 diff
  const cardState = new Map<string, { title: string; isPinned: boolean; tags: string }>()

  function syncCards(memories: Memory[]) {
    const c = canvas.value
    if (!c) return

    const currentIds = new Set(memories.map(m => m.id))

    // 删除不存在的卡片
    for (const [id, group] of cardMap) {
      if (!currentIds.has(id)) {
        c.remove(group)
        cardMap.delete(id)
        cardState.delete(id)
      }
    }

    // 添加或更新卡片
    memories.forEach((memory, index) => {
      const existing = cardMap.get(memory.id)
      if (!existing) {
        // 新卡片
        const pos = getDefaultPosition(memory, index, memories.length)
        addCard(memory, pos.x, pos.y)
      } else {
        // 检查是否需要更新
        const prev = cardState.get(memory.id)
        const currentTags = memory.tags?.map(t => t.tag).join(',') || ''
        if (prev && (prev.title !== memory.title || prev.isPinned !== memory.is_pinned || prev.tags !== currentTags)) {
          updateCard(memory)
        }
      }
    })

    c.requestRenderAll()
  }

  function addCard(memory: Memory, x: number, y: number): Group {
    const c = canvas.value!
    const hasImage = !!memory.media?.length
    const H = hasImage ? COVER_H + TEXT_H : TEXT_H
    const topEdge = -H / 2
    const titleY = hasImage ? topEdge + COVER_H + 18 : -24
    const metaY = titleY + 22
    const tagY = metaY + 20

    const bgColor = memory.bg_color || CARD_COLORS[Math.abs(hashStr(memory.id)) % CARD_COLORS.length]
    const isPinned = memory.is_pinned

    const bg = new Rect({
      width: CARD_W,
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

    const titleText = new Text(memory.title || '未命名', {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: FONT,
      fill: '#4A3728',
      width: CARD_W - PAD * 2,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: titleY,
    })

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

    const tags = memory.tags?.slice(0, 2) || []
    const tagTexts: Text[] = []
    let tagLeft = -CARD_W / 2 + PAD
    for (const tag of tags) {
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
    }

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
        left: CARD_W / 2 - PAD - 12,
        top: topEdge + PAD + 12,
        selectable: false,
        evented: false,
      })
      const pinIcon = new Text('♥', {
        fontSize: 13,
        fill: '#FFFFFF',
        originX: 'center',
        originY: 'center',
        left: CARD_W / 2 - PAD - 12,
        top: topEdge + PAD + 13,
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
    cardMap.set(memory.id, cardGroup)
    cardState.set(memory.id, {
      title: memory.title || '',
      isPinned: !!memory.is_pinned,
      tags: memory.tags?.map(t => t.tag).join(',') || '',
    })

    // 异步加载封面图
    if (hasImage) {
      const sortedMedia = [...memory.media!].sort((a, b) => a.sort_order - b.sort_order)
      const firstMedia = sortedMedia[0]
      if (firstMedia?.url) {
        FabricImage.fromURL(firstMedia.url, { crossOrigin: 'anonymous' }).then((img) => {
          if (!canvas.value) return
          // 重建卡片 Group，将图片插入到最底层
          const x = cardGroup.left ?? 0
          const y = cardGroup.top ?? 0
          c.remove(cardGroup)

          img.set({
            originX: 'center',
            originY: 'center',
            top: topEdge + COVER_H / 2,
          })
          const scale = Math.min(CARD_W / (img.width || 1), COVER_H / (img.height || 1))
          img.scaleX = scale
          img.scaleY = scale
          img.clipPath = new Rect({
            width: CARD_W,
            height: COVER_H,
            rx: 16,
            ry: 16,
            originX: 'center',
            originY: 'center',
          })

          const newGroup = new Group([img, ...cardGroup.getObjects()], {
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
          ;(newGroup as any).memoryId = memory.id
          c.add(newGroup)
          cardMap.set(memory.id, newGroup)
          c.requestRenderAll()
        }).catch((err) => {
          console.warn('封面图加载失败:', firstMedia.url, err)
        })
      }
    } else {
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
    }

    return cardGroup
  }

  function removeCard(memoryId: string) {
    const c = canvas.value
    const group = cardMap.get(memoryId)
    if (c && group) {
      c.remove(group)
    }
    cardMap.delete(memoryId)
    cardState.delete(memoryId)
  }

  function updateCard(memory: Memory) {
    const c = canvas.value
    const group = cardMap.get(memory.id)
    if (!c || !group) return

    const objects = group.getObjects()
    const isPinned = memory.is_pinned
    const hasImage = objects.some(o => o instanceof FabricImage)

    // 找到各元素：bg(Rect fill=#FFF)、titleText(Text fontSize=16)、tagTexts(Text fontSize=11 fill=#C4B5A8)、pinBg/pinIcon
    const bg = objects.find(o => o instanceof Rect && (o as Rect).fill === '#FFFFFF') as Rect | undefined
    const titleText = objects.find(o => o instanceof Text && (o as Text).fontSize === 16) as Text | undefined
    const tagTexts = objects.filter(o => o instanceof Text && (o as Text).fontSize === 11 && (o as Text).fill === '#C4B5A8') as Text[]
    const pinBg = objects.find(o => o instanceof Rect && (o as Rect).fill === 'rgba(232, 160, 191, 0.9)') as Rect | undefined
    const pinIcon = objects.find(o => o instanceof Text && (o as Text).text === '♥') as Text | undefined

    // 更新标题
    if (titleText) {
      titleText.text = memory.title || '未命名'
    }

    // 更新背景（置顶样式）
    if (bg) {
      bg.set({
        shadow: isPinned ? '0 6px 28px rgba(232, 160, 191, 0.35)' : '0 4px 20px rgba(74, 55, 40, 0.12)',
        stroke: isPinned ? 'rgba(232, 160, 191, 0.5)' : 'rgba(74, 55, 40, 0.06)',
        strokeWidth: isPinned ? 2 : 1,
      })
    }

    // 更新标签
    const tags = memory.tags?.slice(0, 2) || []
    const H = hasImage ? COVER_H + TEXT_H : TEXT_H
    const tagY = (hasImage ? -H / 2 + COVER_H + 18 : -24) + 22 + 20
    // 移除旧标签
    tagTexts.forEach(t => group.remove(t))
    // 添加新标签
    let tagLeft = -CARD_W / 2 + PAD
    for (const tag of tags) {
      const tt = new Text(`#${tag.tag}`, {
        fontSize: 11,
        fontFamily: FONT,
        fill: '#C4B5A8',
        originX: 'left',
        originY: 'center',
        left: tagLeft,
        top: tagY,
      })
      group.add(tt)
      tagLeft += (tag.tag.length + 1) * 12 + 10
    }

    // 更新置顶标记
    const topEdge = -H / 2
    if (isPinned && !pinBg) {
      // 添加置顶标记
      const newPinBg = new Rect({
        width: 24, height: 24, rx: 12, ry: 12,
        fill: 'rgba(232, 160, 191, 0.9)',
        originX: 'center', originY: 'center',
        left: CARD_W / 2 - PAD - 12, top: topEdge + PAD + 12,
        selectable: false, evented: false,
      })
      const newPinIcon = new Text('♥', {
        fontSize: 13, fill: '#FFFFFF',
        originX: 'center', originY: 'center',
        left: CARD_W / 2 - PAD - 12, top: topEdge + PAD + 13,
        selectable: false, evented: false,
      })
      group.add(newPinBg)
      group.add(newPinIcon)
    } else if (!isPinned && pinBg) {
      group.remove(pinBg)
      if (pinIcon) group.remove(pinIcon)
    }

    cardState.set(memory.id, {
      title: memory.title || '',
      isPinned: !!memory.is_pinned,
      tags: memory.tags?.map(t => t.tag).join(',') || '',
    })

    c.requestRenderAll()
  }

  function moveCard(memoryId: string, x: number, y: number) {
    const group = cardMap.get(memoryId)
    if (!group) return
    group.set({ left: x, top: y })
    group.setCoords()
    canvas.value?.requestRenderAll()
  }

  function animateZoomPulse(memoryId: string) {
    const c = canvas.value
    const target = cardMap.get(memoryId)
    if (!c || !target) return

    const isZoomed = (target as any)._zoomed
    const toScale = isZoomed ? 1 : 1.12
    const duration = 280

    if (!isZoomed) c.bringObjectToFront(target)

    target.animate(
      { scaleX: toScale, scaleY: toScale },
      {
        duration,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        onChange: () => c.requestRenderAll(),
        onComplete: () => {
          ;(target as any)._zoomed = !isZoomed
          target.setCoords()
        },
      },
    )
  }

  function filterBySearch(query: string, memories: Memory[]) {
    const c = canvas.value
    if (!c) return
    const q = query.toLowerCase()

    c.forEachObject((obj) => {
      const memoryId = (obj as any).memoryId
      if (!memoryId) return
      const m = memories.find(mem => mem.id === memoryId)
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
    c.requestRenderAll()
  }

  function getMemoryId(obj: any): string | null {
    return obj?.memoryId || null
  }

  function getDefaultPosition(memory: Memory, index: number, total: number): { x: number; y: number } {
    if (memory.canvas_x != null && memory.canvas_y != null && !(memory.canvas_x === 0 && memory.canvas_y === 0)) {
      return { x: memory.canvas_x, y: memory.canvas_y }
    }

    const gridCols = Math.ceil(Math.sqrt(total))
    const spacing = 300
    const col = index % gridCols
    const row = Math.floor(index / gridCols)
    const jitter = hashStr(memory.id)

    return {
      x: col * spacing - (gridCols * spacing) / 2 + spacing / 2 + (jitter % 20 - 10),
      y: row * spacing - (gridCols * spacing) / 2 + spacing / 2 + ((jitter >> 4) % 20 - 10),
    }
  }

  return {
    cardMap,
    syncCards,
    addCard,
    removeCard,
    updateCard,
    moveCard,
    animateZoomPulse,
    filterBySearch,
    getMemoryId,
  }
}
