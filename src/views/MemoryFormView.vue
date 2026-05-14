<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores/memory'
import { useCategoryStore } from '@/stores/category'
import { useMediaStore } from '@/stores/media'
import { useAuthStore } from '@/stores/auth'
import type { MemoryFormData } from '@/types'

const route = useRoute()
const router = useRouter()
const memoryStore = useMemoryStore()
const categoryStore = useCategoryStore()
const mediaStore = useMediaStore()
const authStore = useAuthStore()

const isEditMode = computed(() => route.name === 'memory-edit')
const memoryId = computed(() => route.params.id as string)

const form = ref<MemoryFormData>({
  title: '',
  content: '',
  date: new Date().toISOString().split('T')[0],
  mood: '',
  location: '',
  bg_color: '',
  category_id: '',
  tags: [],
})

interface MediaItem {
  id?: string
  file?: File
  url: string
  isNew: boolean
}

const mediaItems = ref<MediaItem[]>([])
const deletedMediaIds = ref<string[]>([])
const newTagInput = ref('')
const saving = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await categoryStore.fetchCategories()

  if (isEditMode.value && memoryId.value) {
    const memory = await memoryStore.fetchOne(memoryId.value)
    if (memory) {
      form.value.title = memory.title
      form.value.content = memory.content
      form.value.date = memory.date
      form.value.mood = memory.mood || ''
      form.value.location = memory.location || ''
      form.value.bg_color = memory.bg_color || ''
      form.value.tags = (memory.tags || []).map(t => t.tag)

      mediaItems.value = (memory.media || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(m => ({
          id: m.id,
          url: m.url,
          isNew: false,
        }))
    }
  }
})

// 图片选择
function triggerFileInput() {
  fileInput.value?.click()
}

async function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const coupleId = authStore.user?.couple_id
  if (!coupleId) return

  for (const file of Array.from(input.files)) {
    try {
      // 压缩后预览
      const compressed = await mediaStore.compressImage(file)
      const previewUrl = URL.createObjectURL(compressed)
      mediaItems.value.push({
        file: compressed,
        url: previewUrl,
        isNew: true,
      })
    } catch (e) {
      console.error('Image processing error:', e)
    }
  }

  // 重置 input
  input.value = ''
}

function removeMedia(index: number) {
  const item = mediaItems.value[index]
  if (item.id) {
    deletedMediaIds.value.push(item.id)
  }
  if (item.isNew && item.url.startsWith('blob:')) {
    URL.revokeObjectURL(item.url)
  }
  mediaItems.value.splice(index, 1)
}

function moveMedia(index: number, direction: -1 | 1) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= mediaItems.value.length) return
  const temp = mediaItems.value[index]
  mediaItems.value[index] = mediaItems.value[newIndex]
  mediaItems.value[newIndex] = temp
}

// 标签
function addTag() {
  const tag = newTagInput.value.trim()
  if (!tag) return
  if (form.value.tags.includes(tag)) {
    newTagInput.value = ''
    return
  }
  form.value.tags.push(tag)
  newTagInput.value = ''
}

function removeTag(index: number) {
  form.value.tags.splice(index, 1)
}

