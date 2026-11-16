
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
"audit":
{ Args: { "p_action": string,"p_business_id": string,"p_data"?: Json,"p_entity_id": string,"p_entity_type": string }; Returns: undefined
                           },
"currency_minor_unit":
{ Args: { "p_currency_code": string }; Returns: number
                           },
"is_member":
{ Args: { "p_business_id": string,"p_roles"?: (Database["public"]['Enums']["business_role"])[] }; Returns: boolean
                           },
"rpc_create_business_and_owner":
{ Args: { "p_business_type": string,"p_client_operation_id": string,"p_country_code": string,"p_currency_code": string,"p_name": string,"p_timezone": string }; Returns: Json
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
