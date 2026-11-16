<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { persistLocale, SUPPORTED_LOCALES, type Locale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const { t, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()

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
    <AppButton type="button" variant="secondary" @click="signOut">{{ t('nav.signOut') }}</AppButton>
  </section>
</template>
