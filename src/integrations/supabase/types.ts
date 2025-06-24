export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_name: string
          account_number_last4: string | null
          account_type: string
          balance: number | null
          bank_name: string
          created_at: string | null
          currency: string
          encrypted_data: string | null
          encryption_metadata: Json | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number_last4?: string | null
          account_type: string
          balance?: number | null
          bank_name: string
          created_at?: string | null
          currency?: string
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number_last4?: string | null
          account_type?: string
          balance?: number | null
          bank_name?: string
          created_at?: string | null
          currency?: string
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      biometric_credentials: {
        Row: {
          counter: number | null
          created_at: string | null
          credential_id: string
          device_info: Json | null
          id: string
          last_used: string | null
          public_key: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          counter?: number | null
          created_at?: string | null
          credential_id: string
          device_info?: Json | null
          id?: string
          last_used?: string | null
          public_key: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          counter?: number | null
          created_at?: string | null
          credential_id?: string
          device_info?: Json | null
          id?: string
          last_used?: string | null
          public_key?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          allocated_amount: number
          budget_id: string
          category_id: string
          created_at: string | null
          id: string
          spent_amount: number | null
          updated_at: string | null
        }
        Insert: {
          allocated_amount: number
          budget_id: string
          category_id: string
          created_at?: string | null
          id?: string
          spent_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          allocated_amount?: number
          budget_id?: string
          category_id?: string
          created_at?: string | null
          id?: string
          spent_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string | null
          encrypted_data: string | null
          encryption_metadata: Json | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          period_type: string
          start_date: string
          total_expenses: number | null
          total_income: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          period_type?: string
          start_date: string
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          period_type?: string
          start_date?: string
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          encrypted_data: string | null
          encryption_metadata: Json | null
          icon: string | null
          id: string
          is_income: boolean | null
          name: string
          parent_category_id: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          icon?: string | null
          id?: string
          is_income?: boolean | null
          name: string
          parent_category_id?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          icon?: string | null
          id?: string
          is_income?: boolean | null
          name?: string
          parent_category_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          created_at: string | null
          current_amount: number | null
          encrypted_data: string | null
          encryption_metadata: Json | null
          goal_type: string
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          target_amount: number
          target_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_amount?: number | null
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          target_amount: number
          target_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_amount?: number | null
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string | null
          description: string
          encrypted_data: string | null
          encryption_metadata: Json | null
          external_id: string | null
          id: string
          imported_from: string | null
          is_income: boolean | null
          is_recurring: boolean | null
          merchant: string | null
          notes: string | null
          tags: string[] | null
          transaction_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string | null
          description: string
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          external_id?: string | null
          id?: string
          imported_from?: string | null
          is_income?: boolean | null
          is_recurring?: boolean | null
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
          transaction_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string | null
          description?: string
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          external_id?: string | null
          id?: string
          imported_from?: string | null
          is_income?: boolean | null
          is_recurring?: boolean | null
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
          transaction_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_encryption_keys: {
        Row: {
          created_at: string | null
          encrypted_private_key: string
          id: string
          key_derivation_salt: string
          public_key: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_private_key: string
          id?: string
          key_derivation_salt: string
          public_key: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_private_key?: string
          id?: string
          key_derivation_salt?: string
          public_key?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_pins: {
        Row: {
          created_at: string | null
          id: string
          pin_hash: string
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pin_hash: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pin_hash?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          country: string
          created_at: string | null
          currency: string
          emergency_fund_months: number | null
          encrypted_data: string | null
          encryption_metadata: Json | null
          first_name: string | null
          id: string
          last_name: string | null
          onboarding_completed: boolean | null
          pins_salt: string | null
          updated_at: string | null
        }
        Insert: {
          country?: string
          created_at?: string | null
          currency?: string
          emergency_fund_months?: number | null
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          first_name?: string | null
          id: string
          last_name?: string | null
          onboarding_completed?: boolean | null
          pins_salt?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          currency?: string
          emergency_fund_months?: number | null
          encrypted_data?: string | null
          encryption_metadata?: Json | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean | null
          pins_salt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          auth_method: string
          created_at: string | null
          expires_at: string
          id: string
          last_used_at: string | null
          session_token: string
          user_id: string | null
        }
        Insert: {
          auth_method: string
          created_at?: string | null
          expires_at: string
          id?: string
          last_used_at?: string | null
          session_token: string
          user_id?: string | null
        }
        Update: {
          auth_method?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          last_used_at?: string | null
          session_token?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
