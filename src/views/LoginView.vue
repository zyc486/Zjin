<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const selectedAccount = ref<number | null>(null)
const password = ref('')
const loading = ref(false)
const error = ref('')

const accounts = [
  { id: 1, label: '👦', name: '我的账号' },
  { id: 2, label: '👧', name: 'TA 的账号' },
]

function selectAccount(id: number) {
  selectedAccount.value = id
  password.value = ''
  error.value = ''
}

async function handleLogin() {
  if (!selectedAccount.value || !password.value) {
    error.value = '请输入密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // 根据选择的账号确定邮箱
    const email = selectedAccount.value === 1
      ? 'user1@zjin.app'
      : 'user2@zjin.app'

    await auth.login(email, password.value)
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

    <!-- 选择账号 -->
    <div class="account-picker">
      <button
        v-for="acc in accounts"
        :key="acc.id"
        class="account-btn"
        :class="{ active: selectedAccount === acc.id }"
        @click="selectAccount(acc.id)"
      >
        <span class="account-avatar">{{ acc.label }}</span>
        <span class="account-name">{{ acc.name }}</span>
      </button>
    </div>

    <!-- 输入密码 -->
    <form v-if="selectedAccount" class="login-form" @submit.prevent="handleLogin">
      <div class="form-group">
        <input
          v-model="password"
          type="password"
          class="input"
          placeholder="输入密码"
          autocomplete="current-password"
          autofocus
        />
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '登录中...' : '进入空间' }}
      </button>
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

.account-picker {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.account-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem 2rem;
  cursor: pointer;
  transition: all 0.3s var(--ease-soft);
  min-width: 120px;
}

.account-btn:active {
  transform: scale(0.96);
}

.account-btn.active {
  border-color: var(--color-accent);
  background: rgba(232, 160, 191, 0.08);
  box-shadow: 0 4px 20px rgba(232, 160, 191, 0.2);
}

.account-avatar {
  font-size: 2.5rem;
}

.account-name {
  font-size: 0.85rem;
  color: var(--color-text-light);
  font-weight: 500;
}

.login-form {
  width: 100%;
  max-width: 320px;
  animation: slideUp 0.3s var(--ease-soft);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
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
</style>
