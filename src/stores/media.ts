import { defineStore } from 'pinia'
import { supabase } from '@/composables/useSupabase'

const BUCKET_NAME = 'memory-media'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const useMediaStore = defineStore('media', () => {

  // 压缩图片（客户端 canvas 缩放）
  async function compressImage(file: File, maxWidth = 1920): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)

        // 如果图片宽度小于 maxWidth，不压缩
        if (img.width <= maxWidth) {
          resolve(file)
          return
        }

        const canvas = document.createElement('canvas')
        const ratio = maxWidth / img.width
        canvas.width = maxWidth
        canvas.height = img.height * ratio

        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressed = new File([blob], file.name, { type: 'image/jpeg' })
              resolve(compressed)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.85
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(file)
      }

      img.src = url
    })
  }

  // 上传图片到 Supabase Storage
  async function uploadImage(file: File, coupleId: string): Promise<string> {
    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('不支持的图片格式，请使用 JPG、PNG、WebP 或 GIF')
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('图片大小不能超过 5MB')
    }

    // 压缩图片
    const compressed = await compressImage(file)

    // 生成存储路径
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const path = `${coupleId}/${filename}`

    // 上传到 Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, compressed, {
        contentType: compressed.type,
        upsert: false,
      })

    if (error) {
      throw new Error(`上传失败: ${error.message}`)
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    return urlData.publicUrl
  }

  // 从 Supabase Storage 删除图片
  async function deleteImage(url: string): Promise<void> {
    // 从 URL 中提取存储路径
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`)
    if (pathParts.length < 2) return

    const path = pathParts[1]

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('Delete image error:', error)
    }
  }

  return { uploadImage, deleteImage, compressImage }
})
