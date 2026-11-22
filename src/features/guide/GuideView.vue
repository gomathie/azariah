<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMediaQuery } from '@vueuse/core'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import BrandMark from '@/components/BrandMark.vue'
import { canReadAdminGuide } from '@/features/guide/access'
import { parseGuide, sectionText, type Guide, type Span } from '@/features/guide/markdown'
import { useAuthStore } from '@/stores/auth'
import { useBusinessStore } from '@/stores/business'

/**
 * Reader for the Markdown files in docs/: the user guide, the admin guide and the About page.
 * They are the only copy: the app reads the same files people read on GitHub.
 *
 * Getting around:
 *  - phone: one section open at a time, a "Jump to" list that stays under the header, and search;
 *  - computer: a contents list that stays at the side and marks the section being read.
 */
type Doc = 'user' | 'admin' | 'about'

const SOURCES: Record<string, () => Promise<{ default: string }>> = {
  'user.en': () => import('../../../docs/USER_GUIDE.md?raw'),
  'user.fr': () => import('../../../docs/USER_GUIDE.fr.md?raw'),
  'admin.en': () => import('../../../docs/ADMIN_GUIDE.md?raw'),
  'admin.fr': () => import('../../../docs/ADMIN_GUIDE.fr.md?raw'),
  'about.en': () => import('../../../docs/ABOUT.md?raw'),
  'about.fr': () => import('../../../docs/ABOUT.fr.md?raw'),
}

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const business = useBusinessStore()
const guide = ref<Guide | null>(null)
const error = ref<string | null>(null)
/** True when the reader's language has no copy yet and the English one is shown. */
const fallback = ref(false)
const query = ref('')
/** Sections open on a phone. On a computer every section is open. */
const open = ref<Set<string>>(new Set())
const active = ref('')
const showTop = ref(false)
const wide = useMediaQuery('(min-width: 1024px)')

const which = computed<Doc>(() => {
  if (route.name === 'about') return 'about'
  return route.params.which === 'admin' ? 'admin' : 'user'
})
const isGuide = computed(() => which.value !== 'about')
const allowedAdmin = computed(() => canReadAdminGuide(business.current?.role, business.platformAdmin))

const needle = computed(() => query.value.trim().toLowerCase())
const searchable = computed(() =>
  (guide.value?.sections ?? []).map((section) => ({ section, text: sectionText(section).toLowerCase() })),
)
const visible = computed(() =>
  needle.value ? searchable.value.filter((s) => s.text.includes(needle.value)).map((s) => s.section) : (guide.value?.sections ?? []),
)
const isOpen = (id: string) => wide.value || needle.value !== '' || open.value.has(id)

watch(
  [which, locale],
  async () => {
    if (auth.isSignedIn) await business.ensureLoaded()
    // Staff who follow a link to the admin guide get their own guide instead.
    if (which.value === 'admin' && !allowedAdmin.value) {
      await router.replace({ name: 'guide', params: { which: 'user' } })
      return
    }
    error.value = null
    query.value = ''
    try {
      const own = SOURCES[`${which.value}.${locale.value}`]
      fallback.value = !own
      const load = own ?? SOURCES[`${which.value}.en`]
      if (!load) throw new Error('unknown document')
      const parsed = parseGuide((await load()).default)
      guide.value = parsed
      // A phone starts with the first section open, so the page is not a wall of closed headings.
      open.value = new Set(parsed.sections[0] ? [parsed.sections[0].id] : [])
      active.value = parsed.sections[0]?.id ?? ''
      await nextTick()
      window.scrollTo({ top: 0 })
    } catch {
      guide.value = null
      error.value = t('guide.loadError')
    }
  },
  { immediate: true },
)

function toggle(id: string) {
  const next = new Set(open.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  open.value = next
}

async function jump(id: string) {
  if (!id) return
  query.value = ''
  open.value = new Set([...open.value, id])
  active.value = id
  await nextTick()
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

function setAll(expanded: boolean) {
  open.value = new Set(expanded ? (guide.value?.sections ?? []).map((s) => s.id) : [])
}

function toTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

/** Marks the section nearest the top of the screen, for the contents list and the jump list. */
let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    showTop.value = window.scrollY > 600
    let current = ''
    for (const section of visible.value) {
      const el = document.getElementById(section.id)
      if (el && el.getBoundingClientRect().top <= 140) current = section.id
    }
    if (current) active.value = current
  })
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const tabs = computed(() =>
  isGuide.value && allowedAdmin.value
    ? ([
        { which: 'user', label: t('guide.user') },
        { which: 'admin', label: t('guide.admin') },
      ] as const)
    : [],
)
const title = computed(() => guide.value?.title || (isGuide.value ? t('guide.title') : t('about.title')))

