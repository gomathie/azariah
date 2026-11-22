<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useBusinessStore } from '@/stores/business'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const business = useBusinessStore()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

const email = computed(() => auth.user?.email ?? '')
const initial = computed(() => email.value.trim().charAt(0).toUpperCase() || '?')
const otherShops = computed(() => business.businesses.filter((b) => b.id !== business.current?.id))

const links = [
  { name: 'profile', label: 'nav.profile' },
  { name: 'settings', label: 'nav.settings' },
  { name: 'accounts', label: 'nav.accounts' },
  { name: 'help', label: 'nav.help' },
] as const

function close(returnFocus = false) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

onClickOutside(root, () => close())
onKeyStroke('Escape', () => {
  if (open.value) close(true)
})

async function switchShop(id: string) {
  business.select(id)
  close()
  await router.push({ name: 'home' })
}

async function signOut() {
  close()
  await auth.signOut()
  await router.replace({ name: 'welcome' })
}
</script>

<template>
  <div ref="root" class="relative no-print">
    <button
      ref="trigger"
      type="button"
      class="size-10 shrink-0 rounded-full bg-brand-700 text-white font-semibold flex items-center justify-center hover:bg-brand-800"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="t('nav.accountMenu')"
      :title="t('nav.accountMenu')"
      @click="open = !open"
    >
      <span aria-hidden="true">{{ initial }}</span>
    </button>
    <div
      v-if="open"
      class="absolute right-0 top-12 z-20 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-lg p-2"
    >
      <div class="px-3 py-2">
        <p class="font-semibold text-slate-900 truncate">{{ business.current?.name }}</p>
        <p class="text-sm text-slate-600 truncate">{{ email }}</p>
      </div>
      <div v-if="otherShops.length" class="border-t border-slate-200 py-1">
        <p class="px-3 pt-2 text-xs font-semibold text-slate-600">{{ t('business.switch') }}</p>
        <button
          v-for="shop in otherShops"
          :key="shop.id"
          type="button"
          class="w-full text-left rounded-xl px-3 min-h-12 hover:bg-slate-100 truncate"
          @click="switchShop(shop.id)"
        >
          {{ shop.name }}
        </button>
      </div>
      <nav class="border-t border-slate-200 py-1 flex flex-col" :aria-label="t('nav.accountMenu')">
        <RouterLink
          v-for="link in links"
          :key="link.name"
          :to="{ name: link.name }"
          class="rounded-xl px-3 min-h-12 flex items-center hover:bg-slate-100"
          @click="close()"
          >{{ t(link.label) }}</RouterLink
        >
      </nav>
      <div class="border-t border-slate-200 pt-1">
        <button type="button" class="w-full text-left rounded-xl px-3 min-h-12 text-red-700 font-medium hover:bg-red-50" @click="signOut">
          {{ t('nav.signOut') }}
        </button>
      </div>
    </div>
  </div>
</template>
