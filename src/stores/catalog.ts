import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '@/lib/supabase/client'

export interface CatalogAccount {
  id: string
  name: string
  type: string
}

export interface CatalogCategory {
  id: string
  name: string
  kind: 'sale' | 'operating_expense' | 'stock_purchase'
}

export interface CatalogContact {
  id: string
  name: string
  phone: string | null
}

export const useCatalogStore = defineStore('catalog', () => {
  const businessId = ref<string | null>(null)
  const accounts = ref<CatalogAccount[]>([])
  const categories = ref<CatalogCategory[]>([])
  const contacts = ref<CatalogContact[]>([])
  const loading = ref(false)

  async function load(id: string) {
    loading.value = true
    businessId.value = id
    try {
      const supabase = getSupabase()
      const [accountRes, categoryRes, contactRes] = await Promise.all([
        supabase.from('money_accounts').select('id, name, type').eq('business_id', id).eq('is_active', true).order('sort_order'),
        supabase.from('categories').select('id, name, kind').eq('business_id', id).eq('is_active', true).order('sort_order'),
        supabase.from('contacts').select('id, name, phone').eq('business_id', id).eq('is_active', true).order('name'),
      ])
      if (accountRes.error) throw accountRes.error
      if (categoryRes.error) throw categoryRes.error
      if (contactRes.error) throw contactRes.error
      accounts.value = accountRes.data
      categories.value = categoryRes.data
      contacts.value = contactRes.data
    } finally {
      loading.value = false
    }
  }

  async function addContact(name: string, phone: string | null): Promise<CatalogContact> {
    if (!businessId.value) throw new Error('No business selected')
    const { data, error } = await getSupabase()
      .from('contacts')
      .insert({ business_id: businessId.value, name: name.trim(), phone, kind: 'customer' })
      .select('id, name, phone')
      .single()
    if (error) throw error
    contacts.value = [...contacts.value, data].sort((a, b) => a.name.localeCompare(b.name))
    return data
  }

  return { businessId, accounts, categories, contacts, loading, load, addContact }
})
