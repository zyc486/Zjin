import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from './auth'
import type { Category } from '@/types'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)

  async function fetchCategories() {
    const auth = useAuthStore()
    if (!auth.user?.couple_id) return

    loading.value = true
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('couple_id', auth.user.couple_id)
      .order('sort_order')

    if (!error && data) {
      categories.value = data
    }
    loading.value = false
  }

  function getCategoryById(id: string) {
    return categories.value.find(c => c.id === id)
  }

  return { categories, loading, fetchCategories, getCategoryById }
})
