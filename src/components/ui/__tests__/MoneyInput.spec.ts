import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import MoneyInput from '../MoneyInput.vue'

describe('MoneyInput', () => {
  it('emits minor units as the user types', async () => {
    i18n.global.locale.value = 'en'
    const wrapper = mount(MoneyInput, {
      props: { label: 'Amount', currency: 'GHS', minorUnit: 2, modelValue: null },
      global: { plugins: [i18n] },
    })
    await wrapper.get('input').setValue('12.5')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([1250n])
  })

  it('shows an error when the amount has too many decimals', async () => {
    i18n.global.locale.value = 'en'
    const wrapper = mount(MoneyInput, {
      props: { label: 'Amount', currency: 'GHS', minorUnit: 2, modelValue: null },
      global: { plugins: [i18n] },
    })
    await wrapper.get('input').setValue('12.345')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
    expect(wrapper.get('[role="alert"]').text()).toContain('Enter a valid amount')
  })
})
