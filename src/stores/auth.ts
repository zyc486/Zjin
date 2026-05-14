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

  // 初始化
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

  // 登录
  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  // 登出
  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    couple.value = null
    partner.value = null
  }

  return {
    user,
    couple,
    partner,
    loading,
    isLoggedIn,
    hasCouple,
    init,
    login,
    logout,
  }
})
