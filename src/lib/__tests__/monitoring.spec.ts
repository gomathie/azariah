import { describe, expect, it } from 'vitest'
import { scrubBreadcrumb, scrubReport, stripAddress } from '@/lib/monitoring'

describe('error reports carry no personal data', () => {
  it('cuts a web address down to its path', () => {
    expect(stripAddress('https://x.supabase.co/rest/v1/contacts?name=eq.Ama&select=*')).toBe(
      'https://x.supabase.co/rest/v1/contacts',
    )
    expect(stripAddress('https://azaria.example/settings/plus/return?reference=azp-abc#x')).toBe(
      'https://azaria.example/settings/plus/return',
    )
    expect(stripAddress(undefined)).toBeUndefined()
  })

  it('drops console lines and typed text', () => {
    expect(scrubBreadcrumb({ category: 'console', data: { arguments: ['Ama owes 500'] } })).toBeNull()
    expect(scrubBreadcrumb({ category: 'ui.input' })).toBeNull()
  })

  it('keeps only the method, status and trimmed address of a network call', () => {
    const crumb = scrubBreadcrumb({
      category: 'fetch',
      data: { method: 'POST', status_code: 400, url: 'https://x.supabase.co/auth/v1/token?grant_type=password', body: '{"email":"a@b.c"}' },
    })
    expect(crumb?.data).toEqual({ method: 'POST', status_code: 400, url: 'https://x.supabase.co/auth/v1/token' })
  })

  it('removes the user, cookies, headers and query from a report', () => {
    const report = scrubReport({
      user: { email: 'ama@example.test' },
      request: { url: 'https://azaria.example/customers?q=Ama', cookies: 'a=b', headers: { Authorization: 'Bearer x' } },
      breadcrumbs: [{ category: 'console' }, { category: 'navigation', data: { from: '/a?x=1', to: '/b' } }],
    })
    expect(report.user).toBeUndefined()
    expect(report.request).toEqual({ url: 'https://azaria.example/customers' })
    expect(report.breadcrumbs).toEqual([{ category: 'navigation', data: { from: '/a', to: '/b' } }])
  })
})
