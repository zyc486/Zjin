<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const copied = ref(false)

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}

function copyInviteCode() {
  if (auth.couple?.invite_code) {
    navigator.clipboard.writeText(auth.couple.invite_code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title font-display">设置</h1>
    </div>

    <!-- 用户信息 -->
    <div class="card settings-card">
      <div class="user-info">
        <div class="avatar">{{ auth.user?.nickname?.[0] || '?' }}</div>
        <div class="user-details">
          <p class="nickname">{{ auth.user?.nickname }}</p>
          <p class="email">{{ auth.user?.id ? '已登录' : '未登录' }}</p>
        </div>
      </div>
    </div>

    <!-- 伴侣信息 -->
    <div class="card settings-card">
      <h3 class="card-title">我们的空间</h3>
      <div class="couple-info">
        <div class="couple-member">
          <div class="avatar small">{{ auth.user?.nickname?.[0] || '?' }}</div>
          <span>{{ auth.user?.nickname }}</span>
        </div>
        <div class="couple-heart">💕</div>
        <div class="couple-member">
          <div class="avatar small">{{ auth.partner?.nickname?.[0] || '?' }}</div>
          <span>{{ auth.partner?.nickname || '等待加入...' }}</span>
        </div>
      </div>

      <!-- 邀请码 -->
      <div v-if="!auth.partner && auth.couple" class="invite-section">
        <p class="invite-label">邀请码</p>
        <div class="invite-code-row">
          <span class="invite-code">{{ auth.couple.invite_code }}</span>
          <button class="copy-btn" @click="copyInviteCode">
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
        <p class="invite-hint">发给你的另一半，对方注册时输入即可加入</p>
      </div>
    </div>

    <!-- 操作 -->
    <div class="card settings-card">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  min-height: 100%;
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  color: var(--color-text);
}

.settings-card {
  margin-bottom: 1rem;
}

.card-title {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
  font-weight: 500;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-warm) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
  flex-shrink: 0;
}

.avatar.small {
  width: 32px;
  height: 32px;
  font-size: 0.85rem;
}

.nickname {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.email {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.couple-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.couple-member {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text);
}

.couple-heart {
  font-size: 1.5rem;
  animation: heartbeat 2s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.invite-section {
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  padding: 1rem;
}

.invite-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.invite-code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.invite-code {
  font-family: var(--font-mono);
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--color-text);
}

.copy-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  padding: 0.4rem 1rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s;
}

.copy-btn:active {
  transform: scale(0.95);
}

.invite-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.logout-btn {
  width: 100%;
  background: none;
  border: none;
  color: #E87461;
  font-size: 0.95rem;
  padding: 0.75rem;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background 0.3s;
}

.logout-btn:hover {
  background: rgba(232, 116, 97, 0.05);
}
</style>
