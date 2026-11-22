<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BrandMark from '@/components/BrandMark.vue'
import { useAuthStore } from '@/stores/auth'

defineProps<{ title: string; back?: boolean }>()
const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
// First letter of the signed-in email; a plain dot shape if there is no user yet.
const initial = computed(() => (auth.user?.email ?? '').trim().charAt(0).toUpperCase() || '?')
</script>

<template>
  <header class="no-print flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
    <button
      v-if="back"
      type="button"
      class="min-h-12 min-w-12 -ml-2 rounded-xl flex items-center justify-center hover:bg-slate-100"
      :aria-label="t('app.back')"
      @click="router.back()"
    >
      <span aria-hidden="true" class="text-2xl leading-none">‹</span>
    </button>
    <BrandMark v-if="!back" class="size-9 shrink-0 md:hidden" />
    <h1 class="text-lg font-semibold text-slate-900 truncate flex-1">{{ title }}</h1>
    <slot name="actions" />
    <RouterLink
      v-if="auth.isSignedIn"
      :to="{ name: 'profile' }"
      class="size-10 shrink-0 rounded-full bg-brand-700 text-white font-semibold flex items-center justify-center hover:bg-brand-800"
      :aria-label="t('nav.profile')"
      :title="t('nav.profile')"
    >
      <span aria-hidden="true">{{ initial }}</span>
    </RouterLink>
  </header>
</template>
