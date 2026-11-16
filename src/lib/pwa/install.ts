import { ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** The browser's install prompt, kept from the moment it is offered. */
export const installPrompt = ref<BeforeInstallPromptEvent | null>(null)
export const appInstalled = ref(false)

export function runningAsInstalledApp(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

export function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

if (typeof window !== 'undefined') {
  appInstalled.value = runningAsInstalledApp()
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt.value = event as BeforeInstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    appInstalled.value = true
    installPrompt.value = null
  })
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = installPrompt.value
  if (!event) return 'unavailable'
  await event.prompt()
  const choice = await event.userChoice
  installPrompt.value = null
  if (choice.outcome === 'accepted') appInstalled.value = true
  return choice.outcome
}
