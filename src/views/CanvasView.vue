<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMemoryStore } from '@/stores/memory'
import { useCategoryStore } from '@/stores/category'
import { useRealtime } from '@/composables/useRealtime'
import MemoryCard from '@/components/MemoryCard.vue'

const router = useRouter()
const auth = useAuthStore()
const memoryStore = useMemoryStore()
const categoryStore = useCategoryStore()

const showMenu = ref(false)

useRealtime()

onMounted(async () => {
  await Promise.all([
    memoryStore.fetchMemories(),
    categoryStore.fetchCategories(),
  ])
})

const displayedMemories = computed(() => memoryStore.sortedMemories)

async function handleLogout() {
  showMenu.value = false
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="canvas-page">
    <!-- 顶部栏 -->
    <header class="canvas-header">
      <h1 class="app-title font-display">Zjin</h1>
      <div class="header-actions">
        <button class="avatar-btn" @click="showMenu = !showMenu">
          <span class="avatar-letter">{{ auth.user?.nickname?.[0] || '👤' }}</span>
        </button>
        <Transition name="fade">
          <div v-if="showMenu" class="user-menu glass" @click.stop>
            <p class="menu-name">{{ auth.user?.nickname }}</p>
            <p class="menu-partner">与 {{ auth.partner?.nickname }} 的空间</p>
            <button class="menu-logout" @click="handleLogout">退出登录</button>
          </div>
        </Transition>
      </div>
    </header>

    <!-- 记忆卡片网格 -->
    <div v-if="displayedMemories.length" class="memory-grid">
      <MemoryCard
        v-for="memory in displayedMemories"
        :key="memory.id"
        :memory="memory"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📷</div>
      <p class="empty-hint">点击下方 + 开始记录</p>
    </div>

    <!-- 遮罩关闭菜单 -->
    <div v-if="showMenu" class="menu-overlay" @click="showMenu = false"></div>
  </div>
</template>

<style scoped>
.canvas-page {
  min-height: 100%;
  padding: 0 1rem 1.5rem;
}

.canvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  position: relative;
}

.app-title {
  font-size: 1.6rem;
  color: var(--color-accent);
  letter-spacing: 0.02em;
}

.header-actions {
  position: relative;
}

.avatar-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-accent);
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s var(--ease-soft);
}

.avatar-btn:active {
  transform: scale(0.9);
}

.avatar-letter {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent);
}

.user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 32px var(--color-shadow);
  z-index: 200;
}

.menu-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.menu-partner {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.15rem;
  margin-bottom: 0.6rem;
}

.menu-logout {
  width: 100%;
  padding: 0.5rem;
  font-size: 0.8rem;
  color: #e74c3c;
  background: none;
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s;
}

.menu-logout:active {
  background: rgba(231, 76, 60, 0.08);
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
}

/* 卡片网格 */
.memory-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
