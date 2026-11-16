import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n'
import { useBusinessStore } from '@/stores/business'
import HomeView from '../HomeView.vue'

vi.mock('@/features/dashboard/api', () => ({
  getDashboard: vi.fn(async () => ({
    sales_minor: 20000,
    money_received_minor: 20000,
    operating_expenses_minor: 2500,
    stock_purchases_minor: 8000,
    net_cash_movement_minor: 26500,
    customer_debts_minor: 0,
    accounts: [{ id: 'cash', name: 'Cash', type: 'cash', balance_minor: 15500 }],
  })),
}))

describe('HomeView', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    i18n.global.locale.value = 'en'
    const business = useBusinessStore()
    business.businesses = [
      {
        id: 'biz',
        name: 'Ama Shop',
        business_type: 'retail',
        country_code: 'GH',
        timezone: 'Africa/Accra',
        currency_code: 'GHS',
        minor_unit: 2,
        role: 'owner',
      },
    ]
    business.currentBusinessId = 'biz'
  })

  it('shows the cash picture and does not present sales minus spending as profit', async () => {
    const wrapper = mount(HomeView, {
      global: {
        plugins: [pinia, i18n],
        stubs: { RouterLink: { template: '<a><slot /></a>' } },
      },
    })
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Sales')
    expect(text).toContain('Money received')
    expect(text).toContain('Operating expenses paid')
    expect(text).toContain('Stock purchases paid')
    expect(text).toContain('Net cash movement')
    expect(text).toContain('Customer debts')
    expect(text).toContain('is not your profit')
    expect(text).not.toMatch(/Sales\s*[−-]\s*Spending\s*=\s*Profit/)
  })
})
