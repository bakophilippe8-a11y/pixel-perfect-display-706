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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      lead_events: {
        Row: {
          agent: Database["public"]["Enums"]["agent_kind"]
          contenu: string
          created_at: string
          id: string
          lead_id: string
          type: string
          user_id: string
        }
        Insert: {
          agent?: Database["public"]["Enums"]["agent_kind"]
          contenu?: string
          created_at?: string
          id?: string
          lead_id: string
          type?: string
          user_id: string
        }
        Update: {
          agent?: Database["public"]["Enums"]["agent_kind"]
          contenu?: string
          created_at?: string
          id?: string
          lead_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          id: string
          last_activity_at: string
          next_followup_at: string | null
          nom: string
          notes: string
          product_id: string | null
          score_confiance: number | null
          source: string
          stage: Database["public"]["Enums"]["lead_stage"]
          telephone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity_at?: string
          next_followup_at?: string | null
          nom: string
          notes?: string
          product_id?: string | null
          score_confiance?: number | null
          source?: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          telephone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_activity_at?: string
          next_followup_at?: string | null
          nom?: string
          notes?: string
          product_id?: string | null
          score_confiance?: number | null
          source?: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          telephone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          argument_cle: string
          code: string
          created_at: string
          devise: string
          id: string
          lien_maketou: string
          mots_cles_interet: string[]
          nom: string
          prix: number
          statut: string
          updated_at: string
          user_id: string
        }
        Insert: {
          argument_cle?: string
          code: string
          created_at?: string
          devise?: string
          id?: string
          lien_maketou?: string
          mots_cles_interet?: string[]
          nom: string
          prix?: number
          statut?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          argument_cle?: string
          code?: string
          created_at?: string
          devise?: string
          id?: string
          lien_maketou?: string
          mots_cles_interet?: string[]
          nom?: string
          prix?: number
          statut?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_campaigns: {
        Row: {
          approved_at: string | null
          created_at: string
          facebook_copy: string
          id: string
          status: string
          title: string
          user_id: string
          voiceover_script: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          facebook_copy?: string
          id?: string
          status?: string
          title: string
          user_id: string
          voiceover_script?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          facebook_copy?: string
          id?: string
          status?: string
          title?: string
          user_id?: string
          voiceover_script?: string
        }
        Relationships: []
      }
      sales_conversations: {
        Row: {
          channel: string
          contact_name: string
          contact_status: string
          created_at: string
          external_contact: string
          id: string
          last_inbound_at: string | null
          opted_out: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          contact_name?: string
          contact_status?: string
          created_at?: string
          external_contact?: string
          id?: string
          last_inbound_at?: string | null
          opted_out?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          contact_name?: string
          contact_status?: string
          created_at?: string
          external_contact?: string
          id?: string
          last_inbound_at?: string | null
          opted_out?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_guidelines: {
        Row: {
          ai_paused: boolean
          human_conditions: string
          pause_reason: string
          sales_info: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_paused?: boolean
          human_conditions?: string
          pause_reason?: string
          sales_info?: string
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_paused?: boolean
          human_conditions?: string
          pause_reason?: string
          sales_info?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_inbox: {
        Row: {
          connection_id: string
          created_at: string
          delivery_id: string
          error: string | null
          id: string
          payload: Json
          state: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          delivery_id: string
          error?: string | null
          id?: string
          payload: Json
          state?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          delivery_id?: string
          error?: string | null
          id?: string
          payload?: Json
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_inbox_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "seller_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          decision: Json | null
          direction: string
          error: string | null
          id: string
          provider_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          decision?: Json | null
          direction: string
          error?: string | null
          id?: string
          provider_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          decision?: Json | null
          direction?: string
          error?: string | null
          id?: string
          provider_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sales_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_processing_locks: {
        Row: {
          expires_at: string
          user_id: string
        }
        Insert: {
          expires_at: string
          user_id: string
        }
        Update: {
          expires_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_connections: {
        Row: {
          channel: string
          created_at: string
          credentials_ciphertext: string
          enabled: boolean
          id: string
          test_error: string | null
          tested_at: string | null
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          credentials_ciphertext: string
          enabled?: boolean
          id?: string
          test_error?: string | null
          tested_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          credentials_ciphertext?: string
          enabled?: boolean
          id?: string
          test_error?: string | null
          tested_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_sales_lock: { Args: { owner_id: string }; Returns: boolean }
    }
    Enums: {
      agent_kind: "segmentation" | "matching" | "closing" | "suivi" | "manuel"
      lead_stage:
        | "nouveau"
        | "contacte"
        | "repondu"
        | "a_qualifier"
        | "matche"
        | "en_negociation"
        | "paye"
        | "perdu"
        | "dormant"
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
      agent_kind: ["segmentation", "matching", "closing", "suivi", "manuel"],
      lead_stage: [
        "nouveau",
        "contacte",
        "repondu",
        "a_qualifier",
        "matche",
        "en_negociation",
        "paye",
        "perdu",
        "dormant",
      ],
    },
  },
} as const
