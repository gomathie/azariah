<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { persistLocale, SUPPORTED_LOCALES, type Locale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useBusinessStore } from '@/stores/business'
import { canReadAdminGuide } from '@/features/guide/access'

const { t, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const business = useBusinessStore()
const showAdminGuide = computed(() => canReadAdminGuide(business.current?.role, business.platformAdmin))

const languageOptions = SUPPORTED_LOCALES.map((code) => ({ value: code, label: code === 'fr' ? 'Français' : 'English' }))

function setLanguage(value: string) {
  const next = value as Locale
  locale.value = next
  persistLocale(next)
}

async function signOut() {
  await auth.signOut()
  await router.push({ name: 'welcome' })
}
</script>

<template>
  <PageHeader :title="t('profile.title')" back />
  <section class="p-4 space-y-4 max-w-lg">
    <p><span class="text-slate-600">{{ t('profile.email') }}</span><br />{{ auth.user?.email }}</p>
    <AppSelect :model-value="locale" :label="t('profile.language')" :options="languageOptions" @update:model-value="setLanguage" />
    <div class="space-y-2">
      <h2 class="text-base font-semibold text-slate-900">{{ t('guide.title') }}</h2>
      <RouterLink
        :to="{ name: 'guide', params: { which: 'user' } }"
        class="block rounded-xl border border-slate-200 bg-white px-4 py-3 min-h-14"
      >
        <span class="block font-medium text-slate-900">{{ t('guide.user') }}</span>
        <span class="block text-sm text-slate-600">{{ t('guide.userHint') }}</span>
      </RouterLink>
      <RouterLink
        v-if="showAdminGuide"
        :to="{ name: 'guide', params: { which: 'admin' } }"
        class="block rounded-xl border border-slate-200 bg-white px-4 py-3 min-h-14"
      >
        <span class="block font-medium text-slate-900">{{ t('guide.admin') }}</span>
        <span class="block text-sm text-slate-600">{{ t('guide.adminHint') }}</span>
      </RouterLink>
    </div>
    <AppButton type="button" variant="secondary" @click="signOut">{{ t('nav.signOut') }}</AppButton>
  </section>
</template>
