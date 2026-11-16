/**
 * Placeholder until the schema migration exists.
 * Regenerate with: npx supabase gen types typescript --local > src/types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
