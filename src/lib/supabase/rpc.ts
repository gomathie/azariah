import { getSupabase } from './client'

/** Error codes raised by `rpc_*` functions (see supabase/migrations). They map 1:1 to `errors.*` i18n keys. */
export type AzariaErrorCode =
  | 'AZ_FORBIDDEN'
  | 'AZ_SUPPORT_NOT_GRANTED'
  | 'AZ_INVALID_INPUT'
  | 'AZ_INVALID_AMOUNT'
  | 'AZ_CONTACT_REQUIRED'
  | 'AZ_EXCEEDS_DEBT'
  | 'AZ_SAME_ACCOUNT'
  | 'AZ_ALREADY_REVERSED'
  | 'AZ_NOT_FOUND'
  | 'AZ_NO_MONEY_RECEIVED'

export class RpcError extends Error {
  constructor(
    public readonly code: AzariaErrorCode | 'network' | 'generic',
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'RpcError'
  }

  /** i18n key to show the user. */
  get i18nKey() {
    return `errors.${this.code}`
  }
}

function isNetworkFailure(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /fetch failed|Failed to fetch|NetworkError|Load failed|ECONN|ETIMEDOUT/i.test(msg)
}

/**
 * Call a Postgres RPC function and normalise errors.
 * Functions raise `AZ_*` codes in the message (e.g. `AZ_EXCEEDS_DEBT`), which we surface as `RpcError.code`.
 */
export async function callRpc<T = unknown>(name: string, params: Record<string, unknown>): Promise<T> {
  let response
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response = await (getSupabase().rpc as any)(name, params)
  } catch (err) {
    throw new RpcError(isNetworkFailure(err) ? 'network' : 'generic', String(err), err)
  }
  const { data, error } = response as { data: T; error: { message: string; code?: string } | null }
  if (error) {
    const match = /AZ_[A-Z_]+/.exec(error.message)
    if (match) throw new RpcError(match[0] as AzariaErrorCode, error.message, error)
    throw new RpcError(isNetworkFailure(error) ? 'network' : 'generic', error.message, error)
  }
  return data
}