/** Split a span so the part that matches the search can be marked. */
function marked(span: Span): { text: string; hit: boolean }[] {
  const q = needle.value
  if (!q) return [{ text: span.text, hit: false }]
  const parts: { text: string; hit: boolean }[] = []
  const lower = span.text.toLowerCase()
  let at = 0
  for (let i = lower.indexOf(q); i !== -1; i = lower.indexOf(q, at)) {
    if (i > at) parts.push({ text: span.text.slice(at, i), hit: false })
    parts.push({ text: span.text.slice(i, i + q.length), hit: true })
    at = i + q.length
  }
  if (at < span.text.length) parts.push({ text: span.text.slice(at), hit: false })
  return parts
}
</script>

<template>
  <div class="min-h-dvh">
    <PageHeader :title="title" back />

    <!-- Phone and tablet: the way around the page stays under the header while you read. -->
    <div
      v-if="guide"
      class="lg:hidden sticky top-[4.5rem] z-[5] bg-slate-50/95 backdrop-blur border-b border-slate-200 px-4 py-2 space-y-2"
    >
      <div v-if="tabs.length" class="grid grid-cols-2 gap-2" role="tablist" :aria-label="t('guide.title')">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.which"
          :to="{ name: 'guide', params: { which: tab.which } }"
          role="tab"
          :aria-selected="which === tab.which"
          class="min-h-11 rounded-xl border flex items-center justify-center text-sm font-semibold"
          :class="which === tab.which ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-700 border-slate-200'"
          >{{ tab.label }}</RouterLink
        >
      </div>
      <div class="flex gap-2">
        <label class="sr-only" for="guide-jump">{{ t('guide.jump') }}</label>
        <select
          id="guide-jump"
          class="min-h-11 flex-1 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base"
          :value="active"
          @change="jump(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="(section, index) in guide.sections" :key="section.id" :value="section.id">
            {{ index + 1 }}. {{ section.title }}
          </option>
        </select>
      </div>
    </div>

    <div class="max-w-6xl mx-auto p-4 pb-24 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
      <!-- Computer: contents at the side, always in view. -->
      <aside v-if="guide" class="hidden lg:block">
        <div class="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto space-y-4 pr-2">
          <div v-if="tabs.length" class="grid grid-cols-2 gap-2" role="tablist" :aria-label="t('guide.title')">
            <RouterLink
              v-for="tab in tabs"
              :key="tab.which"
              :to="{ name: 'guide', params: { which: tab.which } }"
              role="tab"
              :aria-selected="which === tab.which"
              class="min-h-11 rounded-xl border flex items-center justify-center text-sm font-semibold text-center px-2"
              :class="which === tab.which ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'"
              >{{ tab.label }}</RouterLink
            >
          </div>
          <div>
            <label for="guide-search-wide" class="block text-sm font-medium text-slate-700">{{ t('guide.search') }}</label>
            <input
              id="guide-search-wide"
              v-model="query"
              type="search"
              maxlength="60"
              autocomplete="off"
              class="mt-1 block w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base"
            />
          </div>
          <nav :aria-label="t('guide.contents')">
            <h2 class="text-sm font-semibold text-slate-600">{{ t('guide.contents') }}</h2>
            <ol class="mt-2 space-y-0.5">
              <li v-for="(section, index) in guide.sections" :key="section.id">
                <a
                  :href="`#${section.id}`"
                  class="block rounded-lg px-3 py-2 text-sm border-l-4"
                  :class="
                    active === section.id
                      ? 'border-brand-700 bg-brand-50 text-brand-900 font-semibold'
                      : 'border-transparent text-slate-700 hover:bg-slate-100'
                  "
                  :aria-current="active === section.id ? 'true' : undefined"
                  @click.prevent="jump(section.id)"
                  >{{ index + 1 }}. {{ section.title }}</a
                >
              </li>
            </ol>
          </nav>
        </div>
      </aside>

      <article class="space-y-4 min-w-0">
        <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
        <template v-if="guide">
          <AppAlert v-if="fallback" kind="info">{{ t('guide.englishOnly') }}</AppAlert>

          <div v-if="!isGuide" class="flex items-center gap-4">
            <BrandMark class="size-16 shrink-0" />
            <div>
              <p class="text-2xl font-bold text-brand-800">Azaria</p>
              <p class="text-slate-600">{{ t('app.tagline') }}</p>
            </div>
          </div>

          <p v-for="(spans, index) in guide.intro" :key="index" class="text-slate-700 leading-relaxed text-lg">
            <template v-for="(span, s) in spans" :key="s"
              ><strong v-if="span.bold" class="font-semibold text-slate-900">{{ span.text }}</strong
              ><template v-else>{{ span.text }}</template></template
            >
          </p>

          <!-- Phone: search and open-all sit above the sections. -->
          <div class="lg:hidden space-y-2">
            <label for="guide-search" class="block text-sm font-medium text-slate-700">{{ t('guide.search') }}</label>
            <input
              id="guide-search"
              v-model="query"
              type="search"
              maxlength="60"
              autocomplete="off"
              class="block w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base"
            />
            <div v-if="!needle" class="flex gap-4 text-sm">
              <button type="button" class="min-h-11 text-brand-800 underline" @click="setAll(true)">
                {{ t('guide.openAll') }}
              </button>
              <button type="button" class="min-h-11 text-brand-800 underline" @click="setAll(false)">
                {{ t('guide.closeAll') }}
              </button>
            </div>
          </div>

          <p v-if="needle" class="text-sm text-slate-600" role="status">
            {{ visible.length ? t('guide.matches', { count: visible.length }) : t('guide.noMatch') }}
          </p>

          <section
            v-for="section in visible"
            :id="section.id"
            :key="section.id"
            class="scroll-mt-44 lg:scroll-mt-24 rounded-xl border border-slate-200 bg-white lg:border-0 lg:bg-transparent lg:rounded-none"
          >
            <h2 class="lg:hidden">
              <button
                type="button"
                class="w-full min-h-14 px-4 flex items-center justify-between gap-3 text-left text-lg font-semibold text-slate-900"
                :aria-expanded="isOpen(section.id)"
                :aria-controls="`${section.id}-body`"
                @click="toggle(section.id)"
              >
                <span>{{ section.title }}</span>
                <span aria-hidden="true" class="text-2xl leading-none text-brand-700 shrink-0">{{
                  isOpen(section.id) ? '−' : '+'
                }}</span>
              </button>
            </h2>
            <h2 class="hidden lg:block text-2xl font-semibold text-slate-900 pt-4 border-t border-slate-200">
              {{ section.title }}
            </h2>

            <div v-show="isOpen(section.id)" :id="`${section.id}-body`" class="px-4 pb-4 lg:px-0 lg:pt-3 space-y-3">
              <template v-for="(block, index) in section.blocks" :key="index">
                <h3 v-if="block.type === 'heading'" class="font-semibold text-slate-900">{{ block.text }}</h3>
                <p v-else-if="block.type === 'paragraph'" class="text-slate-700 leading-relaxed">
                  <template v-for="(span, s) in block.spans" :key="s">
                    <component :is="span.bold ? 'strong' : 'span'" :class="span.bold ? 'font-semibold text-slate-900' : ''"
                      ><template v-for="(piece, k) in marked(span)" :key="k"
                        ><mark v-if="piece.hit" class="bg-amber-200 rounded-sm">{{ piece.text }}</mark
                        ><template v-else>{{ piece.text }}</template></template
                      ></component
                    >
                  </template>
                </p>
                <component
                  :is="block.ordered ? 'ol' : 'ul'"
                  v-else-if="block.type === 'list'"
                  class="space-y-2 pl-6 text-slate-700 leading-relaxed"
                  :class="block.ordered ? 'list-decimal' : 'list-disc'"
                >
                  <li v-for="(item, n) in block.items" :key="n">
                    <template v-for="(span, s) in item" :key="s">
                      <component :is="span.bold ? 'strong' : 'span'" :class="span.bold ? 'font-semibold text-slate-900' : ''"
                        ><template v-for="(piece, k) in marked(span)" :key="k"
                          ><mark v-if="piece.hit" class="bg-amber-200 rounded-sm">{{ piece.text }}</mark
                          ><template v-else>{{ piece.text }}</template></template
                        ></component
                      >
                    </template>
                  </li>
                </component>
                <div
                  v-else-if="block.type === 'table'"
                  class="overflow-x-auto rounded-xl border border-slate-200 bg-white"
                  tabindex="0"
                  role="region"
                  :aria-label="section.title"
                >
                  <table class="w-full text-sm">
                    <thead>
                      <tr>
                        <th
                          v-for="(cell, c) in block.head"
                          :key="c"
                          scope="col"
                          class="px-3 py-2 text-left font-medium text-slate-600 border-b border-slate-200"
                          :class="c === 0 ? 'sticky left-0 bg-white' : ''"
                        >
                          {{ cell }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, r) in block.rows" :key="r">
                        <td
                          v-for="(cell, c) in row"
                          :key="c"
                          class="px-3 py-2 border-b border-slate-100 text-slate-800"
                          :class="c === 0 ? 'sticky left-0 bg-white font-medium' : 'whitespace-nowrap'"
                        >
                          {{ cell }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
          </section>

          <div v-if="!isGuide && auth.isSignedIn" class="pt-2">
            <RouterLink
              :to="{ name: 'guide', params: { which: 'user' } }"
              class="block rounded-xl bg-brand-700 text-white font-semibold px-4 min-h-14 leading-[3.5rem] text-center"
              >{{ t('guide.readUser') }}</RouterLink
            >
          </div>
        </template>
        <p v-else-if="!error" class="text-slate-600">{{ t('app.loading') }}</p>
      </article>
    </div>

    <button
      v-if="showTop"
      type="button"
      class="no-print fixed bottom-5 right-5 z-10 min-h-12 rounded-full bg-brand-700 text-white font-semibold px-5 shadow-lg hover:bg-brand-800"
      @click="toTop"
    >
      ↑ {{ t('guide.top') }}
    </button>
  </div>
</template>
