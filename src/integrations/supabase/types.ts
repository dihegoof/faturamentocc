export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_invitations: {
        Row: {
          created_at: string
          display_name: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      app_users: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          id: string
          password: string
          profile: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string
          id?: string
          password: string
          profile?: string
          username: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          id?: string
          password?: string
          profile?: string
          username?: string
        }
        Relationships: []
      }
      cargo_history: {
        Row: {
          created_at: string
          details: string | null
          event: string
          from_status: string | null
          id: string
          load_id: string
          profile: string | null
          to_status: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          event: string
          from_status?: string | null
          id?: string
          load_id: string
          profile?: string | null
          to_status?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          event?: string
          from_status?: string | null
          id?: string
          load_id?: string
          profile?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargo_history_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "cargo_loads"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_loads: {
        Row: {
          carrier: string | null
          corte_reason: string | null
          created_at: string
          cte_received_at: string | null
          cte_requested_at: string | null
          destination: string | null
          destination_code: string | null
          dt: string | null
          dt_original: string | null
          finalized_at: string | null
          has_exit: boolean | null
          id: string
          invoice_numbers: string | null
          load_date: string
          load_number: string
          origin: string | null
          pallet_order: string | null
          pallets: number | null
          plate: string | null
          plate_original: string | null
          product_order: string | null
          source: string | null
          status: string
          status_changed_at: string
          wait_started_at: string
        }
        Insert: {
          carrier?: string | null
          corte_reason?: string | null
          created_at?: string
          cte_received_at?: string | null
          cte_requested_at?: string | null
          destination?: string | null
          destination_code?: string | null
          dt?: string | null
          dt_original?: string | null
          finalized_at?: string | null
          has_exit?: boolean | null
          id?: string
          invoice_numbers?: string | null
          load_date?: string
          load_number: string
          origin?: string | null
          pallet_order?: string | null
          pallets?: number | null
          plate?: string | null
          plate_original?: string | null
          product_order?: string | null
          source?: string | null
          status?: string
          status_changed_at?: string
          wait_started_at?: string
        }
        Update: {
          carrier?: string | null
          corte_reason?: string | null
          created_at?: string
          cte_received_at?: string | null
          cte_requested_at?: string | null
          destination?: string | null
          destination_code?: string | null
          dt?: string | null
          dt_original?: string | null
          finalized_at?: string | null
          has_exit?: boolean | null
          id?: string
          invoice_numbers?: string | null
          load_date?: string
          load_number?: string
          origin?: string | null
          pallet_order?: string | null
          pallets?: number | null
          plate?: string | null
          plate_original?: string | null
          product_order?: string | null
          source?: string | null
          status?: string
          status_changed_at?: string
          wait_started_at?: string
        }
        Relationships: []
      }
      cargo_products: {
        Row: {
          boxes: number | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          load_id: string
        }
        Insert: {
          boxes?: number | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          load_id: string
        }
        Update: {
          boxes?: number | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          load_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargo_products_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "cargo_loads"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          center_code: string | null
          cnpj: string | null
          created_at: string
          customer_code: string | null
          id: string
          itinerary: string | null
          name: string
          notes: string | null
          pallet_type: string | null
        }
        Insert: {
          center_code?: string | null
          cnpj?: string | null
          created_at?: string
          customer_code?: string | null
          id?: string
          itinerary?: string | null
          name: string
          notes?: string | null
          pallet_type?: string | null
        }
        Update: {
          center_code?: string | null
          cnpj?: string | null
          created_at?: string
          customer_code?: string | null
          id?: string
          itinerary?: string | null
          name?: string
          notes?: string | null
          pallet_type?: string | null
        }
        Relationships: []
      }
      cte_contacts: {
        Row: {
          carrier: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          display_name: string
          email: string
          id: string
        }
        Insert: {
          active?: boolean
          display_name?: string
          email: string
          id: string
        }
        Update: {
          active?: boolean
          display_name?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      platform_has_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "faturamento" | "remessa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "faturamento", "remessa"],
    },
  },
} as const
