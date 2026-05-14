import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type { User, Couple } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const couple = ref<Couple | null>(null)
  const partner = ref<User | null>(null)
  const loading = ref(true)

  const isLoggedIn = computed(() => !!user.value)
  const hasCouple = computed(() => !!couple.value)
  const isOwner = computed(() => {
    if (!user.value || !couple.value) return false
    // 第一个注册的用户是 owner（通过检查 invite_code 创建者）
    return true // 简化处理，后续可通过 couples.owner_id 区分
  })

  // 初始化：检查当前登录状态
  async function init() {
    loading.value = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
    } catch (error) {
      console.error('Auth init error:', error)
    } finally {
      loading.value = false
    }

    // 监听登录状态变化
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        user.value = null
        couple.value = null
        partner.value = null
      }
    })
  }

  // 获取用户资料
  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('Fetch user error:', error)
      return
    }

    user.value = data

    if (data.couple_id) {
      await fetchCouple(data.couple_id)
      await fetchPartner(data.couple_id, userId)
    }
  }

  // 获取情侣信息
  async function fetchCouple(coupleId: string) {
    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .eq('id', coupleId)
      .single()

    if (!error && data) {
      couple.value = data
    }
  }

  // 获取伴侣信息
  async function fetchPartner(coupleId: string, currentUserId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('couple_id', coupleId)
      .neq('id', currentUserId)
      .single()

    if (!error && data) {
      partner.value = data
    }
  }

  // 注册（主人）
  async function register(email: string, password: string, nickname: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('注册失败')

    // 生成邀请码
    const inviteCode = generateInviteCode()

    // 创建情侣空间
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples')
      .insert({
        invite_code: inviteCode,
        couple_name: `${nickname}的小宇宙`,
      })
      .select()
      .single()

    if (coupleError) throw coupleError

    // 创建用户资料
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        nickname,
        couple_id: coupleData.id,
      })

    if (userError) throw userError

    // 创建默认分类
    await createDefaultCategories(coupleData.id)

    await fetchUserProfile(data.user.id)
    return { inviteCode }
  }

  // 登录
  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  // 通过邀请码加入（伴侣）
  async function joinByInviteCode(email: string, password: string, nickname: string, inviteCode: string) {
    // 先验证邀请码
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()

    if (coupleError || !coupleData) {
      throw new Error('邀请码无效')
    }

    // 注册用户
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('注册失败')

    // 创建用户资料并关联到情侣空间
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        nickname,
        couple_id: coupleData.id,
      })

    if (userError) throw userError

    await fetchUserProfile(data.user.id)
  }

  // 登出
  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    couple.value = null
    partner.value = null
  }

  // 生成邀请码
  function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // 创建默认分类
  async function createDefaultCategories(coupleId: string) {
    const defaults = [
      { name: '日常', icon: '☀️', color: '#F5E6E0', sort_order: 0 },
      { name: '吃饭', icon: '🍜', color: '#FFE4C4', sort_order: 1 },
      { name: '旅行', icon: '✈️', color: '#E0F0E0', sort_order: 2 },
      { name: '电影', icon: '🎬', color: '#E8D0F0', sort_order: 3 },
      { name: '娱乐', icon: '🎮', color: '#D0E8F0', sort_order: 4 },
      { name: '节日', icon: '🎉', color: '#FFE0E0', sort_order: 5 },
      { name: '纪念日', icon: '💕', color: '#FFD0D0', sort_order: 6 },
      { name: '自拍', icon: '📸', color: '#F0E0D0', sort_order: 7 },
      { name: '深夜聊天', icon: '🌙', color: '#E0E0F0', sort_order: 8 },
      { name: '游戏', icon: '🎯', color: '#D0F0E0', sort_order: 9 },
    ]

    await supabase.from('categories').insert(
      defaults.map(c => ({ ...c, couple_id: coupleId }))
    )
  }

  return {
    user,
    couple,
    partner,
    loading,
    isLoggedIn,
    hasCouple,
    isOwner,
    init,
    register,
    login,
    joinByInviteCode,
    logout,
  }
})
