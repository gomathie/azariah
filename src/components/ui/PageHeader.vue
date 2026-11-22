<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BrandMark from '@/components/BrandMark.vue'
import ProfileMenu from '@/components/ui/ProfileMenu.vue'
import { useAuthStore } from '@/stores/auth'

defineProps<{ title: string; back?: boolean }>()
const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
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
    <ProfileMenu v-if="auth.isSignedIn" />
  </header>
</template>
