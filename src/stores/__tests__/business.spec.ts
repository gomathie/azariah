import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { callRpc, from } = vi.hoisted(() => ({
  callRpc: vi.fn<(name: string, params: Record<string, unknown>) => Promise<unknown>>(),
  from: vi.fn<(table: string) => unknown>(),
}))

vi.mock('@/lib/supabase/rpc', () => ({ callRpc }))
vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ from }),
}))

import { useAuthStore } from '../auth'
import { useBusinessStore } from '../business'

let memberFilter: { column: string; value: string } | null = null

const BUSINESS_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

describe('useBusinessStore createBusiness', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    callRpc.mockReset()
    from.mockReset()
    callRpc.mockResolvedValue({ business_id: BUSINESS_ID })
    from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: (column: string, value: string) => {
            memberFilter = { column, value }
            return Promise.resolve({
            data: [
              {
                role: 'owner',
                business: {
                  id: BUSINESS_ID,
                  name: "Ama's Provision Shop",
                  business_type: 'retail',
                  country_code: 'GH',
                  timezone: 'Africa/Accra',
                  currency_code: 'GHS',
                  minor_unit: 2,
                },
              },
            ],
            error: null,
            })
          },
        }),
      }),
    })
  })

  it('sends a UUID operation id and selects the created business', async () => {
    useAuthStore().session = { user: { id: 'user-1' } } as never
    const store = useBusinessStore()
    const id = await store.createBusiness({
      name: "Ama's Provision Shop",
      businessType: 'retail',
      countryCode: 'GH',
      timezone: 'Africa/Accra',
      currencyCode: 'GHS',
    })

    expect(id).toBe(BUSINESS_ID)
    expect(store.currentBusinessId).toBe(BUSINESS_ID)
    expect(localStorage.getItem('azaria.business')).toBe(BUSINESS_ID)
    expect(callRpc).toHaveBeenCalledWith(
      'rpc_create_business_and_owner',
      expect.objectContaining({
        p_name: "Ama's Provision Shop",
        p_business_type: 'retail',
        p_country_code: 'GH',
        p_currency_code: 'GHS',
        p_timezone: 'Africa/Accra',
        p_client_operation_id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      }),
    )
  })

  it('loads only the signed-in person\x27s own memberships', async () => {
    useAuthStore().session = { user: { id: 'user-1' } } as never
    memberFilter = null
    await useBusinessStore().load()
    expect(memberFilter).toEqual({ column: 'user_id', value: 'user-1' })
  })

  it('lists no shops when nobody is signed in', async () => {
    const store = useBusinessStore()
    await store.load()
    expect(store.businesses).toEqual([])
    expect(from).not.toHaveBeenCalled()
  })
})
