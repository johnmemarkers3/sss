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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      access_keys: {
        Row: {
          assigned_email: string | null
          created_at: string
          created_by: string | null
          duration_days: number
          expires_at: string | null
          id: string
          is_used: boolean
          key: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          assigned_email?: string | null
          created_at?: string
          created_by?: string | null
          duration_days: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          key: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          assigned_email?: string | null
          created_at?: string
          created_by?: string | null
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          key?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      project_stats: {
        Row: {
          max_unit_area: number | null
          max_unit_price: number | null
          min_unit_area: number | null
          min_unit_price: number | null
          project_id: string
          rooms_available: number[] | null
          units_count: number | null
        }
        Insert: {
          max_unit_area?: number | null
          max_unit_price?: number | null
          min_unit_area?: number | null
          min_unit_price?: number | null
          project_id: string
          rooms_available?: number[] | null
          units_count?: number | null
        }
        Update: {
          max_unit_area?: number | null
          max_unit_price?: number | null
          min_unit_area?: number | null
          min_unit_price?: number | null
          project_id?: string
          rooms_available?: number[] | null
          units_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          amenities: string[]
          area_max: number | null
          area_min: number | null
          city: string
          created_at: string
          deadline: string | null
          description: string | null
          district: string
          id: string
          image_urls: string[]
          infrastructure_nearby: string[]
          latitude: number | null
          longitude: number | null
          map_embed_url: string | null
          name: string
          price_max: number
          price_min: number
          slug: string
          status: Database["public"]["Enums"]["property_status"]
          tags: string[]
          thumbnail_urls: string[]
          updated_at: string
        }
        Insert: {
          address: string
          amenities?: string[]
          area_max?: number | null
          area_min?: number | null
          city: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          district: string
          id?: string
          image_urls?: string[]
          infrastructure_nearby?: string[]
          latitude?: number | null
          longitude?: number | null
          map_embed_url?: string | null
          name: string
          price_max?: number
          price_min?: number
          slug: string
          status?: Database["public"]["Enums"]["property_status"]
          tags?: string[]
          thumbnail_urls?: string[]
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: string[]
          area_max?: number | null
          area_min?: number | null
          city?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          district?: string
          id?: string
          image_urls?: string[]
          infrastructure_nearby?: string[]
          latitude?: number | null
          longitude?: number | null
          map_embed_url?: string | null
          name?: string
          price_max?: number
          price_min?: number
          slug?: string
          status?: Database["public"]["Enums"]["property_status"]
          tags?: string[]
          thumbnail_urls?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          area: number
          created_at: string
          floor: number | null
          id: string
          image_urls: string[]
          plan_image_thumb_url: string | null
          plan_image_url: string | null
          price: number
          project_id: string
          rooms: number
          status: Database["public"]["Enums"]["property_status"]
          thumbnail_urls: string[]
          title: string | null
          updated_at: string
        }
        Insert: {
          area: number
          created_at?: string
          floor?: number | null
          id?: string
          image_urls?: string[]
          plan_image_thumb_url?: string | null
          plan_image_url?: string | null
          price: number
          project_id: string
          rooms: number
          status?: Database["public"]["Enums"]["property_status"]
          thumbnail_urls?: string[]
          title?: string | null
          updated_at?: string
        }
        Update: {
          area?: number
          created_at?: string
          floor?: number | null
          id?: string
          image_urls?: string[]
          plan_image_thumb_url?: string | null
          plan_image_url?: string | null
          price?: number
          project_id?: string
          rooms?: number
          status?: Database["public"]["Enums"]["property_status"]
          thumbnail_urls?: string[]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      projects_with_stats: {
        Row: {
          address: string | null
          amenities: string[] | null
          area_max: number | null
          area_min: number | null
          city: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          district: string | null
          id: string | null
          image_urls: string[] | null
          infrastructure_nearby: string[] | null
          latitude: number | null
          longitude: number | null
          map_embed_url: string | null
          max_unit_area: number | null
          max_unit_price: number | null
          min_unit_area: number | null
          min_unit_price: number | null
          name: string | null
          price_max: number | null
          price_min: number | null
          rooms_available: number[] | null
          slug: string | null
          status: Database["public"]["Enums"]["property_status"] | null
          tags: string[] | null
          thumbnail_urls: string[] | null
          units_count: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_access_key: {
        Args: { key_to_activate: string; user_id: string }
        Returns: Json
      }
      check_key_availability: {
        Args: { key_to_check: string }
        Returns: Json
      }
      check_key_availability_secure: {
        Args: { key_to_check: string }
        Returns: Json
      }
      debug_key_activation: {
        Args: { key_to_check: string }
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      log_security_event: {
        Args: { action_name: string; event_details?: Json }
        Returns: undefined
      }
      recalculate_all_project_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      recalculate_project_stats: {
        Args: { project_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      property_status: "В продаже" | "Сдан" | "Забронировано"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      property_status: ["В продаже", "Сдан", "Забронировано"],
    },
  },
} as const
