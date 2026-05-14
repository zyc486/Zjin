<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const tabs = [
  { name: 'canvas', path: '/', icon: 'canvas', label: '画布' },
  { name: 'timeline', path: '/timeline', icon: 'timeline', label: '时间轴' },
  { name: 'memory-new', path: '/memory/new', icon: 'add', label: '' },
  { name: 'stats', path: '/stats', icon: 'stats', label: '统计' },
  { name: 'settings', path: '/settings', icon: 'settings', label: '设置' },
]

const activeTab = computed(() => route.name as string)

function navigateTo(tab: typeof tabs[0]) {
  router.push(tab.path)
}
</script>

<template>
  <div class="app-layout">
    <!-- 页面内容 -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 底部导航栏 -->
    <nav class="bottom-nav glass safe-bottom">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="nav-item"
        :class="{ active: activeTab === tab.name, 'nav-add': tab.name === 'memory-new' }"
        @click="navigateTo(tab)"
      >
        <!-- 画布图标 -->
        <svg v-if="tab.icon === 'canvas'" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>

        <!-- 时间轴图标 -->
        <svg v-if="tab.icon === 'timeline'" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="12" y1="2" x2="12" y2="22" />
          <circle cx="12" cy="6" r="2" fill="currentColor" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <circle cx="12" cy="18" r="2" fill="currentColor" />
          <line x1="14" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="10" y2="12" />
          <line x1="14" y1="18" x2="20" y2="18" />
        </svg>

        <!-- 添加图标（中间大按钮） -->
        <svg v-if="tab.icon === 'add'" class="nav-icon-add" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>

        <!-- 统计图标 -->
        <svg v-if="tab.icon === 'stats'" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="12" width="4" height="9" rx="1" />
          <rect x="10" y="6" width="4" height="15" rx="1" />
          <rect x="17" y="3" width="4" height="18" rx="1" />
        </svg>

        <!-- 设置图标 -->
        <svg v-if="tab.icon === 'settings'" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>

        <span v-if="tab.label" class="nav-label">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.app-main {
  flex: 1;
  overflow-y: auto;
  padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(70px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  padding-top: 8px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 100;
  background: rgba(254, 252, 251, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--color-border);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  color: var(--color-text-muted);
  transition: all 0.3s var(--ease-soft);
  -webkit-tap-highlight-color: transparent;
}

.nav-item.active {
  color: var(--color-accent);
}

.nav-item:active {
  transform: scale(0.92);
}

.nav-icon {
  width: 22px;
  height: 22px;
}

.nav-label {
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* 中间添加按钮 */
.nav-add {
  position: relative;
  margin-top: -20px;
}

.nav-add .nav-icon-add {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-warm) 100%);
  color: white;
  border-radius: 50%;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(232, 160, 191, 0.4);
  transition: all 0.3s var(--ease-soft);
}

.nav-add:active .nav-icon-add {
  transform: scale(0.9);
  box-shadow: 0 2px 8px rgba(232, 160, 191, 0.3);
}
</style>
