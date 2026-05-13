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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      demand_types: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_tasks: {
        Row: {
          meeting_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          meeting_id: string
          task_id: string
          user_id: string
        }
        Update: {
          meeting_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          completed_at: string | null
          context: string | null
          created_at: string
          decisions: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          meeting_link: string | null
          next_steps: string | null
          objective: string | null
          occurred: boolean | null
          parent_meeting_id: string | null
          participants: string | null
          pendings: string | null
          recurrence: string | null
          recurrence_count: number | null
          recurrence_days: string[] | null
          recurrence_end_date: string | null
          recurrence_end_type: string | null
          recurrence_interval: number | null
          recurrence_monthly_mode: string | null
          start_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: string | null
          created_at?: string
          decisions?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          meeting_link?: string | null
          next_steps?: string | null
          objective?: string | null
          occurred?: boolean | null
          parent_meeting_id?: string | null
          participants?: string | null
          pendings?: string | null
          recurrence?: string | null
          recurrence_count?: number | null
          recurrence_days?: string[] | null
          recurrence_end_date?: string | null
          recurrence_end_type?: string | null
          recurrence_interval?: number | null
          recurrence_monthly_mode?: string | null
          start_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          context?: string | null
          created_at?: string
          decisions?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          meeting_link?: string | null
          next_steps?: string | null
          objective?: string | null
          occurred?: boolean | null
          parent_meeting_id?: string | null
          participants?: string | null
          pendings?: string | null
          recurrence?: string | null
          recurrence_count?: number | null
          recurrence_days?: string[] | null
          recurrence_end_date?: string | null
          recurrence_end_type?: string | null
          recurrence_interval?: number | null
          recurrence_monthly_mode?: string | null
          start_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          meeting_id: string | null
          product_id: string | null
          tags: string[] | null
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          meeting_id?: string | null
          product_id?: string | null
          tags?: string[] | null
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          meeting_id?: string | null
          product_id?: string | null
          tags?: string[] | null
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      origins: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_followups: {
        Row: {
          created_at: string
          followup_date: string
          id: string
          next_followup_date: string | null
          note: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          followup_date?: string
          id?: string
          next_followup_date?: string | null
          note?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          followup_date?: string
          id?: string
          next_followup_date?: string | null
          note?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_followups_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          demand_type: string | null
          description: string | null
          due_date: string | null
          followup_owner: string | null
          id: string
          kind: Database["public"]["Enums"]["task_kind"]
          last_followup_date: string | null
          last_followup_note: string | null
          needs_response: boolean
          next_followup_date: string | null
          origin: string | null
          owner: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          product_id: string | null
          response_channel:
            | Database["public"]["Enums"]["response_channel"]
            | null
          response_summary: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          demand_type?: string | null
          description?: string | null
          due_date?: string | null
          followup_owner?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          last_followup_date?: string | null
          last_followup_note?: string | null
          needs_response?: boolean
          next_followup_date?: string | null
          origin?: string | null
          owner?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          product_id?: string | null
          response_channel?:
            | Database["public"]["Enums"]["response_channel"]
            | null
          response_summary?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          demand_type?: string | null
          description?: string | null
          due_date?: string | null
          followup_owner?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          last_followup_date?: string | null
          last_followup_note?: string | null
          needs_response?: boolean
          next_followup_date?: string | null
          origin?: string | null
          owner?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          product_id?: string | null
          response_channel?:
            | Database["public"]["Enums"]["response_channel"]
            | null
          response_summary?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      event_type: "reuniao" | "tarefa"
      response_channel: "email" | "teams" | "whatsapp" | "reuniao"
      task_demand_type: "bug" | "melhoria" | "duvida" | "processo" | "projeto"
      task_kind: "minha" | "cobranca" | "ambos"
      task_origin:
        | "email"
        | "teams"
        | "reuniao"
        | "whatsapp"
        | "sistema"
        | "interno"
      task_priority: "alta" | "media" | "baixa"
      task_status:
        | "a_fazer"
        | "em_andamento"
        | "aguardando_terceiros"
        | "concluido"
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
      event_type: ["reuniao", "tarefa"],
      response_channel: ["email", "teams", "whatsapp", "reuniao"],
      task_demand_type: ["bug", "melhoria", "duvida", "processo", "projeto"],
      task_kind: ["minha", "cobranca", "ambos"],
      task_origin: [
        "email",
        "teams",
        "reuniao",
        "whatsapp",
        "sistema",
        "interno",
      ],
      task_priority: ["alta", "media", "baixa"],
      task_status: [
        "a_fazer",
        "em_andamento",
        "aguardando_terceiros",
        "concluido",
      ],
    },
  },
} as const
