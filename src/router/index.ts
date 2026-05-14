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
  ],
})

// 路由守卫
router.beforeEach(async (to) => {
  const auth = useAuthStore()

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

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }

  if (!to.meta.requiresAuth && auth.isLoggedIn && to.name === 'login') {
    return { name: 'canvas' }
  }
})

export default router
