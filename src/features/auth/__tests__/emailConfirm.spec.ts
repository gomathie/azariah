import { beforeEach, describe, expect, it } from 'vitest'
import { SNOOZE_MS, cleanCode, emailCodeErrorKey, isSnoozed, snooze } from '../emailConfirm'

describe('email reminder', () => {
  beforeEach(() => localStorage.clear())

  it('comes back after the snooze ends, and only then', () => {
    const now = 1_000_000
    expect(isSnoozed('u1', now)).toBe(false)
    snooze('u1', now)
    expect(isSnoozed('u1', now + SNOOZE_MS - 1)).toBe(true)
    expect(isSnoozed('u1', now + SNOOZE_MS + 1)).toBe(false)
  })

  it('snoozes one person, not everyone who uses the phone', () => {
    snooze('u1', 5)
    expect(isSnoozed('u2', 6)).toBe(false)
  })

  it('treats a damaged stored value as not snoozed', () => {
    localStorage.setItem('azaria.emailReminder.u1', 'soon')
    expect(isSnoozed('u1', 1)).toBe(false)
  })

  it('keeps only the digits of a typed or pasted code', () => {
    expect(cleanCode(' 123 456 ')).toBe('123456')
    expect(cleanCode('12-34-56')).toBe('123456')
    expect(cleanCode('abc')).toBe('')
  })

  it('picks a plain message for each kind of failure', () => {
    expect(emailCodeErrorKey({ status: 429, message: 'email rate limit exceeded' })).toBe('emailConfirm.wait')
    expect(emailCodeErrorKey({ message: 'For security purposes, you can only request this after 30 seconds.' })).toBe(
      'emailConfirm.wait',
    )
    expect(emailCodeErrorKey({ status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' })).toBe(
      'emailConfirm.wrongCode',
    )
    expect(emailCodeErrorKey(new TypeError('Failed to fetch'))).toBe('errors.network')
    expect(emailCodeErrorKey(new Error('boom'))).toBe('errors.generic')
  })
})
