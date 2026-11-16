import { describe, expect, it } from 'vitest'
import { MissingSupabaseConfigError, createSupabaseClient } from '../client'

describe('createSupabaseClient', () => {
  it('throws a clear error when configuration is missing', () => {
    expect(() => createSupabaseClient(undefined, undefined)).toThrow(MissingSupabaseConfigError)
    expect(() => createSupabaseClient('http://127.0.0.1:54321', '')).toThrow(MissingSupabaseConfigError)
  })

  it('returns a client when url and key are present', () => {
    const client = createSupabaseClient('http://127.0.0.1:54321', 'public-key')
    expect(client).toBeDefined()
    expect(typeof client.rpc).toBe('function')
  })
})
