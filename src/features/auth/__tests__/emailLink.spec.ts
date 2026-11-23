import { describe, expect, it } from 'vitest'
import { readEmailLink } from '../emailLink'

const hash = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8'

describe('email link', () => {
  it('reads the token and kind from a reset link', () => {
    expect(readEmailLink(`?token_hash=${hash}&type=recovery`)).toEqual({ tokenHash: hash, type: 'recovery' })
  })

  it('reads a sign-in link too', () => {
    expect(readEmailLink(`?token_hash=${hash}&type=magiclink`)?.type).toBe('magiclink')
  })

  it('ignores an address with no token', () => {
    expect(readEmailLink('')).toBeNull()
    expect(readEmailLink('?type=recovery')).toBeNull()
    expect(readEmailLink(`?token_hash=${hash}`)).toBeNull()
  })

  it('ignores a kind it does not know', () => {
    expect(readEmailLink(`?token_hash=${hash}&type=sms`)).toBeNull()
    expect(readEmailLink(`?token_hash=${hash}&type=__proto__`)).toBeNull()
  })

  it('ignores a token that is not a plain token', () => {
    expect(readEmailLink('?token_hash=short&type=recovery')).toBeNull()
    expect(readEmailLink(`?token_hash=${encodeURIComponent('<script>alert(1)</script>xxxxxxxx')}&type=recovery`)).toBeNull()
  })
})
