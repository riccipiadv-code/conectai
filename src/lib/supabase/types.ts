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
      anexos: {
        Row: {
          created_at: string
          file_url: string
          id: string
          nome: string
          tarefa_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          nome: string
          tarefa_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          nome?: string
          tarefa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'anexos_tarefa_id_fkey'
            columns: ['tarefa_id']
            isOneToOne: false
            referencedRelation: 'tarefas'
            referencedColumns: ['id']
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          descricao: string | null
          gestor_id: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          gestor_id?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          gestor_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'areas_gestor_id_fkey'
            columns: ['gestor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_gestor'
            columns: ['gestor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
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
      comentarios: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          tarefa_id: string
          user_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          tarefa_id: string
          user_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          tarefa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comentarios_tarefa_id_fkey'
            columns: ['tarefa_id']
            isOneToOne: false
            referencedRelation: 'tarefas'
            referencedColumns: ['id']
          },
        ]
      }
      departamentos: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      email_secrets: {
        Row: {
          created_at: string | null
          secret_value: string
          setting_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          secret_value: string
          setting_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          secret_value?: string
          setting_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'email_secrets_setting_id_fkey'
            columns: ['setting_id']
            isOneToOne: true
            referencedRelation: 'email_settings'
            referencedColumns: ['id']
          },
        ]
      }
      email_send_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          status: string
          subject: string | null
          to_email: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          status: string
          subject?: string | null
          to_email: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          status?: string
          subject?: string | null
          to_email?: string
          type?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          provider: string
          reply_to: string | null
          secret_configured: boolean | null
          sender_email: string
          sender_name: string
          smtp_host: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          provider?: string
          reply_to?: string | null
          secret_configured?: boolean | null
          sender_email: string
          sender_name: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          provider?: string
          reply_to?: string | null
          secret_configured?: boolean | null
          sender_email?: string
          sender_name?: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      historico_tarefas: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          tarefa_id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          tarefa_id: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          tarefa_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'historico_tarefas_tarefa_id_fkey'
            columns: ['tarefa_id']
            isOneToOne: false
            referencedRelation: 'tarefas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'historico_tarefas_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
      legaldesk_tarefas: {
        Row: {
          ativo: boolean | null
          cliente: string | null
          codigo_cliente: string | null
          data_atualizacao_origem: string | null
          data_criacao_origem: string | null
          data_prazo: string | null
          depto: string | null
          descricao: string | null
          excluido_origem: boolean | null
          id: number
          link_codigo_origem: string | null
          origem: string | null
          processo: string | null
          responsavel: string | null
          sincronizado_em: string | null
          source_id: string
          status: string | null
          tipo_origem: string | null
          titulo: string | null
        }
        Insert: {
          ativo?: boolean | null
          cliente?: string | null
          codigo_cliente?: string | null
          data_atualizacao_origem?: string | null
          data_criacao_origem?: string | null
          data_prazo?: string | null
          depto?: string | null
          descricao?: string | null
          excluido_origem?: boolean | null
          id?: number
          link_codigo_origem?: string | null
          origem?: string | null
          processo?: string | null
          responsavel?: string | null
          sincronizado_em?: string | null
          source_id: string
          status?: string | null
          tipo_origem?: string | null
          titulo?: string | null
        }
        Update: {
          ativo?: boolean | null
          cliente?: string | null
          codigo_cliente?: string | null
          data_atualizacao_origem?: string | null
          data_criacao_origem?: string | null
          data_prazo?: string | null
          depto?: string | null
          descricao?: string | null
          excluido_origem?: boolean | null
          id?: number
          link_codigo_origem?: string | null
          origem?: string | null
          processo?: string | null
          responsavel?: string | null
          sincronizado_em?: string | null
          source_id?: string
          status?: string | null
          tipo_origem?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
      legaldesk_usuarios: {
        Row: {
          ativo: boolean | null
          data_atualizacao_origem: string | null
          data_criacao_origem: string | null
          departamento: string | null
          email: string | null
          id: string
          nome: string
          origem: string | null
          sigla: string | null
          sincronizado_em: string | null
          source_id: string
          tipo_usuario: string | null
        }
        Insert: {
          ativo?: boolean | null
          data_atualizacao_origem?: string | null
          data_criacao_origem?: string | null
          departamento?: string | null
          email?: string | null
          id?: string
          nome: string
          origem?: string | null
          sigla?: string | null
          sincronizado_em?: string | null
          source_id: string
          tipo_usuario?: string | null
        }
        Update: {
          ativo?: boolean | null
          data_atualizacao_origem?: string | null
          data_criacao_origem?: string | null
          departamento?: string | null
          email?: string | null
          id?: string
          nome?: string
          origem?: string | null
          sigla?: string | null
          sincronizado_em?: string | null
          source_id?: string
          tipo_usuario?: string | null
        }
        Relationships: []
      }
      manychat_cancel_reasons: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          motivo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          motivo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          motivo?: string
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
          cancel_obs: string | null
          cancel_reason: string | null
          cancel_reason_id: string | null
          controle: number | null
          created_at: string
          current_stage: string | null
          data_follow_up: string | null
          deleted_at: string | null
          deleted_by: string | null
          depto_id: number | null
          external_transfers: Json | null
          first_name: string | null
          foto: string | null
          generated_at: string | null
          genero: string | null
          id: string
          last_interaction_at: string | null
          last_name: string | null
          last_stage_change_at: string | null
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
          observacoes: string | null
          orcamento: string | null
          origem: string | null
          origem_id: number | null
          payload_bruto: Json | null
          porte_empresa: string | null
          responsavel_id: string | null
          responsible_user_id: string | null
          servico_id: string | null
          sla_due_at: string | null
          sla_started_at: string | null
          sla_status: string | null
          status: string | null
          subscribed_at: string | null
          telefone: string | null
          updated_at: string
          valor: number | null
          whatsapp_phone: string | null
        }
        Insert: {
          cancel_obs?: string | null
          cancel_reason?: string | null
          cancel_reason_id?: string | null
          controle?: number | null
          created_at?: string
          current_stage?: string | null
          data_follow_up?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          depto_id?: number | null
          external_transfers?: Json | null
          first_name?: string | null
          foto?: string | null
          generated_at?: string | null
          genero?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name?: string | null
          last_stage_change_at?: string | null
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
          observacoes?: string | null
          orcamento?: string | null
          origem?: string | null
          origem_id?: number | null
          payload_bruto?: Json | null
          porte_empresa?: string | null
          responsavel_id?: string | null
          responsible_user_id?: string | null
          servico_id?: string | null
          sla_due_at?: string | null
          sla_started_at?: string | null
          sla_status?: string | null
          status?: string | null
          subscribed_at?: string | null
          telefone?: string | null
          updated_at?: string
          valor?: number | null
          whatsapp_phone?: string | null
        }
        Update: {
          cancel_obs?: string | null
          cancel_reason?: string | null
          cancel_reason_id?: string | null
          controle?: number | null
          created_at?: string
          current_stage?: string | null
          data_follow_up?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          depto_id?: number | null
          external_transfers?: Json | null
          first_name?: string | null
          foto?: string | null
          generated_at?: string | null
          genero?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name?: string | null
          last_stage_change_at?: string | null
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
          observacoes?: string | null
          orcamento?: string | null
          origem?: string | null
          origem_id?: number | null
          payload_bruto?: Json | null
          porte_empresa?: string | null
          responsavel_id?: string | null
          responsible_user_id?: string | null
          servico_id?: string | null
          sla_due_at?: string | null
          sla_started_at?: string | null
          sla_status?: string | null
          status?: string | null
          subscribed_at?: string | null
          telefone?: string | null
          updated_at?: string
          valor?: number | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_manychat_contatos_origem'
            columns: ['origem_id']
            isOneToOne: false
            referencedRelation: 'manychat_origens'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'manychat_contatos_cancel_reason_id_fkey'
            columns: ['cancel_reason_id']
            isOneToOne: false
            referencedRelation: 'manychat_cancel_reasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'manychat_contatos_depto_id_fkey'
            columns: ['depto_id']
            isOneToOne: false
            referencedRelation: 'manychat_deptos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'manychat_contatos_responsavel_id_fkey'
            columns: ['responsavel_id']
            isOneToOne: false
            referencedRelation: 'legaldesk_usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'manychat_contatos_responsible_user_id_profiles_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'manychat_contatos_servico_id_fkey'
            columns: ['servico_id']
            isOneToOne: false
            referencedRelation: 'manychat_servicos'
            referencedColumns: ['id']
          },
        ]
      }
      manychat_contatos_subservicos: {
        Row: {
          contato_id: string
          created_at: string
          subservico_id: number
        }
        Insert: {
          contato_id: string
          created_at?: string
          subservico_id: number
        }
        Update: {
          contato_id?: string
          created_at?: string
          subservico_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'fk_manychat_contatos_subservicos_contato'
            columns: ['contato_id']
            isOneToOne: false
            referencedRelation: 'manychat_contatos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_manychat_contatos_subservicos_subservico'
            columns: ['subservico_id']
            isOneToOne: false
            referencedRelation: 'manychat_subservicos'
            referencedColumns: ['id']
          },
        ]
      }
      manychat_deptos: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id: number
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome?: string
        }
        Relationships: []
      }
      manychat_origens: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome: string
          ordem: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      manychat_servicos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          depto_id: number | null
          descricao: string
          id: string
          ordem_fluxo: number | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          depto_id?: number | null
          descricao: string
          id?: string
          ordem_fluxo?: number | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          depto_id?: number | null
          descricao?: string
          id?: string
          ordem_fluxo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'manychat_servicos_depto_id_fkey'
            columns: ['depto_id']
            isOneToOne: false
            referencedRelation: 'manychat_deptos'
            referencedColumns: ['id']
          },
        ]
      }
      manychat_subservicos: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome: string
          ordem: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome?: string
          ordem?: number
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
      mc_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          contato_id: string | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          field_name: string | null
          id: string
          metadata: Json | null
          new_data: Json | null
          new_value: string | null
          old_data: Json | null
          old_value: string | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          contato_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          new_value?: string | null
          old_data?: Json | null
          old_value?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          contato_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          new_value?: string | null
          old_data?: Json | null
          old_value?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mc_audit_log_contato_id_fkey'
            columns: ['contato_id']
            isOneToOne: false
            referencedRelation: 'manychat_contatos'
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
      mc_kanban_history: {
        Row: {
          changed_by: string | null
          contato_id: string | null
          created_at: string
          id: string
          manychat_id: string
          new_stage: string
          notes: string | null
          previous_stage: string | null
        }
        Insert: {
          changed_by?: string | null
          contato_id?: string | null
          created_at?: string
          id?: string
          manychat_id: string
          new_stage: string
          notes?: string | null
          previous_stage?: string | null
        }
        Update: {
          changed_by?: string | null
          contato_id?: string | null
          created_at?: string
          id?: string
          manychat_id?: string
          new_stage?: string
          notes?: string | null
          previous_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mc_kanban_history_contato_id_fkey'
            columns: ['contato_id']
            isOneToOne: false
            referencedRelation: 'manychat_contatos'
            referencedColumns: ['id']
          },
        ]
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
      mc_sla_tracking: {
        Row: {
          contato_id: string | null
          created_at: string
          elapsed_business_hours: number | null
          id: string
          last_calculated_at: string | null
          manychat_id: string
          sla_due: string | null
          sla_start: string | null
          sla_status: string | null
          stage: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          contato_id?: string | null
          created_at?: string
          elapsed_business_hours?: number | null
          id?: string
          last_calculated_at?: string | null
          manychat_id: string
          sla_due?: string | null
          sla_start?: string | null
          sla_status?: string | null
          stage?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          contato_id?: string | null
          created_at?: string
          elapsed_business_hours?: number | null
          id?: string
          last_calculated_at?: string | null
          manychat_id?: string
          sla_due?: string | null
          sla_start?: string | null
          sla_status?: string | null
          stage?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mc_sla_tracking_contato_id_fkey'
            columns: ['contato_id']
            isOneToOne: false
            referencedRelation: 'manychat_contatos'
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
      mc_user_profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          department: string | null
          id: string
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean | null
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean | null
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean | null
          titulo?: string
          user_id?: string
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
          area_id: string | null
          ativo: boolean | null
          created_at: string
          email: string
          ferias_fim: string | null
          ferias_inicio: string | null
          id: string
          legaldesk_usuario_id: string | null
          name: string
          perfil: string | null
          substituto_id: string | null
        }
        Insert: {
          area_id?: string | null
          ativo?: boolean | null
          created_at?: string
          email: string
          ferias_fim?: string | null
          ferias_inicio?: string | null
          id: string
          legaldesk_usuario_id?: string | null
          name: string
          perfil?: string | null
          substituto_id?: string | null
        }
        Update: {
          area_id?: string | null
          ativo?: boolean | null
          created_at?: string
          email?: string
          ferias_fim?: string | null
          ferias_inicio?: string | null
          id?: string
          legaldesk_usuario_id?: string | null
          name?: string
          perfil?: string | null
          substituto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_legaldesk_usuario_id_fkey'
            columns: ['legaldesk_usuario_id']
            isOneToOne: false
            referencedRelation: 'legaldesk_usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_substituto_id_fkey'
            columns: ['substituto_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      skip_tarefas: {
        Row: {
          alerta_status: boolean | null
          area_id: string | null
          auxiliar_id: string | null
          cliente_nome: string | null
          created_at: string
          descricao: string | null
          id: string
          numero_caso: string | null
          origem: string | null
          prazo: string | null
          prioridade: string | null
          responsavel_id: string | null
          status: string | null
          tipo_servico: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          alerta_status?: boolean | null
          area_id?: string | null
          auxiliar_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          numero_caso?: string | null
          origem?: string | null
          prazo?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo_servico?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          alerta_status?: boolean | null
          area_id?: string | null
          auxiliar_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          numero_caso?: string | null
          origem?: string | null
          prazo?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo_servico?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'skip_tarefas_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'skip_tarefas_auxiliar_id_fkey'
            columns: ['auxiliar_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'skip_tarefas_responsavel_id_fkey'
            columns: ['responsavel_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tarefas: {
        Row: {
          alerta_status: boolean | null
          area_id: string | null
          auxiliar_id: string | null
          cliente_nome: string | null
          created_at: string
          descricao: string | null
          id: string
          numero_caso: string | null
          origem: string | null
          prazo: string | null
          prioridade: string | null
          responsavel_id: string | null
          status: string | null
          tipo_servico: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          alerta_status?: boolean | null
          area_id?: string | null
          auxiliar_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          numero_caso?: string | null
          origem?: string | null
          prazo?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo_servico?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          alerta_status?: boolean | null
          area_id?: string | null
          auxiliar_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          numero_caso?: string | null
          origem?: string | null
          prazo?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo_servico?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tarefas_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tarefas_auxiliar_id_fkey'
            columns: ['auxiliar_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tarefas_responsavel_id_fkey'
            columns: ['responsavel_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      hard_delete_manychat_contato: {
        Args: { p_contato_id: string }
        Returns: undefined
      }
      is_socio_gestor: { Args: never; Returns: boolean }
      soft_delete_manychat_contato: {
        Args: { p_contato_id: string }
        Returns: undefined
      }
    }
    Enums: {
      perfil_type: 'socio_gestor' | 'gestor_area' | 'advogado' | 'estagiario' | 'administrativo'
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
    Enums: {
      perfil_type: ['socio_gestor', 'gestor_area', 'advogado', 'estagiario', 'administrativo'],
    },
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
// Table: anexos
//   id: uuid (not null, default: gen_random_uuid())
//   tarefa_id: uuid (not null)
//   user_id: uuid (not null)
//   file_url: text (not null)
//   nome: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: areas
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   descricao: text (nullable)
//   gestor_id: uuid (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
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
// Table: comentarios
//   id: uuid (not null, default: gen_random_uuid())
//   tarefa_id: uuid (not null)
//   user_id: uuid (not null)
//   conteudo: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: departamentos
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
// Table: email_secrets
//   setting_id: uuid (not null)
//   secret_value: text (not null)
//   created_at: timestamp with time zone (nullable, default: now())
//   updated_at: timestamp with time zone (nullable, default: now())
// Table: email_send_logs
//   id: uuid (not null, default: gen_random_uuid())
//   type: text (not null)
//   to_email: text (not null)
//   subject: text (nullable)
//   status: text (not null)
//   error_message: text (nullable)
//   created_by: uuid (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: email_settings
//   id: uuid (not null, default: gen_random_uuid())
//   provider: text (not null, default: 'smtp'::text)
//   sender_name: text (not null)
//   sender_email: text (not null)
//   reply_to: text (nullable)
//   smtp_host: text (nullable)
//   smtp_port: integer (nullable)
//   smtp_user: text (nullable)
//   smtp_secure: boolean (nullable, default: true)
//   secret_configured: boolean (nullable, default: false)
//   active: boolean (nullable, default: true)
//   created_at: timestamp with time zone (nullable, default: now())
//   updated_at: timestamp with time zone (nullable, default: now())
//   updated_by: uuid (nullable)
// Table: historico_tarefas
//   id: uuid (not null, default: gen_random_uuid())
//   tarefa_id: uuid (not null)
//   usuario_id: uuid (nullable)
//   acao: text (not null)
//   detalhes: jsonb (nullable)
//   created_at: timestamp with time zone (not null, default: now())
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
// Table: legaldesk_tarefas
//   id: bigint (not null, default: nextval('legaldesk_tarefas_id_seq'::regclass))
//   source_id: text (not null)
//   origem: text (nullable)
//   cliente: text (nullable)
//   codigo_cliente: text (nullable)
//   processo: text (nullable)
//   depto: text (nullable)
//   titulo: text (nullable)
//   descricao: text (nullable)
//   tipo_origem: text (nullable)
//   status: text (nullable)
//   responsavel: text (nullable)
//   data_prazo: timestamp without time zone (nullable)
//   data_criacao_origem: timestamp without time zone (nullable)
//   data_atualizacao_origem: timestamp without time zone (nullable)
//   ativo: boolean (nullable, default: true)
//   excluido_origem: boolean (nullable, default: false)
//   link_codigo_origem: text (nullable)
//   sincronizado_em: timestamp without time zone (nullable, default: now())
// Table: legaldesk_usuarios
//   id: uuid (not null, default: gen_random_uuid())
//   source_id: text (not null)
//   nome: text (not null)
//   sigla: text (nullable)
//   email: text (nullable)
//   ativo: boolean (nullable, default: true)
//   tipo_usuario: text (nullable)
//   data_criacao_origem: timestamp with time zone (nullable)
//   data_atualizacao_origem: timestamp with time zone (nullable)
//   origem: text (nullable, default: 'LEGALDESK'::text)
//   sincronizado_em: timestamp with time zone (nullable, default: now())
//   departamento: text (nullable)
// Table: manychat_cancel_reasons
//   id: uuid (not null, default: gen_random_uuid())
//   motivo: text (not null)
//   ativo: boolean (not null, default: true)
//   created_at: timestamp with time zone (not null, default: now())
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
//   current_stage: text (nullable, default: 'nivel_1_novo'::text)
//   sla_status: text (nullable, default: 'green'::text)
//   responsible_user_id: uuid (nullable)
//   last_stage_change_at: timestamp with time zone (nullable)
//   sla_started_at: timestamp with time zone (nullable)
//   sla_due_at: timestamp with time zone (nullable)
//   deleted_at: timestamp with time zone (nullable)
//   deleted_by: uuid (nullable)
//   cancel_reason: text (nullable)
//   depto_id: integer (nullable)
//   cancel_reason_id: uuid (nullable)
//   cancel_obs: text (nullable)
//   porte_empresa: text (nullable)
//   origem: text (nullable)
//   responsavel_id: uuid (nullable)
//   orcamento: text (nullable)
//   valor: numeric (nullable)
//   observacoes: text (nullable)
//   data_follow_up: timestamp with time zone (nullable)
//   controle: bigint (nullable, default: nextval('manychat_contatos_controle_seq'::regclass))
//   origem_id: bigint (nullable)
// Table: manychat_contatos_subservicos
//   contato_id: uuid (not null)
//   subservico_id: bigint (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: manychat_deptos
//   id: integer (not null)
//   nome: text (not null)
//   ativo: boolean (not null, default: true)
//   created_at: timestamp with time zone (not null, default: now())
// Table: manychat_origens
//   id: bigint (not null)
//   nome: text (not null)
//   ativo: boolean (not null, default: true)
//   ordem: integer (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: manychat_servicos
//   id: uuid (not null, default: gen_random_uuid())
//   codigo: text (not null)
//   descricao: text (not null)
//   ativo: boolean (not null, default: true)
//   created_at: timestamp with time zone (not null, default: now())
//   ordem_fluxo: integer (nullable)
//   depto_id: integer (nullable)
// Table: manychat_subservicos
//   id: bigint (not null)
//   nome: text (not null)
//   ativo: boolean (not null, default: true)
//   ordem: integer (not null)
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
// Table: mc_audit_log
//   id: uuid (not null, default: gen_random_uuid())
//   table_name: text (nullable)
//   record_id: text (nullable)
//   action: text (not null)
//   old_data: jsonb (nullable)
//   new_data: jsonb (nullable)
//   changed_by: uuid (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   contato_id: uuid (nullable)
//   entity_name: text (nullable)
//   entity_id: text (nullable)
//   field_name: text (nullable)
//   old_value: text (nullable)
//   new_value: text (nullable)
//   user_id: uuid (nullable)
//   metadata: jsonb (nullable)
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
// Table: mc_kanban_history
//   id: uuid (not null, default: gen_random_uuid())
//   manychat_id: text (not null)
//   previous_stage: text (nullable)
//   new_stage: text (not null)
//   changed_by: uuid (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   contato_id: uuid (nullable)
//   notes: text (nullable)
// Table: mc_messages
//   id: uuid (not null, default: gen_random_uuid())
//   conversation_id: uuid (nullable)
//   manychat_message_id: text (nullable)
//   direction: text (not null)
//   message_type: text (nullable)
//   content: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: mc_sla_tracking
//   id: uuid (not null, default: gen_random_uuid())
//   manychat_id: text (not null)
//   stage: text (nullable)
//   status: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   contato_id: uuid (nullable)
//   sla_start: timestamp with time zone (nullable)
//   sla_due: timestamp with time zone (nullable)
//   elapsed_business_hours: numeric (nullable, default: 0)
//   last_calculated_at: timestamp with time zone (nullable)
//   sla_status: text (nullable)
// Table: mc_tags
//   id: uuid (not null, default: gen_random_uuid())
//   manychat_id: text (not null)
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: mc_user_profiles
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (nullable)
//   role: text (nullable)
//   department: text (nullable)
//   active: boolean (nullable, default: true)
//   created_at: timestamp with time zone (nullable, default: now())
//   updated_at: timestamp with time zone (nullable, default: now())
// Table: notificacoes
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (not null)
//   titulo: text (not null)
//   lida: boolean (nullable, default: false)
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
//   perfil: text (nullable, default: 'advogado'::text)
//   area_id: uuid (nullable)
//   ativo: boolean (nullable, default: true)
//   ferias_inicio: timestamp with time zone (nullable)
//   ferias_fim: timestamp with time zone (nullable)
//   substituto_id: uuid (nullable)
//   legaldesk_usuario_id: uuid (nullable)
// Table: skip_tarefas
//   id: uuid (not null, default: gen_random_uuid())
//   titulo: text (not null)
//   descricao: text (nullable)
//   area_id: uuid (nullable)
//   tipo_servico: text (nullable)
//   cliente_nome: text (nullable)
//   numero_caso: text (nullable)
//   responsavel_id: uuid (nullable)
//   auxiliar_id: uuid (nullable)
//   status: text (nullable, default: 'Pendente'::text)
//   prioridade: text (nullable, default: 'media'::text)
//   prazo: timestamp with time zone (nullable)
//   alerta_status: boolean (nullable, default: false)
//   origem: text (nullable, default: 'SKIP'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: tarefas
//   id: uuid (not null, default: gen_random_uuid())
//   titulo: text (not null)
//   descricao: text (nullable)
//   area_id: uuid (nullable)
//   tipo_servico: text (nullable)
//   cliente_nome: text (nullable)
//   numero_caso: text (nullable)
//   responsavel_id: uuid (nullable)
//   auxiliar_id: uuid (nullable)
//   status: text (nullable, default: 'novo'::text)
//   prioridade: text (nullable, default: 'media'::text)
//   prazo: timestamp with time zone (nullable)
//   alerta_status: boolean (nullable, default: false)
//   origem: text (nullable, default: 'manual'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())

// --- CONSTRAINTS ---
// Table: anexos
//   PRIMARY KEY anexos_pkey: PRIMARY KEY (id)
//   FOREIGN KEY anexos_tarefa_id_fkey: FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE
//   FOREIGN KEY anexos_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: areas
//   FOREIGN KEY areas_gestor_id_fkey: FOREIGN KEY (gestor_id) REFERENCES profiles(id) ON DELETE SET NULL
//   PRIMARY KEY areas_pkey: PRIMARY KEY (id)
//   FOREIGN KEY fk_gestor: FOREIGN KEY (gestor_id) REFERENCES profiles(id) ON DELETE SET NULL
// Table: atendimentos
//   UNIQUE atendimentos_manychat_id_key: UNIQUE (manychat_id)
//   PRIMARY KEY atendimentos_pkey: PRIMARY KEY (id)
// Table: comentarios
//   PRIMARY KEY comentarios_pkey: PRIMARY KEY (id)
//   FOREIGN KEY comentarios_tarefa_id_fkey: FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE
//   FOREIGN KEY comentarios_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: departamentos
//   UNIQUE departamentos_nome_key: UNIQUE (nome)
//   PRIMARY KEY departamentos_pkey: PRIMARY KEY (id)
// Table: email_secrets
//   PRIMARY KEY email_secrets_pkey: PRIMARY KEY (setting_id)
//   FOREIGN KEY email_secrets_setting_id_fkey: FOREIGN KEY (setting_id) REFERENCES email_settings(id) ON DELETE CASCADE
// Table: email_send_logs
//   FOREIGN KEY email_send_logs_created_by_fkey: FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
//   PRIMARY KEY email_send_logs_pkey: PRIMARY KEY (id)
// Table: email_settings
//   PRIMARY KEY email_settings_pkey: PRIMARY KEY (id)
//   FOREIGN KEY email_settings_updated_by_fkey: FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: historico_tarefas
//   PRIMARY KEY historico_tarefas_pkey: PRIMARY KEY (id)
//   FOREIGN KEY historico_tarefas_tarefa_id_fkey: FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE
//   FOREIGN KEY historico_tarefas_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES profiles(id) ON DELETE SET NULL
// Table: integration_logs
//   PRIMARY KEY integration_logs_pkey: PRIMARY KEY (id)
// Table: legaldesk_tarefas
//   PRIMARY KEY legaldesk_tarefas_pkey: PRIMARY KEY (id)
//   UNIQUE legaldesk_tarefas_source_id_key: UNIQUE (source_id)
// Table: legaldesk_usuarios
//   PRIMARY KEY legaldesk_usuarios_pkey: PRIMARY KEY (id)
//   UNIQUE legaldesk_usuarios_source_id_key: UNIQUE (source_id)
// Table: manychat_cancel_reasons
//   UNIQUE manychat_cancel_reasons_motivo_key: UNIQUE (motivo)
//   PRIMARY KEY manychat_cancel_reasons_pkey: PRIMARY KEY (id)
// Table: manychat_contact_attributes
//   FOREIGN KEY manychat_contact_attributes_manychat_id_fkey: FOREIGN KEY (manychat_id) REFERENCES manychat_contatos(manychat_id) ON DELETE CASCADE
//   PRIMARY KEY manychat_contact_attributes_pkey: PRIMARY KEY (manychat_id, attribute_key)
// Table: manychat_contatos
//   FOREIGN KEY fk_manychat_contatos_origem: FOREIGN KEY (origem_id) REFERENCES manychat_origens(id)
//   FOREIGN KEY manychat_contatos_cancel_reason_id_fkey: FOREIGN KEY (cancel_reason_id) REFERENCES manychat_cancel_reasons(id) ON DELETE SET NULL
//   UNIQUE manychat_contatos_controle_unique: UNIQUE (controle)
//   FOREIGN KEY manychat_contatos_deleted_by_fkey: FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL
//   FOREIGN KEY manychat_contatos_depto_id_fkey: FOREIGN KEY (depto_id) REFERENCES manychat_deptos(id) ON DELETE SET NULL
//   FOREIGN KEY manychat_contatos_manual_updated_by_fkey: FOREIGN KEY (manual_updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
//   UNIQUE manychat_contatos_manychat_id_key: UNIQUE (manychat_id)
//   CHECK manychat_contatos_orcamento_check: CHECK (((orcamento IS NULL) OR (orcamento = ANY (ARRAY['Tabela'::text, 'Personalizado'::text]))))
//   CHECK manychat_contatos_origem_check: CHECK (((origem IS NULL) OR (origem = ANY (ARRAY['Agente'::text, 'Cliente'::text, 'E-mail'::text, 'Indicação'::text, 'Whatsapp'::text, 'Telefone'::text]))))
//   PRIMARY KEY manychat_contatos_pkey: PRIMARY KEY (id)
//   FOREIGN KEY manychat_contatos_responsavel_id_fkey: FOREIGN KEY (responsavel_id) REFERENCES legaldesk_usuarios(id)
//   FOREIGN KEY manychat_contatos_responsible_user_id_fkey: FOREIGN KEY (responsible_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
//   FOREIGN KEY manychat_contatos_responsible_user_id_profiles_fkey: FOREIGN KEY (responsible_user_id) REFERENCES profiles(id) ON DELETE SET NULL
//   FOREIGN KEY manychat_contatos_servico_id_fkey: FOREIGN KEY (servico_id) REFERENCES manychat_servicos(id) ON DELETE SET NULL
// Table: manychat_contatos_subservicos
//   FOREIGN KEY fk_manychat_contatos_subservicos_contato: FOREIGN KEY (contato_id) REFERENCES manychat_contatos(id) ON DELETE CASCADE
//   FOREIGN KEY fk_manychat_contatos_subservicos_subservico: FOREIGN KEY (subservico_id) REFERENCES manychat_subservicos(id) ON DELETE CASCADE
//   PRIMARY KEY manychat_contatos_subservicos_pkey: PRIMARY KEY (contato_id, subservico_id)
// Table: manychat_deptos
//   UNIQUE manychat_deptos_nome_key: UNIQUE (nome)
//   PRIMARY KEY manychat_deptos_pkey: PRIMARY KEY (id)
// Table: manychat_origens
//   UNIQUE manychat_origens_nome_key: UNIQUE (nome)
//   PRIMARY KEY manychat_origens_pkey: PRIMARY KEY (id)
// Table: manychat_servicos
//   UNIQUE manychat_servicos_codigo_key: UNIQUE (codigo)
//   FOREIGN KEY manychat_servicos_depto_id_fkey: FOREIGN KEY (depto_id) REFERENCES manychat_deptos(id)
//   PRIMARY KEY manychat_servicos_pkey: PRIMARY KEY (id)
//   UNIQUE unique_manychat_servicos_codigo: UNIQUE (codigo)
// Table: manychat_subservicos
//   UNIQUE manychat_subservicos_nome_key: UNIQUE (nome)
//   PRIMARY KEY manychat_subservicos_pkey: PRIMARY KEY (id)
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
// Table: mc_audit_log
//   FOREIGN KEY mc_audit_log_changed_by_fkey: FOREIGN KEY (changed_by) REFERENCES auth.users(id)
//   FOREIGN KEY mc_audit_log_contato_id_fkey: FOREIGN KEY (contato_id) REFERENCES manychat_contatos(id) ON DELETE CASCADE
//   PRIMARY KEY mc_audit_log_pkey: PRIMARY KEY (id)
//   FOREIGN KEY mc_audit_log_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: mc_conversations
//   FOREIGN KEY mc_conversations_atendimento_id_fkey: FOREIGN KEY (atendimento_id) REFERENCES atendimentos(id) ON DELETE CASCADE
//   PRIMARY KEY mc_conversations_pkey: PRIMARY KEY (id)
// Table: mc_custom_fields
//   UNIQUE mc_custom_fields_manychat_id_key: UNIQUE (manychat_id)
//   PRIMARY KEY mc_custom_fields_pkey: PRIMARY KEY (id)
// Table: mc_kanban_history
//   FOREIGN KEY mc_kanban_history_changed_by_fkey: FOREIGN KEY (changed_by) REFERENCES auth.users(id)
//   FOREIGN KEY mc_kanban_history_contato_id_fkey: FOREIGN KEY (contato_id) REFERENCES manychat_contatos(id) ON DELETE CASCADE
//   PRIMARY KEY mc_kanban_history_pkey: PRIMARY KEY (id)
// Table: mc_messages
//   FOREIGN KEY mc_messages_conversation_id_fkey: FOREIGN KEY (conversation_id) REFERENCES mc_conversations(id) ON DELETE CASCADE
//   PRIMARY KEY mc_messages_pkey: PRIMARY KEY (id)
// Table: mc_sla_tracking
//   FOREIGN KEY mc_sla_tracking_contato_id_fkey: FOREIGN KEY (contato_id) REFERENCES manychat_contatos(id) ON DELETE CASCADE
//   PRIMARY KEY mc_sla_tracking_pkey: PRIMARY KEY (id)
// Table: mc_tags
//   UNIQUE mc_tags_manychat_id_key: UNIQUE (manychat_id)
//   PRIMARY KEY mc_tags_pkey: PRIMARY KEY (id)
// Table: mc_user_profiles
//   PRIMARY KEY mc_user_profiles_pkey: PRIMARY KEY (id)
//   FOREIGN KEY mc_user_profiles_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
//   UNIQUE mc_user_profiles_user_id_key: UNIQUE (user_id)
// Table: notificacoes
//   PRIMARY KEY notificacoes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY notificacoes_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: prazos
//   PRIMARY KEY prazos_pkey: PRIMARY KEY (id)
//   UNIQUE prazos_totvs_id_key: UNIQUE (totvs_id)
// Table: profiles
//   FOREIGN KEY profiles_area_id_fkey: FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
//   FOREIGN KEY profiles_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   FOREIGN KEY profiles_legaldesk_usuario_id_fkey: FOREIGN KEY (legaldesk_usuario_id) REFERENCES legaldesk_usuarios(id)
//   CHECK profiles_perfil_check: CHECK ((perfil = ANY (ARRAY['socio_gestor'::text, 'gestor_area'::text, 'advogado'::text, 'estagiario'::text, 'administrativo'::text])))
//   PRIMARY KEY profiles_pkey: PRIMARY KEY (id)
//   FOREIGN KEY profiles_substituto_id_fkey: FOREIGN KEY (substituto_id) REFERENCES profiles(id) ON DELETE SET NULL
// Table: skip_tarefas
//   FOREIGN KEY skip_tarefas_area_id_fkey: FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
//   FOREIGN KEY skip_tarefas_auxiliar_id_fkey: FOREIGN KEY (auxiliar_id) REFERENCES profiles(id) ON DELETE SET NULL
//   PRIMARY KEY skip_tarefas_pkey: PRIMARY KEY (id)
//   FOREIGN KEY skip_tarefas_responsavel_id_fkey: FOREIGN KEY (responsavel_id) REFERENCES profiles(id) ON DELETE SET NULL
// Table: tarefas
//   FOREIGN KEY tarefas_area_id_fkey: FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
//   FOREIGN KEY tarefas_auxiliar_id_fkey: FOREIGN KEY (auxiliar_id) REFERENCES profiles(id) ON DELETE SET NULL
//   PRIMARY KEY tarefas_pkey: PRIMARY KEY (id)
//   CHECK tarefas_prioridade_check: CHECK ((prioridade = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text, 'urgente'::text])))
//   FOREIGN KEY tarefas_responsavel_id_fkey: FOREIGN KEY (responsavel_id) REFERENCES profiles(id) ON DELETE SET NULL
//   CHECK tarefas_status_check: CHECK ((status = ANY (ARRAY['novo'::text, 'em_andamento'::text, 'revisao'::text, 'concluido'::text])))

// --- ROW LEVEL SECURITY POLICIES ---
// Table: areas
//   Policy "authenticated_areas_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.perfil = 'socio_gestor'::text))))
//   Policy "authenticated_areas_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_select_areas" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "socio_all_areas" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.perfil = 'socio_gestor'::text))))
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
// Table: comentarios
//   Policy "authenticated_comentarios_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_comentarios_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_comentarios" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_comentarios" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: email_send_logs
//   Policy "auth_insert_email_send_logs" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "auth_select_email_send_logs" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: email_settings
//   Policy "admin_all_email_settings" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.perfil = 'socio_gestor'::text))))
//     WITH CHECK: (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.perfil = 'socio_gestor'::text))))
//   Policy "auth_select_email_settings" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: historico_tarefas
//   Policy "authenticated_historico_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_historico_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: integration_logs
//   Policy "authenticated_all_integration_logs" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: legaldesk_tarefas
//   Policy "anon_select_legaldesk_tarefas" (SELECT, PERMISSIVE) roles={anon}
//     USING: true
//   Policy "authenticated_select_legaldesk_tarefas" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: legaldesk_usuarios
//   Policy "authenticated_select_legaldesk_usuarios" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: manychat_cancel_reasons
//   Policy "authenticated_select_cancel_reasons" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: manychat_contact_attributes
//   Policy "authenticated_all_manychat_contact_attributes" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: manychat_contatos
//   Policy "authenticated_insert_manychat_contatos" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_manychat_contatos" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (deleted_at IS NULL)
//   Policy "authenticated_update_manychat_contatos" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: manychat_contatos_subservicos
//   Policy "authenticated_delete_manychat_contatos_subservicos" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_manychat_contatos_subservicos" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_manychat_contatos_subservicos" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: manychat_deptos
//   Policy "authenticated_select_manychat_deptos" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: manychat_origens
//   Policy "authenticated_select_origens" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: manychat_servicos
//   Policy "authenticated_select_manychat_servicos" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: manychat_subservicos
//   Policy "authenticated_select_manychat_subservicos" (SELECT, PERMISSIVE) roles={authenticated}
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
// Table: mc_audit_log
//   Policy "authenticated_all_mc_audit_log" (ALL, PERMISSIVE) roles={authenticated}
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
// Table: mc_kanban_history
//   Policy "authenticated_all_mc_kanban_history" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_messages
//   Policy "authenticated_all_mc_messages" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_sla_tracking
//   Policy "authenticated_all_mc_sla_tracking" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_tags
//   Policy "authenticated_all_mc_tags" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: mc_user_profiles
//   Policy "authenticated_all_mc_user_profiles" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: notificacoes
//   Policy "user_select_notificacoes" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
//   Policy "user_update_notificacoes" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
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
//   Policy "socio_gestor_select_all_profiles" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: is_socio_gestor()
// Table: skip_tarefas
//   Policy "authenticated_delete_skip_tarefas" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_skip_tarefas" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_skip_tarefas" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_skip_tarefas" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: tarefas
//   Policy "authenticated_insert_tarefas" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_tarefas" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_tarefas_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND ((p.perfil = 'socio_gestor'::text) OR ((p.perfil = 'gestor_area'::text) AND (p.area_id = tarefas.area_id))))))
//   Policy "authenticated_tarefas_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_tarefas_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND ((p.perfil = 'socio_gestor'::text) OR (p.area_id = tarefas.area_id) OR (tarefas.responsavel_id = auth.uid()) OR (tarefas.auxiliar_id = auth.uid())))))
//   Policy "authenticated_tarefas_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND ((p.perfil = 'socio_gestor'::text) OR ((p.perfil = 'gestor_area'::text) AND (p.area_id = tarefas.area_id)) OR (tarefas.responsavel_id = auth.uid()) OR (tarefas.auxiliar_id = auth.uid())))))
//   Policy "authenticated_update_tarefas" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "socio_delete_tarefas" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.perfil = 'socio_gestor'::text))))

// --- WARNING: TABLES WITH RLS ENABLED BUT NO POLICIES ---
// These tables have Row Level Security enabled but NO policies defined.
// This means ALL queries (SELECT, INSERT, UPDATE, DELETE) will return ZERO rows
// for non-superuser roles (including the anon and authenticated roles used by the app).
// You MUST create RLS policies for these tables to allow data access.
//   - anexos
//   - departamentos
//   - email_secrets

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
// FUNCTION handle_tarefa_substitution()
//   CREATE OR REPLACE FUNCTION public.handle_tarefa_substitution()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     sub_id UUID;
//   BEGIN
//     IF NEW.responsavel_id IS NOT NULL THEN
//       SELECT substituto_id INTO sub_id FROM public.profiles WHERE id = NEW.responsavel_id AND ferias_inicio <= NOW() AND ferias_fim >= NOW() AND ativo = true;
//       IF sub_id IS NOT NULL THEN
//         NEW.responsavel_id = sub_id;
//       END IF;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION hard_delete_manychat_contato(uuid)
//   CREATE OR REPLACE FUNCTION public.hard_delete_manychat_contato(p_contato_id uuid)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//   DECLARE
//     v_manychat_id text;
//   BEGIN
//     IF auth.uid() IS NULL THEN
//       RAISE EXCEPTION 'Usuário não autenticado';
//     END IF;
//
//     SELECT manychat_id
//     INTO v_manychat_id
//     FROM public.manychat_contatos
//     WHERE id = p_contato_id;
//
//     DELETE FROM public.mc_kanban_history
//     WHERE contato_id = p_contato_id;
//
//     DELETE FROM public.mc_sla_tracking
//     WHERE contato_id = p_contato_id;
//
//     DELETE FROM public.mc_audit_log
//     WHERE contato_id = p_contato_id;
//
//     DELETE FROM public.manychat_contact_attributes
//     WHERE manychat_id = v_manychat_id;
//
//     DELETE FROM public.manychat_contatos
//     WHERE id = p_contato_id;
//   END;
//   $function$
//
// FUNCTION is_socio_gestor()
//   CREATE OR REPLACE FUNCTION public.is_socio_gestor()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN EXISTS (
//       SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'socio_gestor'
//     );
//   END;
//   $function$
//
// FUNCTION soft_delete_manychat_contato(uuid)
//   CREATE OR REPLACE FUNCTION public.soft_delete_manychat_contato(p_contato_id uuid)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//   BEGIN
//     IF auth.uid() IS NULL THEN
//       RAISE EXCEPTION 'Usuário não autenticado';
//     END IF;
//
//     UPDATE public.manychat_contatos
//     SET
//       deleted_at = now(),
//       deleted_by = auth.uid()
//     WHERE id = p_contato_id
//       AND deleted_at IS NULL;
//   END;
//   $function$
//
// FUNCTION update_mc_sla_tracking_updated_at()
//   CREATE OR REPLACE FUNCTION public.update_mc_sla_tracking_updated_at()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     NEW.updated_at = now();
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION update_mc_user_profiles_updated_at()
//   CREATE OR REPLACE FUNCTION public.update_mc_user_profiles_updated_at()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     NEW.updated_at = now();
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
// Table: mc_sla_tracking
//   set_updated_at_mc_sla_tracking: CREATE TRIGGER set_updated_at_mc_sla_tracking BEFORE UPDATE ON public.mc_sla_tracking FOR EACH ROW EXECUTE FUNCTION update_mc_sla_tracking_updated_at()
// Table: mc_user_profiles
//   set_updated_at_mc_user_profiles: CREATE TRIGGER set_updated_at_mc_user_profiles BEFORE UPDATE ON public.mc_user_profiles FOR EACH ROW EXECUTE FUNCTION update_mc_user_profiles_updated_at()
// Table: tarefas
//   on_tarefa_insert_substitution: CREATE TRIGGER on_tarefa_insert_substitution BEFORE INSERT OR UPDATE OF responsavel_id ON public.tarefas FOR EACH ROW EXECUTE FUNCTION handle_tarefa_substitution()

// --- INDEXES ---
// Table: atendimentos
//   CREATE UNIQUE INDEX atendimentos_manychat_id_key ON public.atendimentos USING btree (manychat_id)
//   CREATE INDEX idx_atendimentos_last_interaction ON public.atendimentos USING btree (last_interaction_at)
// Table: departamentos
//   CREATE UNIQUE INDEX departamentos_nome_key ON public.departamentos USING btree (nome)
// Table: integration_logs
//   CREATE INDEX idx_integration_logs_created_at ON public.integration_logs USING btree (created_at)
// Table: legaldesk_tarefas
//   CREATE INDEX idx_legaldesk_tarefas_cliente ON public.legaldesk_tarefas USING btree (cliente)
//   CREATE INDEX idx_legaldesk_tarefas_codigo_cliente ON public.legaldesk_tarefas USING btree (codigo_cliente)
//   CREATE INDEX idx_legaldesk_tarefas_depto ON public.legaldesk_tarefas USING btree (depto)
//   CREATE INDEX idx_legaldesk_tarefas_prazo ON public.legaldesk_tarefas USING btree (data_prazo)
//   CREATE INDEX idx_legaldesk_tarefas_processo ON public.legaldesk_tarefas USING btree (processo)
//   CREATE INDEX idx_legaldesk_tarefas_responsavel ON public.legaldesk_tarefas USING btree (responsavel)
//   CREATE INDEX idx_legaldesk_tarefas_status ON public.legaldesk_tarefas USING btree (status)
//   CREATE UNIQUE INDEX legaldesk_tarefas_source_id_key ON public.legaldesk_tarefas USING btree (source_id)
// Table: legaldesk_usuarios
//   CREATE INDEX idx_legaldesk_usuarios_email ON public.legaldesk_usuarios USING btree (email)
//   CREATE INDEX idx_legaldesk_usuarios_email_lower ON public.legaldesk_usuarios USING btree (lower(email))
//   CREATE UNIQUE INDEX legaldesk_usuarios_source_id_key ON public.legaldesk_usuarios USING btree (source_id)
// Table: manychat_cancel_reasons
//   CREATE UNIQUE INDEX manychat_cancel_reasons_motivo_key ON public.manychat_cancel_reasons USING btree (motivo)
// Table: manychat_contact_attributes
//   CREATE INDEX idx_manychat_contact_attributes_key ON public.manychat_contact_attributes USING btree (attribute_key)
//   CREATE UNIQUE INDEX idx_manychat_contact_attributes_unique ON public.manychat_contact_attributes USING btree (manychat_id, attribute_key)
// Table: manychat_contatos
//   CREATE INDEX idx_manychat_contatos_created_at ON public.manychat_contatos USING btree (created_at)
//   CREATE INDEX idx_manychat_contatos_current_stage ON public.manychat_contatos USING btree (current_stage)
//   CREATE INDEX idx_manychat_contatos_data_follow_up ON public.manychat_contatos USING btree (data_follow_up)
//   CREATE INDEX idx_manychat_contatos_manychat_id ON public.manychat_contatos USING btree (manychat_id)
//   CREATE INDEX idx_manychat_contatos_origem ON public.manychat_contatos USING btree (origem)
//   CREATE INDEX idx_manychat_contatos_responsavel_id ON public.manychat_contatos USING btree (responsavel_id)
//   CREATE INDEX idx_manychat_contatos_sla_status ON public.manychat_contatos USING btree (sla_status)
//   CREATE INDEX idx_manychat_contatos_status ON public.manychat_contatos USING btree (last_update_status)
//   CREATE UNIQUE INDEX manychat_contatos_controle_unique ON public.manychat_contatos USING btree (controle)
//   CREATE UNIQUE INDEX manychat_contatos_manychat_id_key ON public.manychat_contatos USING btree (manychat_id)
// Table: manychat_deptos
//   CREATE UNIQUE INDEX manychat_deptos_nome_key ON public.manychat_deptos USING btree (nome)
// Table: manychat_origens
//   CREATE UNIQUE INDEX manychat_origens_nome_key ON public.manychat_origens USING btree (nome)
// Table: manychat_servicos
//   CREATE UNIQUE INDEX manychat_servicos_codigo_key ON public.manychat_servicos USING btree (codigo)
//   CREATE UNIQUE INDEX unique_manychat_servicos_codigo ON public.manychat_servicos USING btree (codigo)
// Table: manychat_subservicos
//   CREATE UNIQUE INDEX manychat_subservicos_nome_key ON public.manychat_subservicos USING btree (nome)
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
// Table: mc_user_profiles
//   CREATE UNIQUE INDEX mc_user_profiles_user_id_key ON public.mc_user_profiles USING btree (user_id)
// Table: prazos
//   CREATE INDEX idx_prazos_caso_codigo ON public.prazos USING btree (caso_codigo)
//   CREATE INDEX idx_prazos_cliente_codigo ON public.prazos USING btree (cliente_codigo)
//   CREATE INDEX idx_prazos_data_prazo ON public.prazos USING btree (data_prazo)
//   CREATE INDEX idx_prazos_manychat_contato_id ON public.prazos USING btree (manychat_contato_id)
//   CREATE INDEX idx_prazos_status ON public.prazos USING btree (status)
//   CREATE UNIQUE INDEX prazos_totvs_id_key ON public.prazos USING btree (totvs_id)
// Table: profiles
//   CREATE INDEX idx_profiles_email_lower ON public.profiles USING btree (lower(email))
