export interface User {
  id: string
  nickname: string
  avatar_url: string | null
  couple_id: string | null
  created_at: string
}

export interface Couple {
  id: string
  invite_code: string
  couple_name: string
  created_at: string
}

export interface Category {
  id: string
  couple_id: string
  name: string
  icon: string
  color: string
  sort_order: number
}

export interface Memory {
  id: string
  couple_id: string
  author_id: string
  title: string
  content: string
  date: string
  mood: string | null
  location: string | null
  location_lat: number | null
  location_lng: number | null
  bg_color: string | null
  card_style: string | null
  canvas_x: number | null
  canvas_y: number | null
  canvas_width: number
  canvas_height: number
  canvas_rotation: number
  canvas_z: number
  is_pinned: boolean
  created_at: string
  updated_at: string
  // 关联数据
  media?: MemoryMedia[]
  tags?: MemoryTag[]
  author?: User
}

export interface MemoryMedia {
  id: string
  memory_id: string
  type: 'image' | 'video' | 'audio'
  url: string
  thumbnail: string | null
  sort_order: number
  created_at: string
}

export interface MemoryTag {
  id: string
  memory_id: string
  tag: string
}

export type DrawTool = 'select' | 'pen' | 'highlighter' | 'eraser'

export interface DrawState {
  tool: DrawTool
  color: string
  size: number
}

export interface CanvasDrawing {
  id: string
  couple_id: string
  path_data: any
  sort_order: number
  created_at: string
}

export interface MemoryFormData {
  title: string
  content: string
  date: string
  mood: string
  location: string
  bg_color: string
  category_id: string
  tags: string[]
}
