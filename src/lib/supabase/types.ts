// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      atendimentos: {
        Row: {
          created_at: string
          first_name: string | null
          gender: string | null
          id: string
          last_interaction_at: string | null
          last_name: string | null
          manychat_id: string
          name: string | null
          optin_email: boolean | null
          optin_phone: boolean | null
          profile_pic: string | null
          status: string | null
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name?: string | null
          manychat_id: string
          name?: string | null
          optin_email?: boolean | null
          optin_phone?: boolean | null
          profile_pic?: string | null
          status?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name?: string | null
          manychat_id?: string
          name?: string | null
          optin_email?: boolean | null
          optin_phone?: boolean | null
          profile_pic?: string | null
          status?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          created_at: string
          detected_event_type: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          processing_context: Json | null
          received_at: string | null
          status: string
          subscriber_id: string | null
        }
        Insert: {
          created_at?: string
          detected_event_type?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processing_context?: Json | null
          received_at?: string | null
          status: string
          subscriber_id?: string | null
        }
        Update: {
          created_at?: string
          detected_event_type?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processing_context?: Json | null
          received_at?: string | null
          status?: string
          subscriber_id?: string | null
        }
        Relationships: []
      }
      manychat_contact_attributes: {
        Row: {
          attribute_key: string
          attribute_value: string | null
          created_at: string
          id: string | null
          manychat_id: string
          updated_at: string
        }
        Insert: {
          attribute_key: string
          attribute_value?: string | null
          created_at?: string
          id?: string | null
          manychat_id: string
          updated_at?: string
        }
        Update: {
          attribute_key?: string
          attribute_value?: string | null
          created_at?: string
          id?: string | null
          manychat_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'manychat_contact_attributes_manychat_id_fkey'
            columns: ['manychat_id']
            isOneToOne: false
            referencedRelation: 'manychat_contatos'
            referencedColumns: ['manychat_id']
          },
        ]
      }
      manychat_contatos: {
        Row: {
          created_at: string
          external_transfers: Json | null
          first_name: string | null
          foto: string | null
          generated_at: string | null
          genero: string | null
          id: string
          last_interaction_at: string | null
          last_name: string | null
          last_synced_at: string | null
          last_update_log: string | null
          last_update_status: string | null
          lead_email: string | null
          lead_empresa_pf: string | null
          lead_nome: string | null
          lead_nome_exibicao: string | null
          lead_resumo: string | null
          lead_servico: string | null
          manual_updated_at: string | null
          manual_updated_by: string | null
          manychat_data: Json | null
          manychat_id: string
          manychat_live_chat_url: string | null
          messages_payload: Json | null
          nome: string | null
          payload_bruto: Json | null
          servico_id: string | null
          status: string | null
          subscribed_at: string | null
          telefone: string | null
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          external_transfers?: Json | null
          first_name?: string | null
          foto?: string | null
          generated_at?: string | null
          genero?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name?: string | null
          last_synced_at?: string | null
          last_update_log?: string | null
          last_update_status?: string | null
          lead_email?: string | null
          lead_empresa_pf?: string | null
          lead_nome?: string | null
          lead_nome_exibicao?: string | null
          lead_resumo?: string | null
          lead_servico?: string | null
          manual_updated_at?: string | null
          manual_updated_by?: string | null
          manychat_data?: Json | null
          manychat_id: string
          manychat_live_chat_url?: string | null
          messages_payload?: Json | null
          nome?: string | null
          payload_bruto?: Json | null
          servico_id?: string | null
          status?: string | null
          subscribed_at?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          external_transfers?: Json | null
          first_name?: string | null
          foto?: string | null
          generated_at?: string | null
          genero?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name?: string | null
          last_synced_at?: string | null
          last_update_log?: string | null
          last_update_status?: string | null
          lead_email?: string | null
          lead_empresa_pf?: string | null
          lead_nome?: string | null
          lead_nome_exibicao?: string | null
          lead_resumo?: string | null
          lead_servico?: string | null
          manual_updated_at?: string | null
          manual_updated_by?: string | null
          manychat_data?: Json | null
          manychat_id?: string
          manychat_live_chat_url?: string | null
          messages_payload?: Json | null
          nome?: string | null
          payload_bruto?: Json | null
          servico_id?: string | null
          status?: string | null
          subscribed_at?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'manychat_contatos_servico_id_fkey'
            columns: ['servico_id']
            isOneToOne: false
            referencedRelation: 'manychat_servicos'
            referencedColumns: ['id']
          },
        ]
      }
      manychat_servicos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      manychat_sync_control: {
        Row: {
          created_at: string
          error_count: number | null
          id: string
          inserted_count: number | null
          last_cursor: string | null
          last_error: string | null
          last_successful_sync: string | null
          status: string
          sync_type: string
          updated_at: string
          updated_count: number | null
        }
        Insert: {
          created_at?: string
          error_count?: number | null
          id?: string
          inserted_count?: number | null
          last_cursor?: string | null
          last_error?: string | null
          last_successful_sync?: string | null
          status: string
          sync_type: string
          updated_at?: string
          updated_count?: number | null
        }
        Update: {
          created_at?: string
          error_count?: number | null
          id?: string
          inserted_count?: number | null
          last_cursor?: string | null
          last_error?: string | null
          last_successful_sync?: string | null
          status?: string
          sync_type?: string
          updated_at?: string
          updated_count?: number | null
        }
        Relationships: []
      }
      mc_atendimento_custom_fields: {
        Row: {
          atendimento_id: string
          custom_field_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          atendimento_id: string
          custom_field_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          atendimento_id?: string
          custom_field_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mc_atendimento_custom_fields_atendimento_id_fkey'
            columns: ['atendimento_id']
            isOneToOne: false
            referencedRelation: 'atendimentos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mc_atendimento_custom_fields_custom_field_id_fkey'
            columns: ['custom_field_id']
            isOneToOne: false
            referencedRelation: 'mc_custom_fields'
            referencedColumns: ['id']
          },
        ]
      }
      mc_atendimento_tags: {
        Row: {
          atendimento_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          atendimento_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          atendimento_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mc_atendimento_tags_atendimento_id_fkey'
            columns: ['atendimento_id']
            isOneToOne: false
            referencedRelation: 'atendimentos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mc_atendimento_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'mc_tags'
            referencedColumns: ['id']
          },
        ]
      }
      mc_conversations: {
        Row: {
          atendimento_id: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          atendimento_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          atendimento_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mc_conversations_atendimento_id_fkey'
            columns: ['atendimento_id']
            isOneToOne: false
            referencedRelation: 'atendimentos'
            referencedColumns: ['id']
          },
        ]
      }
      mc_custom_fields: {
        Row: {
          created_at: string
          id: string
          manychat_id: string
          name: string
          type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          manychat_id: string
          name: string
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          manychat_id?: string
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      mc_messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string
          direction: string
          id: string
          manychat_message_id: string | null
          message_type: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction: string
          id?: string
          manychat_message_id?: string | null
          message_type?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          manychat_message_id?: string | null
          message_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mc_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'mc_conversations'
            referencedColumns: ['id']
          },
        ]
      }
      mc_tags: {
        Row: {
          created_at: string
          id: string
          manychat_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          manychat_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          manychat_id?: string
          name?: string
        }
        Relationships: []
      }
      prazos: {
        Row: {
          assunto: string | null
          assunto_id: string | null
          caso_codigo: string | null
          cliente: string | null
          cliente_codigo: string | null
          created_at: string
          data_prazo: string | null
          descricao: string | null
          id: string
          manychat_contato_id: string | null
          prioridade: string | null
          profissional_id: string | null
          profissional_responsavel: string | null
          raw_payload: Json | null
          situacao_id: string | null
          status: string | null
          synced_at: string | null
          tipo_compromisso: string | null
          tipo_compromisso_id: string | null
          titulo: string | null
          totvs_id: string
          updated_at: string
        }
        Insert: {
          assunto?: string | null
          assunto_id?: string | null
          caso_codigo?: string | null
          cliente?: string | null
          cliente_codigo?: string | null
          created_at?: string
          data_prazo?: string | null
          descricao?: string | null
          id?: string
          manychat_contato_id?: string | null
          prioridade?: string | null
          profissional_id?: string | null
          profissional_responsavel?: string | null
          raw_payload?: Json | null
          situacao_id?: string | null
          status?: string | null
          synced_at?: string | null
          tipo_compromisso?: string | null
          tipo_compromisso_id?: string | null
          titulo?: string | null
          totvs_id: string
          updated_at?: string
        }
        Update: {
          assunto?: string | null
          assunto_id?: string | null
          caso_codigo?: string | null
          cliente?: string | null
          cliente_codigo?: string | null
          created_at?: string
          data_prazo?: string | null
          descricao?: string | null
          id?: string
          manychat_contato_id?: string | null
          prioridade?: string | null
          profissional_id?: string | null
          profissional_responsavel?: string | null
          raw_payload?: Json | null
          situacao_id?: string | null
          status?: string | null
          synced_at?: string | null
          tipo_compromisso?: string | null
          tipo_compromisso_id?: string | null
          titulo?: string | null
          totvs_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: atendimentos
//   id: uuid (not null, default: gen_random_uuid())
//   manychat_id: text (not null)
//   first_name: text (nullable)
//   last_name: text (nullable)
//   name: text (nullable)
//   status: text (nullable)
//   gender: text (nullable)
//   profile_pic: text (nullable)
//   whatsapp_phone: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   last_interaction_at: timestamp with time zone (nullable)
//   optin_phone: boolean (nullable, default: false)
//   optin_email: boolean (nullable, default: false)
// Table: integration_logs
//   id: uuid (not null, default: gen_random_uuid())
//   event_type: text (not null)
//   payload: jsonb (nullable)
//   status: text (not null)
//   error_message: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   subscriber_id: text (nullable)
//   detected_event_type: text (nullable)
//   processing_context: jsonb (nullable)
//   received_at: timestamp with time zone (nullable, default: now())
// Table: manychat_contact_attributes
//   id: uuid (nullable, default: gen_random_uuid())
//   manychat_id: text (not null)
//   attribute_key: text (not null)
//   attribute_value: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: manychat_contatos
//   id: uuid (not null, default: gen_random_uuid())
//   manychat_id: text (not null)
//   nome: text (nullable)
//   first_name: text (nullable)
//   last_name: text (nullable)
//   telefone: text (nullable)
//   status: text (nullable)
//   foto: text (nullable)
//   genero: text (nullable)
//   last_interaction_at: timestamp with time zone (nullable)
//   payload_bruto: jsonb (nullable)
//   last_synced_at: timestamp with time zone (nullable, default: now())
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   last_update_status: text (nullable, default: 'updated'::text)
//   last_update_log: text (nullable)
//   manychat_data: jsonb (nullable)
//   external_transfers: jsonb (nullable)
//   messages_payload: jsonb (nullable)
//   generated_at: timestamp with time zone (nullable)
//   lead_nome_exibicao: text (nullable)
//   manychat_live_chat_url: text (nullable)
//   subscribed_at: timestamp with time zone (nullable)
//   whatsapp_phone: text (nullable)
//   lead_nome: text (nullable)
//   lead_servico: text (nullable)
//   lead_email: text (nullable)
//   lead_empresa_pf: text (nullable)
//   lead_resumo: text (nullable)
//   servico_id: uuid (nullable)
//   manual_updated_at: timestamp with time zone (nullable)
//   manual_updated_by: uuid (nullable)
// Table: manychat_servicos
//   id: uuid (not null, default: gen_random_uuid())
//   codigo: text (not null)
//   descricao: text (not null)
//   ativo: boolean (not null, default: true)
//   created_at: timestamp with time zone (not null, default: now())
// Table: manychat_sync_control
//   id: uuid (not null, default: gen_random_uuid())
//   sync_type: text (not null)
//   last_successful_sync: timestamp with time zone (nullable)
//   last_cursor: text (nullable)
//   status: text (not null)
//   last_error: text (nullable)
//   inserted_count: integer (nullable, default: 0)
//   updated_count: integer (nullable, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   error_count: integer (nullable, default: 0)
// Table: mc_atendimento_custom_fields
//   atendimento_id: uuid (not null)
//   custom_field_id: uuid (not null)
//   value: text (nullable)
//   updated_at: timestamp with time zone (not null, default: now())
// Table: mc_atendimento_tags
//   atendimento_id: uuid (not null)
//   tag_id: uuid (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: mc_conversations
//   id: uuid (not null, default: gen_random_uuid())
//   atendimento_id: uuid (nullable)
//   status: text (not null, default: 'open'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: mc_custom_fields
//   id: uuid (not null, default: gen_random_uuid())
//   manychat_id: text (not null)
//   name: text (not null)
//   type: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: mc_messages
//   id: uuid (not null, default: gen_random_uuid())
//   conversation_id: uuid (nullable)
//   manychat_message_id: text (nullable)
//   direction: text (not null)
//   message_type: text (nullable)
//   content: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: mc_tags
//   id: uuid (not null, default: gen_random_uuid())
//   manychat_id: text (not null)
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: prazos
//   id: uuid (not null, default: gen_random_uuid())
//   manychat_contato_id: uuid (nullable)
//   totvs_id: text (not null)
//   titulo: text (nullable)
//   descricao: text (nullable)
//   data_prazo: timestamp with time zone (nullable)
//   status: text (nullable)
//   situacao_id: text (nullable)
//   prioridade: text (nullable)
//   cliente: text (nullable)
//   cliente_codigo: text (nullable)
//   caso_codigo: text (nullable)
//   assunto: text (nullable)
//   assunto_id: text (nullable)
//   profissional_responsavel: text (nullable)
//   profissional_id: text (nullable)
//   tipo_compromisso: text (nullable)
//   tipo_compromisso_id: text (nullable)
//   raw_payload: jsonb (nullable)
//   synced_at: timestamp with time zone (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: profiles
//   id: uuid (not null)
//   name: text (not null)
//   email: text (not null)
//   created_at: timestamp with time zone (not null, default: now())

// --- CONSTRAINTS ---
// Table: atendimentos
//   UNIQUE atendimentos_manychat_id_key: UNIQUE (manychat_id)
//   PRIMARY KEY atendimentos_pkey: PRIMARY KEY (id)
// Table: integration_logs
//   PRIMARY KEY integration_logs_pkey: PRIMARY KEY (id)
// Table: manychat_contact_attributes
//   FOREIGN KEY manychat_contact_attributes_manychat_id_fkey: FOREIGN KEY (manychat_id) REFERENCES manychat_contatos(manychat_id) ON DELETE CASCADE
//   PRIMARY KEY manychat_contact_attributes_pkey: PRIMARY KEY (manychat_id, attribute_key)
// Table: manychat_contatos
//   FOREIGN KEY manychat_contatos_manual_updated_by_fkey: FOREIGN KEY (manual_updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
//   UNIQUE manychat_contatos_manychat_id_key: UNIQUE (manychat_id)
//   PRIMARY KEY manychat_contatos_pkey: PRIMARY KEY (id)
//   FOREIGN KEY manychat_contatos_servico_id_fkey: FOREIGN KEY (servico_id) REFERENCES manychat_servicos(id) ON DELETE SET NULL
// Table: manychat_servicos
//   UNIQUE manychat_servicos_codigo_key: UNIQUE (codigo)
//   PRIMARY KEY manychat_servicos_pkey: PRIMARY KEY (id)
// Table: manychat_sync_control
//   PRIMARY KEY manychat_sync_control_pkey: PRIMARY KEY (id)
// Table: mc_atendimento_custom_fields
//   FOREIGN KEY mc_atendimento_custom_fields_atendimento_id_fkey: FOREIGN KEY (atendimento_id) REFERENCES atendimentos(id) ON DELETE CASCADE
//   FOREIGN KEY mc_atendimento_custom_fields_custom_field_id_fkey: FOREIGN KEY (custom_field_id) REFERENCES mc_custom_fields(id) ON DELETE CASCADE
//   PRIMARY KEY mc_atendimento_custom_fields_pkey: PRIMARY KEY (atendimento_id, custom_field_id)
// Table: mc_atendimento_tags
//   FOREIGN KEY mc_atendimento_tags_atendimento_id_fkey: FOREIGN KEY (atendimento_id) REFERENCES atendimentos(id) ON DELETE CASCADE
//   PRIMARY KEY mc_atendimento_tags_pkey: PRIMARY KEY (atendimento_id, tag_id)
//   FOREIGN KEY mc_atendimento_tags_tag_id_fkey: FOREIGN KEY (tag_id) REFERENCES mc_tags(id) ON DELETE CASCADE
// Table: mc_conversations
//   FOREIGN KEY mc_conversations_atendimento_id_fkey: FOREIGN KEY (atendimento_id) REFERENCES atendimentos(id) ON DELETE CASCADE
//   PRIMARY KEY mc_conversations_pkey: PRIMARY KEY (id)
// Table: mc_custom_fields
//   UNIQUE mc_custom_fields_manychat_id_key: UNIQUE (manychat_id)
//   PRIMARY KEY mc_custom_fields_pkey: PRIMARY KEY (id)
// Table: mc_messages
//   FOREIGN KEY mc_messages_conversation_id_fkey: FOREIGN KEY (conversation_id) REFERENCES mc_conversations(id) ON DELETE CASCADE
//   PRIMARY KEY mc_messages_pkey: PRIMARY KEY (id)
// Table: mc_tags
//   UNIQUE mc_tags_manychat_id_key: UNIQUE (manychat_id)
//   PRIMARY KEY mc_tags_pkey: PRIMARY KEY (id)
// Table: prazos
//   PRIMARY KEY prazos_pkey: PRIMARY KEY (id)
//   UNIQUE prazos_totvs_id_key: UNIQUE (totvs_id)
// Table: profiles
//   FOREIGN KEY profiles_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY profiles_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: atendimentos
//   Policy "authenticated_delete_atendimentos" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_atendimentos" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_atendimentos" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_atendimentos" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: integration_logs
//   Policy "authenticated_all_integration_logs" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: manychat_contact_attributes
//   Policy "authenticated_all_manychat_contact_attributes" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: manychat_contatos
//   Policy "authenticated_all_manychat_contatos" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: manychat_servicos
//   Policy "authenticated_select_manychat_servicos" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: manychat_sync_control
//   Policy "anon_select_manychat_sync_control" (SELECT, PERMISSIVE) roles={anon}
//     USING: true
//   Policy "authenticated_all_manychat_sync_control" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_atendimento_custom_fields
//   Policy "authenticated_all_mc_atendimento_custom_fields" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_atendimento_tags
//   Policy "authenticated_all_mc_atendimento_tags" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_conversations
//   Policy "authenticated_all_mc_conversations" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_custom_fields
//   Policy "authenticated_all_mc_custom_fields" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_messages
//   Policy "authenticated_all_mc_messages" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_tags
//   Policy "authenticated_all_mc_tags" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: prazos
//   Policy "Allow insert" (INSERT, PERMISSIVE) roles={anon}
//     WITH CHECK: true
//   Policy "Allow update" (UPDATE, PERMISSIVE) roles={anon}
//     USING: true
//   Policy "prazos_insert_anon" (INSERT, PERMISSIVE) roles={anon}
//     WITH CHECK: true
//   Policy "prazos_select_anon" (SELECT, PERMISSIVE) roles={anon}
//     USING: true
//   Policy "prazos_update_anon" (UPDATE, PERMISSIVE) roles={anon}
//     USING: true
//     WITH CHECK: true
// Table: profiles
//   Policy "authenticated_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = id)
//   Policy "authenticated_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = id)
//     WITH CHECK: (auth.uid() = id)

// --- DATABASE FUNCTIONS ---
// FUNCTION handle_new_user()
//   CREATE OR REPLACE FUNCTION public.handle_new_user()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     INSERT INTO public.profiles (id, name, email)
//     VALUES (
//       NEW.id,
//       COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
//       NEW.email
//     ) ON CONFLICT (id) DO NOTHING;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION update_updated_at_column()
//   CREATE OR REPLACE FUNCTION public.update_updated_at_column()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//       NEW.updated_at = NOW();
//       RETURN NEW;
//   END;
//   $function$
//

// --- TRIGGERS ---
// Table: manychat_contatos
//   set_updated_at_manychat_contatos: CREATE TRIGGER set_updated_at_manychat_contatos BEFORE UPDATE ON public.manychat_contatos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
// Table: manychat_sync_control
//   set_updated_at_manychat_sync_control: CREATE TRIGGER set_updated_at_manychat_sync_control BEFORE UPDATE ON public.manychat_sync_control FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
// Table: mc_atendimento_custom_fields
//   set_updated_at_atendimentos_cf: CREATE TRIGGER set_updated_at_atendimentos_cf BEFORE UPDATE ON public.mc_atendimento_custom_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
// Table: mc_conversations
//   set_updated_at_conversations: CREATE TRIGGER set_updated_at_conversations BEFORE UPDATE ON public.mc_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()

// --- INDEXES ---
// Table: atendimentos
//   CREATE UNIQUE INDEX atendimentos_manychat_id_key ON public.atendimentos USING btree (manychat_id)
//   CREATE INDEX idx_atendimentos_last_interaction ON public.atendimentos USING btree (last_interaction_at)
// Table: integration_logs
//   CREATE INDEX idx_integration_logs_created_at ON public.integration_logs USING btree (created_at)
// Table: manychat_contact_attributes
//   CREATE INDEX idx_manychat_contact_attributes_key ON public.manychat_contact_attributes USING btree (attribute_key)
// Table: manychat_contatos
//   CREATE INDEX idx_manychat_contatos_manychat_id ON public.manychat_contatos USING btree (manychat_id)
//   CREATE INDEX idx_manychat_contatos_status ON public.manychat_contatos USING btree (last_update_status)
//   CREATE UNIQUE INDEX manychat_contatos_manychat_id_key ON public.manychat_contatos USING btree (manychat_id)
// Table: manychat_servicos
//   CREATE UNIQUE INDEX manychat_servicos_codigo_key ON public.manychat_servicos USING btree (codigo)
// Table: manychat_sync_control
//   CREATE INDEX idx_manychat_sync_control_created_at ON public.manychat_sync_control USING btree (created_at)
//   CREATE INDEX idx_manychat_sync_control_status ON public.manychat_sync_control USING btree (status)
// Table: mc_conversations
//   CREATE INDEX idx_mc_conversations_atendimento ON public.mc_conversations USING btree (atendimento_id)
// Table: mc_custom_fields
//   CREATE UNIQUE INDEX mc_custom_fields_manychat_id_key ON public.mc_custom_fields USING btree (manychat_id)
// Table: mc_messages
//   CREATE INDEX idx_mc_messages_conversation ON public.mc_messages USING btree (conversation_id)
// Table: mc_tags
//   CREATE UNIQUE INDEX mc_tags_manychat_id_key ON public.mc_tags USING btree (manychat_id)
// Table: prazos
//   CREATE INDEX idx_prazos_caso_codigo ON public.prazos USING btree (caso_codigo)
//   CREATE INDEX idx_prazos_cliente_codigo ON public.prazos USING btree (cliente_codigo)
//   CREATE INDEX idx_prazos_data_prazo ON public.prazos USING btree (data_prazo)
//   CREATE INDEX idx_prazos_manychat_contato_id ON public.prazos USING btree (manychat_contato_id)
//   CREATE INDEX idx_prazos_status ON public.prazos USING btree (status)
//   CREATE UNIQUE INDEX prazos_totvs_id_key ON public.prazos USING btree (totvs_id)
