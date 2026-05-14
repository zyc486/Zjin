<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

// 如果已登录但没有情侣空间，显示邀请码输入
// 如果未登录，显示注册+邀请码表单
const isAlreadyLoggedIn = ref(!!auth.user)
const nickname = ref('')
const email = ref('')
const password = ref('')
const inviteCode = ref('')
const loading = ref(false)
const error = ref('')

async function handleJoin() {
  if (!inviteCode.value) {
    error.value = '请输入邀请码'
    return
  }

  if (isAlreadyLoggedIn.value) {
    // TODO: 已登录用户通过邀请码加入
    error.value = '此功能暂未实现，请联系管理员'
    return
  }

  if (!nickname.value || !email.value || !password.value) {
    error.value = '请填写所有信息'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await auth.joinByInviteCode(email.value, password.value, nickname.value, inviteCode.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.message || '加入失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="invite-page">
    <div class="header">
      <div class="logo">💌</div>
      <h1 class="title font-display">加入空间</h1>
      <p class="subtitle">输入另一半发给你的邀请码</p>
    </div>

    <form class="form" @submit.prevent="handleJoin">
      <template v-if="!isAlreadyLoggedIn">
        <div class="form-group">
          <input v-model="nickname" type="text" class="input" placeholder="你的昵称" />
        </div>
        <div class="form-group">
          <input v-model="email" type="email" class="input" placeholder="邮箱" autocomplete="email" />
        </div>
        <div class="form-group">
          <input v-model="password" type="password" class="input" placeholder="密码（至少6位）" autocomplete="new-password" />
        </div>
      </template>

      <div class="form-group">
        <input
          v-model="inviteCode"
          type="text"
          class="input invite-input"
          placeholder="输入邀请码"
          maxlength="8"
        />
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '加入中...' : '加入空间' }}
      </button>

      <div class="links">
        <router-link to="/login" class="link">已有账号？登录</router-link>
      </div>
    </form>
  </div>
</template>

<style scoped>
.invite-page {
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

.invite-input {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 1.3rem;
  letter-spacing: 0.15em;
  font-weight: 600;
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
