<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = '请填写邮箱和密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-header">
      <div class="logo">💕</div>
      <h1 class="title font-display">Zjin</h1>
      <p class="subtitle">属于我们的回忆空间</p>
    </div>

    <form class="login-form" @submit.prevent="handleLogin">
      <div class="form-group">
        <input
          v-model="email"
          type="email"
          class="input"
          placeholder="邮箱"
          autocomplete="email"
        />
      </div>

      <div class="form-group">
        <input
          v-model="password"
          type="password"
          class="input"
          placeholder="密码"
          autocomplete="current-password"
        />
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>

      <div class="links">
        <router-link to="/register" class="link">还没有账号？注册</router-link>
      </div>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-primary-light) 100%);
}

.login-header {
  text-align: center;
  margin-bottom: 3rem;
}

.logo {
  font-size: 4rem;
  margin-bottom: 0.5rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.title {
  font-size: 2.5rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 0.95rem;
  color: var(--color-text-light);
}

.login-form {
  width: 100%;
  max-width: 360px;
}

.form-group {
  margin-bottom: 1rem;
}

.error-text {
  color: #E87461;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  text-align: center;
}

.w-full {
  width: 100%;
}

.links {
  text-align: center;
  margin-top: 1.5rem;
}

.link {
  color: var(--color-text-light);
  font-size: 0.9rem;
  text-decoration: none;
  transition: color 0.3s;
}

.link:hover {
  color: var(--color-accent);
}
</style>
