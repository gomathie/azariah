import { createI18n } from 'vue-i18n'
import en from './en.json'
import fr from './fr.json'
import tw from './tw.json'

export type MessageSchema = typeof en
export const SUPPORTED_LOCALES = ['en', 'fr', 'tw'] as const

/** The name of each language in that language, for the language pickers. */
export const LOCALE_NAMES: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: 'English',
  fr: 'Français',
  tw: 'Twi',
}
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const STORAGE_KEY = 'azaria.locale'

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) return stored as Locale
  } catch {
    /* storage unavailable */
  }
  const env = import.meta.env.VITE_DEFAULT_LOCALE
  if (env && (SUPPORTED_LOCALES as readonly string[]).includes(env)) return env as Locale
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en'
  // 'ak' is the code browsers use for Akan, the family Twi belongs to.
  if (nav === 'tw' || nav === 'ak') return 'tw'
  return nav === 'fr' ? 'fr' : 'en'
}

export function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* storage unavailable */
  }
}

export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, fr, tw },
})
