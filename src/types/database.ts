
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attachments": {
                  Row: {
                    "business_id": string,"created_at": string,"created_by": string,"id": string,"mime_type": string,"size_bytes": number,"storage_path": string,"transaction_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"created_by": string,"id"?: string,"mime_type": string,"size_bytes": number,"storage_path": string,"transaction_id"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"mime_type"?: string,"size_bytes"?: number,"storage_path"?: string,"transaction_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attachments_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_events": {
                  Row: {
                    "action": string,"actor_id": string | null,"business_id": string | null,"created_at": string,"data": Json | null,"entity_id": string | null,"entity_type": string | null,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"business_id"?: string | null,"created_at"?: string,"data"?: Json | null,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"business_id"?: string | null,"created_at"?: string,"data"?: Json | null,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_events_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"billing_events": {
                  Row: {
                    "event_key": string,"event_type": string,"id": string,"payload": NonNullable<Json>,"processed_at": string | null,"received_at": string,"reference": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "event_key": string,"event_type": string,"id"?: string,"payload": NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"reference"?: string | null
                  }
                  Update: {
                    "event_key"?: string,"event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"reference"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"billing_payments": {
                  Row: {
                    "amount_minor": number,"business_id": string,"channel": string | null,"created_at": string,"created_by": string | null,"currency_code": string,"discount_code_id": string | null,"id": string,"list_amount_minor": number,"months": number,"paid_at": string | null,"percent_off": number,"product_code": string,"reference": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"business_id": string,"channel"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency_code": string,"discount_code_id"?: string | null,"id"?: string,"list_amount_minor": number,"months": number,"paid_at"?: string | null,"percent_off"?: number,"product_code": string,"reference": string,"status"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"business_id"?: string,"channel"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency_code"?: string,"discount_code_id"?: string | null,"id"?: string,"list_amount_minor"?: number,"months"?: number,"paid_at"?: string | null,"percent_off"?: number,"product_code"?: string,"reference"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "billing_payments_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_payments_discount_code_id_fkey"
      columns: ["discount_code_id"]
isOneToOne: false
      referencedRelation: "discount_codes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_payments_product_code_fkey"
      columns: ["product_code"]
isOneToOne: false
      referencedRelation: "billing_products"
      referencedColumns: ["code"]
    }
                  ]
                },"billing_products": {
                  Row: {
                    "active": boolean,"amount_minor": number,"code": string,"currency_code": string,"months": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"amount_minor": number,"code": string,"currency_code"?: string,"months": number,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"amount_minor"?: number,"code"?: string,"currency_code"?: string,"months"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"billing_settings": {
                  Row: {
                    "id": boolean,"payments_on": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: boolean,"payments_on"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "id"?: boolean,"payments_on"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"business_entitlements": {
                  Row: {
                    "business_id": string,"plus_until": string | null,"trial_used": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"plus_until"?: string | null,"trial_used"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"plus_until"?: string | null,"trial_used"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_entitlements_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_memberships": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"invited_email": string | null,"role": Database["public"]['Enums']["business_role"],"status": Database["public"]['Enums']["membership_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"invited_email"?: string | null,"role"?: Database["public"]['Enums']["business_role"],"status"?: Database["public"]['Enums']["membership_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"invited_email"?: string | null,"role"?: Database["public"]['Enums']["business_role"],"status"?: Database["public"]['Enums']["membership_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_memberships_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_payment_switches": {
                  Row: {
                    "business_id": string,"payments_on": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"payments_on": boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"payments_on"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_payment_switches_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_preferences": {
                  Row: {
                    "business_id": string,"settings": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"settings"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"settings"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_preferences_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "business_type": string,"country_code": string,"created_at": string,"created_by": string,"currency_code": string,"id": string,"minor_unit": number,"name": string,"status": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_type"?: string,"country_code": string,"created_at"?: string,"created_by": string,"currency_code": string,"id"?: string,"minor_unit"?: number,"name": string,"status"?: string,"timezone": string,"updated_at"?: string
                  }
                  Update: {
                    "business_type"?: string,"country_code"?: string,"created_at"?: string,"created_by"?: string,"currency_code"?: string,"id"?: string,"minor_unit"?: number,"name"?: string,"status"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"is_active": boolean,"kind": Database["public"]['Enums']["category_kind"],"name": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"kind": Database["public"]['Enums']["category_kind"],"name": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["category_kind"],"name"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"contacts": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"is_active": boolean,"kind": string,"name": string,"notes": string | null,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"kind"?: string,"name": string,"notes"?: string | null,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"kind"?: string,"name"?: string,"notes"?: string | null,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contacts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"credit_allocations": {
                  Row: {
                    "amount_minor": number,"business_id": string,"created_at": string,"id": string,"receivable_id": string,"transaction_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"business_id": string,"created_at"?: string,"id"?: string,"receivable_id": string,"transaction_id": string
                  }
                  Update: {
                    "amount_minor"?: number,"business_id"?: string,"created_at"?: string,"id"?: string,"receivable_id"?: string,"transaction_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "credit_allocations_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "credit_allocations_receivable_id_fkey"
      columns: ["receivable_id"]
isOneToOne: false
      referencedRelation: "receivables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "credit_allocations_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"discount_codes": {
                  Row: {
                    "active": boolean,"code": string,"created_at": string,"created_by": string | null,"id": string,"max_uses": number | null,"note": string | null,"percent_off": number,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"code": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"max_uses"?: number | null,"note"?: string | null,"percent_off": number,"valid_until"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"max_uses"?: number | null,"note"?: string | null,"percent_off"?: number,"valid_until"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"document_counters": {
                  Row: {
                    "business_id": string,"kind": string,"last_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"kind": string,"last_number"?: number
                  }
                  Update: {
                    "business_id"?: string,"kind"?: string,"last_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_counters_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "business_date": string,"business_id": string,"business_name": string,"client_operation_id": string,"contact_name": string | null,"created_at": string,"created_by": string,"currency_code": string,"description": string | null,"display_number": string,"id": string,"kind": string,"number": number,"outstanding_minor": number,"received_minor": number,"status": string,"total_minor": number,"transaction_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_date": string,"business_id": string,"business_name": string,"client_operation_id": string,"contact_name"?: string | null,"created_at"?: string,"created_by": string,"currency_code": string,"description"?: string | null,"display_number": string,"id"?: string,"kind": string,"number": number,"outstanding_minor": number,"received_minor": number,"status"?: string,"total_minor": number,"transaction_id": string
                  }
                  Update: {
                    "business_date"?: string,"business_id"?: string,"business_name"?: string,"client_operation_id"?: string,"contact_name"?: string | null,"created_at"?: string,"created_by"?: string,"currency_code"?: string,"description"?: string | null,"display_number"?: string,"id"?: string,"kind"?: string,"number"?: number,"outstanding_minor"?: number,"received_minor"?: number,"status"?: string,"total_minor"?: number,"transaction_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"money_accounts": {
                  Row: {
                    "business_id": string,"created_at": string,"currency_code": string,"id": string,"is_active": boolean,"is_default": boolean,"name": string,"sort_order": number,"type": Database["public"]['Enums']["account_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"currency_code": string,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name": string,"sort_order"?: number,"type": Database["public"]['Enums']["account_type"],"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"currency_code"?: string,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name"?: string,"sort_order"?: number,"type"?: Database["public"]['Enums']["account_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "money_accounts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"money_movements": {
                  Row: {
                    "amount_minor": number,"business_date": string,"business_id": string,"created_at": string,"id": string,"money_account_id": string,"occurred_at": string,"transaction_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"business_date": string,"business_id": string,"created_at"?: string,"id"?: string,"money_account_id": string,"occurred_at": string,"transaction_id": string
                  }
                  Update: {
                    "amount_minor"?: number,"business_date"?: string,"business_id"?: string,"created_at"?: string,"id"?: string,"money_account_id"?: string,"occurred_at"?: string,"transaction_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "money_movements_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "money_movements_money_account_id_fkey"
      columns: ["money_account_id"]
isOneToOne: false
      referencedRelation: "money_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "money_movements_money_account_id_fkey"
      columns: ["money_account_id"]
isOneToOne: false
      referencedRelation: "v_account_balances"
      referencedColumns: ["money_account_id"]
    },{
      foreignKeyName: "money_movements_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_admins": {
                  Row: {
                    "added_by": string | null,"created_at": string,"is_super": boolean,"note": string | null,"rights": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"is_super"?: boolean,"note"?: string | null,"rights"?: (string)[],"user_id": string
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"is_super"?: boolean,"note"?: string | null,"rights"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"locale": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"locale"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"locale"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"receivables": {
                  Row: {
                    "amount_minor": number,"business_id": string,"contact_id": string,"created_at": string,"due_date": string | null,"id": string,"status": string,"transaction_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"business_id": string,"contact_id": string,"created_at"?: string,"due_date"?: string | null,"id"?: string,"status"?: string,"transaction_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"business_id"?: string,"contact_id"?: string,"created_at"?: string,"due_date"?: string | null,"id"?: string,"status"?: string,"transaction_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "receivables_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receivables_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receivables_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: true
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_people": {
                  Row: {
                    "business_id": string,"created_at": string,"device_name": string,"id": string,"name": string,"role": Database["public"]['Enums']["business_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"device_name": string,"id"?: string,"name": string,"role"?: Database["public"]['Enums']["business_role"]
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"device_name"?: string,"id"?: string,"name"?: string,"role"?: Database["public"]['Enums']["business_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_people_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"support_grants": {
                  Row: {
                    "business_id": string,"created_at": string,"expires_at": string,"granted_by": string,"id": string,"reason": string | null,"revoked_at": string | null,"revoked_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"expires_at": string,"granted_by": string,"id"?: string,"reason"?: string | null,"revoked_at"?: string | null,"revoked_by"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"expires_at"?: string,"granted_by"?: string,"id"?: string,"reason"?: string | null,"revoked_at"?: string | null,"revoked_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "support_grants_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"support_sessions": {
                  Row: {
                    "admin_id": string,"business_id": string,"can_edit": boolean,"expires_at": string,"opened_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_id": string,"business_id": string,"can_edit"?: boolean,"expires_at": string,"opened_at"?: string
                  }
                  Update: {
                    "admin_id"?: string,"business_id"?: string,"can_edit"?: boolean,"expires_at"?: string,"opened_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "support_sessions_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"sync_operations": {
                  Row: {
                    "actor_id": string | null,"business_id": string | null,"client_operation_id": string,"created_at": string,"id": string,"kind": string,"result": Json | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"business_id"?: string | null,"client_operation_id": string,"created_at"?: string,"id"?: string,"kind": string,"result"?: Json | null,"status"?: string
                  }
                  Update: {
                    "actor_id"?: string | null,"business_id"?: string | null,"client_operation_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"result"?: Json | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sync_operations_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"transactions": {
                  Row: {
                    "amount_minor": number,"business_date": string,"business_id": string,"category_id": string | null,"client_operation_id": string,"contact_id": string | null,"created_at": string,"created_by": string,"currency_code": string,"description": string | null,"id": string,"kind": Database["public"]['Enums']["transaction_kind"],"note": string | null,"occurred_at": string,"reference": string | null,"reversed_by_transaction_id": string | null,"reverses_transaction_id": string | null,"status": Database["public"]['Enums']["transaction_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"business_date": string,"business_id": string,"category_id"?: string | null,"client_operation_id": string,"contact_id"?: string | null,"created_at"?: string,"created_by": string,"currency_code": string,"description"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["transaction_kind"],"note"?: string | null,"occurred_at": string,"reference"?: string | null,"reversed_by_transaction_id"?: string | null,"reverses_transaction_id"?: string | null,"status"?: Database["public"]['Enums']["transaction_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"business_date"?: string,"business_id"?: string,"category_id"?: string | null,"client_operation_id"?: string,"contact_id"?: string | null,"created_at"?: string,"created_by"?: string,"currency_code"?: string,"description"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["transaction_kind"],"note"?: string | null,"occurred_at"?: string,"reference"?: string | null,"reversed_by_transaction_id"?: string | null,"reverses_transaction_id"?: string | null,"status"?: Database["public"]['Enums']["transaction_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_reversed_by_transaction_id_fkey"
      columns: ["reversed_by_transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_reverses_transaction_id_fkey"
      columns: ["reverses_transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_account_balances": {
                  Row: {
                    "balance_minor": number | null,"business_id": string,"currency_code": string,"is_active": boolean,"is_default": boolean,"money_account_id": string,"name": string,"sort_order": number,"type": Database["public"]['Enums']["account_type"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "money_accounts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"v_customer_balances": {
                  Row: {
                    "business_id": string,"contact_id": string,"outstanding_minor": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "receivables_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receivables_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "assert_member":
{ Args: { "p_business_id": string,"p_roles"?: (Database["public"]['Enums']["business_role"])[] }; Returns: undefined
                           },
"assert_platform_admin":
{ Args: { "p_right"?: string }; Returns: undefined
                           },
"assert_super_admin":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"audit":
{ Args: { "p_action": string,"p_business_id": string,"p_data"?: Json,"p_entity_id": string,"p_entity_type": string }; Returns: undefined
                           },
"billing_apply_payment":
{ Args: { "p_amount_minor": number,"p_channel"?: string,"p_currency_code": string,"p_paid_at"?: string,"p_reference": string }; Returns: Json
                           },
"billing_event_processed":
{ Args: { "p_event_key": string }; Returns: undefined
                           },
"billing_find_discount":
{ Args: { "p_code": string }; Returns: {
              "active": boolean,
"code": string,
"created_at": string,
"created_by": string | null,
"id": string,
"max_uses": number | null,
"note": string | null,
"percent_off": number,
"valid_until": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "discount_codes"
        isOneToOne: true
        isSetofReturn: false
      } },
"billing_grace":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"billing_mark_paid":
{ Args: { "p_channel": string,"p_paid_at": string,"p_payment_id": string }; Returns: Json
                           },
"billing_payments_on":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           } |
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"billing_record_event":
{ Args: { "p_event_key": string,"p_event_type": string,"p_payload": Json,"p_reference": string }; Returns: boolean
                           },
"business_local_date":
{ Args: { "p_business_id": string,"p_occurred_at": string }; Returns: string
                           },
"clean_text":
{ Args: { "p_text": string }; Returns: string
                           },
"currency_minor_unit":
{ Args: { "p_currency_code": string }; Returns: number
                           },
"document_payload":
{ Args: { "p_id": string }; Returns: Json
                           },
"has_admin_right":
{ Args: { "p_right": string }; Returns: boolean
                           },
"has_plus":
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"has_support_access":
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"has_support_edit":
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"is_member":
{ Args: { "p_business_id": string,"p_roles"?: (Database["public"]['Enums']["business_role"])[] }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"post_money_event":
{ Args: { "p_amount_minor": number,"p_audit_action": string,"p_business_date": string,"p_business_id": string,"p_category_id": string,"p_category_kind": Database["public"]['Enums']["category_kind"],"p_client_operation_id": string,"p_description": string,"p_kind": Database["public"]['Enums']["transaction_kind"],"p_money_account_id": string,"p_movement_sign": number,"p_note": string,"p_occurred_at": string,"p_sync_kind": string }; Returns: Json
                           },
"rpc_add_shop_person":
{ Args: { "p_business_id": string,"p_client_operation_id": string,"p_device_name": string,"p_name": string,"p_role": string }; Returns: Json
                           },
"rpc_admin_billing_settings":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rpc_admin_close_business":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"rpc_admin_create_discount_code":
{ Args: { "p_code": string,"p_max_uses"?: number,"p_note"?: string,"p_percent_off": number,"p_valid_days"?: number }; Returns: Json
                           },
"rpc_admin_list_accounts":
{ Args: { "p_before"?: string,"p_limit"?: number,"p_search"?: string }; Returns: Json
                           },
"rpc_admin_list_admins":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rpc_admin_list_businesses":
{ Args: { "p_before"?: string,"p_limit"?: number,"p_search"?: string }; Returns: Json
                           },
"rpc_admin_list_discount_codes":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rpc_admin_open_business":
{ Args: { "p_business_id": string,"p_edit"?: boolean }; Returns: Json
                           },
"rpc_admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rpc_admin_remove_admin":
{ Args: { "p_user_id": string }; Returns: Json
                           },
"rpc_admin_save_admin":
{ Args: { "p_email": string,"p_is_super"?: boolean,"p_note"?: string,"p_rights": (string)[] }; Returns: Json
                           },
"rpc_admin_set_business_payments":
{ Args: { "p_business_id": string,"p_mode": string }; Returns: Json
                           },
"rpc_admin_set_business_status":
{ Args: { "p_business_id": string,"p_reason": string,"p_status": string }; Returns: Json
                           },
"rpc_admin_set_discount_code_active":
{ Args: { "p_active": boolean,"p_id": string }; Returns: Json
                           },
"rpc_admin_set_payments_on":
{ Args: { "p_on": boolean }; Returns: Json
                           },
"rpc_admin_update_billing_product":
{ Args: { "p_active": boolean,"p_amount_minor": number,"p_code": string }; Returns: Json
                           },
"rpc_admin_whoami":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rpc_billing_start_payment":
{ Args: { "p_business_id": string,"p_client_operation_id": string,"p_discount_code"?: string,"p_product_code": string }; Returns: Json
                           },
"rpc_billing_status":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"rpc_change_membership":
{ Args: { "p_business_id": string,"p_client_operation_id": string,"p_membership_id": string,"p_role"?: string,"p_status"?: string }; Returns: Json
                           },
"rpc_check_discount_code":
{ Args: { "p_business_id": string,"p_code": string }; Returns: Json
                           },
"rpc_create_business_and_owner":
{ Args: { "p_business_type": string,"p_client_operation_id": string,"p_country_code": string,"p_currency_code": string,"p_name": string,"p_timezone": string }; Returns: Json
                           },
"rpc_create_sale":
{ Args: { "p_amount_minor": number,"p_business_id": string,"p_category_id"?: string,"p_client_operation_id": string,"p_contact_id"?: string,"p_description"?: string,"p_money_account_id"?: string,"p_note"?: string,"p_occurred_at": string,"p_received_minor": number }; Returns: Json
                           },
"rpc_export_business_data":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"rpc_get_customer_statement":
{ Args: { "p_business_id": string,"p_contact_id": string,"p_from"?: string,"p_to"?: string }; Returns: Json
                           },
"rpc_get_dashboard_summary":
{ Args: { "p_business_id": string,"p_from"?: string,"p_to"?: string }; Returns: Json
                           },
"rpc_get_document":
{ Args: { "p_business_id": string,"p_document_id": string }; Returns: Json
                           },
"rpc_invite_member":
{ Args: { "p_business_id": string,"p_client_operation_id": string,"p_email": string,"p_role": string }; Returns: Json
                           },
"rpc_issue_document":
{ Args: { "p_business_id": string,"p_client_operation_id": string,"p_kind": string,"p_transaction_id": string }; Returns: Json
                           },
"rpc_list_shop_people":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"rpc_list_support_access":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"rpc_record_collection":
{ Args: { "p_amount_minor": number,"p_business_id": string,"p_client_operation_id": string,"p_contact_id": string,"p_money_account_id": string,"p_note"?: string,"p_occurred_at": string }; Returns: Json
                           },
"rpc_record_expense":
{ Args: { "p_amount_minor": number,"p_business_id": string,"p_category_id": string,"p_client_operation_id": string,"p_description"?: string,"p_money_account_id": string,"p_note"?: string,"p_occurred_at": string }; Returns: Json
                           },
"rpc_record_opening_balance":
{ Args: { "p_amount_minor": number,"p_as_of": string,"p_business_id": string,"p_client_operation_id": string,"p_money_account_id": string }; Returns: Json
                           },
"rpc_record_owner_movement":
{ Args: { "p_amount_minor": number,"p_business_id": string,"p_client_operation_id": string,"p_direction": string,"p_money_account_id": string,"p_note"?: string,"p_occurred_at": string }; Returns: Json
                           },
"rpc_record_stock_purchase":
{ Args: { "p_amount_minor": number,"p_business_id": string,"p_category_id": string,"p_client_operation_id": string,"p_description"?: string,"p_money_account_id": string,"p_note"?: string,"p_occurred_at": string }; Returns: Json
                           },
"rpc_report_account_statement":
{ Args: { "p_business_id": string,"p_filters"?: Json,"p_from": string,"p_to": string }; Returns: Json
                           },
"rpc_report_cash_movement":
{ Args: { "p_business_id": string,"p_filters"?: Json,"p_from": string,"p_to": string }; Returns: Json
                           },
"rpc_report_customer_debts":
{ Args: { "p_business_id": string,"p_filters"?: Json,"p_from": string,"p_to": string }; Returns: Json
                           },
"rpc_report_expenses":
{ Args: { "p_business_id": string,"p_filters"?: Json,"p_from": string,"p_to": string }; Returns: Json
                           },
"rpc_report_money_received":
{ Args: { "p_business_id": string,"p_filters"?: Json,"p_from": string,"p_to": string }; Returns: Json
                           },
"rpc_report_sales":
{ Args: { "p_business_id": string,"p_filters"?: Json,"p_from": string,"p_to": string }; Returns: Json
                           },
"rpc_report_stock_purchases":
{ Args: { "p_business_id": string,"p_filters"?: Json,"p_from": string,"p_to": string }; Returns: Json
                           },
"rpc_reverse_transaction":
{ Args: { "p_business_id": string,"p_client_operation_id": string,"p_reason": string,"p_transaction_id": string }; Returns: Json
                           },
"rpc_start_trial":
{ Args: { "p_business_id": string,"p_client_operation_id": string }; Returns: Json
                           },
"rpc_transfer_between_accounts":
{ Args: { "p_amount_minor": number,"p_business_id": string,"p_client_operation_id": string,"p_from_account_id": string,"p_note"?: string,"p_occurred_at": string,"p_to_account_id": string }; Returns: Json
                           },
"sync_record":
{ Args: { "p_business_id": string,"p_client_operation_id": string,"p_kind": string,"p_result": Json }; Returns: Json
                           },
"sync_replay":
{ Args: { "p_client_operation_id": string }; Returns: Json
                           }
          }
          Enums: {
            "account_type": "cash"|"mobile_money"|"bank"|"other","business_role": "owner"|"manager"|"staff"|"viewer","category_kind": "sale"|"operating_expense"|"stock_purchase","membership_status": "active"|"invited"|"removed","transaction_kind": "sale"|"collection"|"expense"|"stock_purchase"|"transfer"|"owner_contribution"|"owner_withdrawal"|"opening_balance"|"reversal","transaction_status": "posted"|"reversed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_type": ["cash", "mobile_money", "bank", "other"],"business_role": ["owner", "manager", "staff", "viewer"],"category_kind": ["sale", "operating_expense", "stock_purchase"],"membership_status": ["active", "invited", "removed"],"transaction_kind": ["sale", "collection", "expense", "stock_purchase", "transfer", "owner_contribution", "owner_withdrawal", "opening_balance", "reversal"],"transaction_status": ["posted", "reversed"]
          }
        }
} as const
