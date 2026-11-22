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

import { useBusinessStore } from '../business'

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
        eq: () =>
          Promise.resolve({
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
          }),
      }),
    })
  })

  it('sends a UUID operation id and selects the created business', async () => {
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
})
