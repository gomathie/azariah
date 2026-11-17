import { callRpc } from '@/lib/supabase/rpc'

export interface ShopDocument {
  document_id: string
  kind: 'invoice' | 'receipt'
  status: 'issued' | 'void'
  display_number: string
  transaction_id: string
  business_name: string
  contact_name: string | null
  description: string | null
  total_minor: number
  received_minor: number
  outstanding_minor: number
  currency_code: string
  business_date: string
}

export async function issueDocument(
  businessId: string,
  transactionId: string,
  kind: 'invoice' | 'receipt',
): Promise<ShopDocument> {
  return callRpc<ShopDocument>('rpc_issue_document', {
    p_client_operation_id: crypto.randomUUID(),
    p_business_id: businessId,
    p_transaction_id: transactionId,
    p_kind: kind,
  })
}

export async function getDocument(businessId: string, documentId: string): Promise<ShopDocument> {
  return callRpc<ShopDocument>('rpc_get_document', {
    p_business_id: businessId,
    p_document_id: documentId,
  })
}
