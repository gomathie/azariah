<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { canReadAdminGuide } from '@/features/guide/access'
import { parseGuide, type Guide } from '@/features/guide/markdown'
import { useBusinessStore } from '@/stores/business'

/**
 * The guides are the Markdown files in docs/. They are the only copy: the app reads the same files
 * people read on GitHub. Each file is fetched when its guide is opened, then kept by the service
 * worker so it also opens offline.
 */
const SOURCES: Record<string, () => Promise<{ default: string }>> = {
  'user.en': () => import('../../../docs/USER_GUIDE.md?raw'),
  'user.fr': () => import('../../../docs/USER_GUIDE.fr.md?raw'),
  'admin.en': () => import('../../../docs/ADMIN_GUIDE.md?raw'),
  'admin.fr': () => import('../../../docs/ADMIN_GUIDE.fr.md?raw'),
}

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const business = useBusinessStore()
const guide = ref<Guide | null>(null)
const error = ref<string | null>(null)
/** True when the reader's language has no guide yet and the English one is shown. */
const fallback = ref(false)

const which = computed(() => (route.params.which === 'admin' ? 'admin' : 'user'))
const allowedAdmin = computed(() => canReadAdminGuide(business.current?.role, business.platformAdmin))

watch(
  [which, locale],
  async () => {
    await business.ensureLoaded()
    // Staff who follow a link to the admin guide get their own guide instead.
    if (which.value === 'admin' && !allowedAdmin.value) {
      await router.replace({ name: 'guide', params: { which: 'user' } })
      return
    }
    error.value = null
    try {
      const own = SOURCES[`${which.value}.${locale.value}`]
      fallback.value = !own
      const load = own ?? SOURCES[`${which.value}.en`]
      if (!load) throw new Error('unknown guide')
      guide.value = parseGuide((await load()).default)
    } catch {
      guide.value = null
      error.value = t('guide.loadError')
    }
  },
  { immediate: true },
)

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="min-h-dvh">
    <PageHeader :title="guide?.title || t('guide.title')" back />
    <article class="p-4 pb-16 space-y-6 max-w-2xl mx-auto">
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <template v-if="guide">
        <AppAlert v-if="fallback" kind="info">{{ t('guide.englishOnly') }}</AppAlert>
        <p v-for="(spans, index) in guide.intro" :key="index" class="text-slate-700 leading-relaxed">
          <template v-for="(span, s) in spans" :key="s"
            ><strong v-if="span.bold" class="font-semibold text-slate-900">{{ span.text }}</strong
            ><template v-else>{{ span.text }}</template></template
          >
        </p>

        <nav class="rounded-xl border border-slate-200 bg-white p-4" :aria-label="t('guide.contents')">
          <h2 class="text-sm font-semibold text-slate-600">{{ t('guide.contents') }}</h2>
          <ol class="mt-2 grid gap-x-4 sm:grid-cols-2">
            <li v-for="section in guide.sections" :key="section.id">
              <a
                :href="`#${section.id}`"
                class="flex items-center min-h-11 text-brand-800 underline"
                @click.prevent="jump(section.id)"
                >{{ section.title }}</a
              >
            </li>
          </ol>
        </nav>

        <section v-for="section in guide.sections" :id="section.id" :key="section.id" class="space-y-3 scroll-mt-20">
          <h2 class="text-lg font-semibold text-slate-900">{{ section.title }}</h2>
          <template v-for="(block, index) in section.blocks" :key="index">
            <h3 v-if="block.type === 'heading'" class="font-semibold text-slate-900">{{ block.text }}</h3>
            <p v-else-if="block.type === 'paragraph'" class="text-slate-700 leading-relaxed">
              <template v-for="(span, s) in block.spans" :key="s"
                ><strong v-if="span.bold" class="font-semibold text-slate-900">{{ span.text }}</strong
                ><template v-else>{{ span.text }}</template></template
              >
            </p>
            <component
              :is="block.ordered ? 'ol' : 'ul'"
              v-else-if="block.type === 'list'"
              class="space-y-2 pl-6 text-slate-700 leading-relaxed"
              :class="block.ordered ? 'list-decimal' : 'list-disc'"
            >
              <li v-for="(item, n) in block.items" :key="n">
                <template v-for="(span, s) in item" :key="s"
                  ><strong v-if="span.bold" class="font-semibold text-slate-900">{{ span.text }}</strong
                  ><template v-else>{{ span.text }}</template></template
                >
              </li>
            </component>
            <div v-else-if="block.type === 'table'" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table class="w-full text-sm">
                <thead>
                  <tr>
                    <th
                      v-for="(cell, c) in block.head"
                      :key="c"
                      scope="col"
                      class="px-3 py-2 text-left font-medium text-slate-600 border-b border-slate-200"
                    >
                      {{ cell }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, r) in block.rows" :key="r">
                    <td v-for="(cell, c) in row" :key="c" class="px-3 py-2 border-b border-slate-100 text-slate-800">
                      {{ cell }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>

        <RouterLink
          v-if="allowedAdmin"
          :to="{ name: 'guide', params: { which: which === 'admin' ? 'user' : 'admin' } }"
          class="block rounded-xl border border-brand-200 bg-white text-brand-800 font-semibold px-4 min-h-14 leading-[3.5rem] text-center"
        >
          {{ which === 'admin' ? t('guide.user') : t('guide.admin') }}
        </RouterLink>
      </template>
      <p v-else-if="!error" class="text-slate-600">{{ t('app.loading') }}</p>
    </article>
  </div>
</template>
