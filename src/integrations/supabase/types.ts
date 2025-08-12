export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
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
            referencedRelation: "project_stats"
            referencedColumns: ["project_id"]
          },
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
      project_stats: {
        Row: {
          max_unit_area: number | null
          max_unit_price: number | null
          min_unit_area: number | null
          min_unit_price: number | null
          project_id: string | null
          rooms_available: number[] | null
          units_count: number | null
        }
        Relationships: []
      }
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
          latitude: number | null
          longitude: number | null
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
          units_count: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