// 保存
async function handleSave() {
  if (!form.value.title.trim() && !form.value.content.trim()) {
    alert('请填写标题或内容')
    return
  }

  saving.value = true
  try {
    const newFiles = mediaItems.value.filter(m => m.isNew && m.file).map(m => m.file!)

    if (isEditMode.value) {
      await memoryStore.updateMemory(
        memoryId.value,
        form.value,
        newFiles,
        deletedMediaIds.value,
        newFiles.length
      )
    } else {
      await memoryStore.createMemory(form.value, newFiles)
    }

    router.push('/')
  } catch (e: any) {
    alert(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// 删除
async function handleDelete() {
  if (!confirm('确定要删除这条回忆吗？')) return

  try {
    await memoryStore.deleteMemory(memoryId.value)
    router.push('/')
  } catch (e: any) {
    alert(e.message || '删除失败')
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="memory-form-page">
    <!-- 顶部栏 -->
    <header class="form-header">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="form-title">{{ isEditMode ? '编辑回忆' : '新建回忆' }}</h1>
      <button v-if="isEditMode" class="delete-btn" @click="handleDelete">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
      <div v-else class="header-spacer"></div>
    </header>

    <!-- 表单内容 -->
    <div class="form-body">
      <!-- 标题 -->
      <input
        v-model="form.title"
        class="title-input"
        placeholder="给这段回忆起个名字"
        maxlength="200"
      />

      <!-- 日期 -->
      <div class="form-row">
        <label class="form-label">日期</label>
        <input v-model="form.date" type="date" class="input date-input" />
      </div>

      <!-- 分类 -->
      <div class="form-row">
        <label class="form-label">分类</label>
        <div class="category-chips">
          <button
            v-for="cat in categoryStore.categories"
            :key="cat.id"
            class="cat-chip"
            :class="{ active: form.category_id === cat.id }"
            :style="form.category_id === cat.id ? { background: cat.color, borderColor: cat.color } : {}"
            @click="form.category_id = form.category_id === cat.id ? '' : cat.id"
          >
            {{ cat.icon }} {{ cat.name }}
          </button>
        </div>
      </div>

      <!-- 内容 -->
      <textarea
        v-model="form.content"
        class="content-textarea"
        placeholder="记录下这个瞬间..."
        rows="5"
      ></textarea>

      <!-- 图片 -->
      <div class="form-section">
        <label class="form-label">图片</label>
        <div class="media-grid">
          <div
            v-for="(item, index) in mediaItems"
            :key="index"
            class="media-item"
          >
            <img :src="item.url" class="media-thumb" />
            <div class="media-actions">
              <button v-if="index > 0" class="media-btn" @click="moveMedia(index, -1)">‹</button>
              <button v-if="index < mediaItems.length - 1" class="media-btn" @click="moveMedia(index, 1)">›</button>
              <button class="media-btn media-btn-del" @click="removeMedia(index)">✕</button>
            </div>
          </div>
          <!-- 添加按钮 -->
          <button class="media-add" @click="triggerFileInput">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          @change="onFileSelect"
        />
      </div>

      <!-- 标签 -->
      <div class="form-section">
        <label class="form-label">标签</label>
        <div class="tags-area">
          <span v-for="(tag, index) in form.tags" :key="index" class="tag-item">
            {{ tag }}
            <button class="tag-remove" @click="removeTag(index)">✕</button>
          </span>
          <input
            v-model="newTagInput"
            class="tag-input"
            placeholder="添加标签"
            @keydown.enter.prevent="addTag"
          />
        </div>
      </div>

      <!-- 心情 -->
      <div class="form-row">
        <label class="form-label">心情</label>
        <input v-model="form.mood" class="input" placeholder="开心、感动、平静..." maxlength="20" />
      </div>

      <!-- 位置 -->
      <div class="form-row">
        <label class="form-label">地点</label>
        <input v-model="form.location" class="input" placeholder="在哪里..." maxlength="200" />
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="form-footer">
      <button class="btn-primary save-btn" :disabled="saving" @click="handleSave">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.memory-form-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  position: sticky;
  top: 0;
  background: var(--color-bg);
  z-index: 10;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text);
  border-radius: 50%;
  transition: background 0.2s;
}

.back-btn:active {
  background: var(--color-border-light);
}

.form-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.delete-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #e74c3c;
  border-radius: 50%;
  transition: background 0.2s;
}

.delete-btn:active {
  background: rgba(231, 76, 60, 0.08);
}

.header-spacer {
  width: 36px;
}

.form-body {
  flex: 1;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.title-input {
  width: 100%;
  font-size: 1.2rem;
  font-weight: 600;
  border: none;
  background: none;
  color: var(--color-text);
  padding: 0.5rem 0;
  outline: none;
  border-bottom: 2px solid var(--color-border);
  transition: border-color 0.3s;
}

.title-input:focus {
  border-bottom-color: var(--color-accent);
}

.title-input::placeholder {
  color: var(--color-text-muted);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-light);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-input {
  font-size: 0.85rem;
}

.category-chips {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-chips::-webkit-scrollbar {
  display: none;
}

.cat-chip {
  flex-shrink: 0;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-light);
  cursor: pointer;
  transition: all 0.2s var(--ease-soft);
  white-space: nowrap;
}

.cat-chip.active {
  color: white;
  border-color: transparent;
}

.content-textarea {
  width: 100%;
  font-size: 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  background: var(--color-bg-card);
  color: var(--color-text);
  resize: vertical;
  outline: none;
  font-family: inherit;
  transition: border-color 0.3s;
  min-height: 120px;
}

.content-textarea:focus {
  border-color: var(--color-accent);
}

.content-textarea::placeholder {
  color: var(--color-text-muted);
}

/* 图片网格 */
.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.media-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.media-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-actions {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.media-item:hover .media-actions {
  opacity: 1;
}

/* 移动端始终显示 */
@media (hover: none) {
  .media-actions {
    opacity: 1;
  }
}

.media-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-btn-del {
  background: rgba(231, 76, 60, 0.9);
  color: white;
}

.media-add {
  aspect-ratio: 1;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, color 0.2s;
}

.media-add:active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* 标签 */
.tags-area {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  background: var(--color-primary);
  color: var(--color-text-light);
  border-radius: var(--radius-full);
}

.tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 0.65rem;
  padding: 0;
  line-height: 1;
}

.tag-input {
  border: none;
  background: none;
  outline: none;
  font-size: 0.8rem;
  color: var(--color-text);
  min-width: 80px;
  padding: 0.25rem 0;
}

.tag-input::placeholder {
  color: var(--color-text-muted);
}

/* 底部保存 */
.form-footer {
  padding: 1rem;
  position: sticky;
  bottom: 0;
  background: var(--color-bg);
}

.save-btn {
  width: 100%;
  padding: 0.85rem;
  font-size: 0.95rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
