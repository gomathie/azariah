import type { App } from 'vue'

/**
 * Error tracking with Sentry.
 *
 * It is off unless VITE_SENTRY_DSN is set, so local work and the tests send nothing.
 * This is a bookkeeping app: an error report must never carry a trader's figures, customer
 * names or email. So: no session replay, no performance tracing, no user identity, no console
 * output, and web addresses are cut down to their path before they leave the phone.
 */

type Crumb = { category?: string; data?: Record<string, unknown> }
type Report = {
  request?: { url?: string; query_string?: unknown; cookies?: unknown; headers?: unknown; data?: unknown }
  user?: unknown
  breadcrumbs?: Crumb[]
}

/** A web address without its query string or fragment, which can hold emails, searches or payment references. */
export function stripAddress(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined
  return url.split(/[?#]/)[0]
}

/** Keeps a breadcrumb only if it is safe, and trims the address on network ones. Null drops it. */
export function scrubBreadcrumb<T extends Crumb>(crumb: T): T | null {
  // Console lines and typed text can hold anything a screen printed.
  if (crumb.category === 'console' || crumb.category === 'ui.input') return null
  if (crumb.data && typeof crumb.data === 'object') {
    const data: Record<string, unknown> = {}
    for (const key of ['method', 'status_code'] as const) {
      if (key in crumb.data) data[key] = crumb.data[key]
    }
    for (const key of ['url', 'from', 'to'] as const) {
      const clean = stripAddress(crumb.data[key])
      if (clean !== undefined) data[key] = clean
    }
    crumb.data = data
  }
  return crumb
}

/** Removes everything personal from a report before it is sent. */
export function scrubReport<T extends Report>(event: T): T {
  if (event.request) {
    event.request = { url: stripAddress(event.request.url) }
  }
  delete event.user
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((c) => scrubBreadcrumb(c)).filter((c): c is Crumb => c !== null)
  }
  return event
}

/** Starts error tracking when a DSN is configured. Loaded on demand so it never slows the first screen. */
export async function startMonitoring(app: App): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || !import.meta.env.PROD) return
  try {
    const Sentry = await import('@sentry/vue')
    Sentry.init({
      app,
      dsn,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
      // Collect nothing personal. scrubReport below is a second net in case a default changes.
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        graphQL: { document: false, variables: false },
        genAI: { inputs: false, outputs: false },
      },
      tracesSampleRate: 0,
      // A phone on a weak network produces these all day; they are not defects.
      ignoreErrors: ['Failed to fetch', 'NetworkError', 'Load failed', 'AZ_'],
      beforeSend: (event) => scrubReport(event),
      beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
    })
  } catch {
    // Error tracking must never break the app.
  }
}
