<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const nickname = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const inviteCode = ref('')

async function handleRegister() {
  if (!nickname.value || !email.value || !password.value) {
    error.value = '请填写所有信息'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码至少6位'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await auth.register(email.value, password.value, nickname.value)
    inviteCode.value = result.inviteCode
  } catch (e: any) {
    error.value = e.message || '注册失败'
  } finally {
    loading.value = false
  }
}

function goToApp() {
  router.push('/')
}

function copyCode() {
  navigator.clipboard.writeText(inviteCode.value)
}
</script>

<template>
  <div class="register-page">
    <!-- 注册表单 -->
    <div v-if="!inviteCode" class="register-content">
      <div class="header">
        <div class="logo">💕</div>
        <h1 class="title font-display">创建你们的空间</h1>
        <p class="subtitle">注册后邀请你的另一半加入</p>
      </div>

      <form class="form" @submit.prevent="handleRegister">
        <div class="form-group">
          <input v-model="nickname" type="text" class="input" placeholder="你的昵称" />
        </div>
        <div class="form-group">
          <input v-model="email" type="email" class="input" placeholder="邮箱" autocomplete="email" />
        </div>
        <div class="form-group">
          <input v-model="password" type="password" class="input" placeholder="密码（至少6位）" autocomplete="new-password" />
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? '创建中...' : '创建空间' }}
        </button>

        <div class="links">
          <router-link to="/login" class="link">已有账号？登录</router-link>
        </div>
      </form>
    </div>

    <!-- 邀请码展示 -->
    <div v-else class="invite-content">
      <div class="success-icon">🎉</div>
      <h2 class="success-title">空间创建成功！</h2>
      <p class="success-desc">把这个邀请码发给你的另一半</p>

      <div class="invite-code-box">
        <span class="code">{{ inviteCode }}</span>
        <button class="copy-btn" @click="copyCode">复制</button>
      </div>

      <p class="invite-tip">对方在注册时输入此邀请码即可加入</p>

      <button class="btn-primary w-full" @click="goToApp">进入我们的空间</button>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-primary-light) 100%);
}

.header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
}

.title {
  font-size: 2rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.form {
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

/* 邀请码展示 */
.invite-content {
  text-align: center;
  max-width: 360px;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.success-title {
  font-size: 1.5rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.success-desc {
  font-size: 0.9rem;
  color: var(--color-text-light);
  margin-bottom: 2rem;
}

.invite-code-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: var(--color-primary-light);
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.code {
  font-family: var(--font-mono);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.15em;
}

.copy-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
}

.copy-btn:active {
  transform: scale(0.95);
}

.invite-tip {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 2rem;
}
</style>
