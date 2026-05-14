import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/accept-invite',
      name: 'accept-invite',
      component: () => import('@/views/AcceptInviteView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'canvas',
      component: () => import('@/views/CanvasView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/timeline',
      name: 'timeline',
      component: () => import('@/views/TimelineView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/memory/new',
      name: 'memory-new',
      component: () => import('@/views/MemoryFormView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/memory/:id',
      name: 'memory-edit',
      component: () => import('@/views/MemoryFormView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// 路由守卫
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // 等待初始化完成
  if (auth.loading) {
    await new Promise<void>((resolve) => {
      const unwatch = setInterval(() => {
        if (!auth.loading) {
          clearInterval(unwatch)
          resolve()
        }
      }, 50)
    })
  }

  // 需要登录但未登录 → 跳转登录页
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }

  // 已登录但没有情侣空间 → 跳转邀请页
  if (to.meta.requiresAuth && auth.isLoggedIn && !auth.hasCouple) {
    return { name: 'accept-invite' }
  }

  // 已登录访问登录页 → 跳转首页
  if (!to.meta.requiresAuth && auth.isLoggedIn && (to.name === 'login' || to.name === 'register')) {
    return { name: 'canvas' }
  }
})

export default router
