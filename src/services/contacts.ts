import { supabase } from '@/lib/supabase/client'
import { startOfDay, endOfDay, addDays } from 'date-fns'

export interface ContactsFilters {
  stages?: string[]
  responsavel_id?: string
  servico_id?: string
  depto_id?: string | number
  sla?: string
  follow_up?: string
  origem?: string
  search?: string
  limit?: number
  offset?: number
}

export interface Contact {
  id: string
  created_at?: string
  nome?: string
  lead_nome?: string
  telefone?: string
  whatsapp_phone?: string
  lead_empresa_pf?: string
  lead_email?: string
  servico_id?: string | null
  depto_id?: number | null
  lead_servico?: string
  lead_resumo?: string
  current_stage?: string
  sla_status?: string
  cancel_reason_id?: string | null
  cancel_obs?: string | null
  origem?: string | null
  responsavel_id?: string | null
  orcamento?: string | null
  valor?: number | null
  observacoes?: string
  data_follow_up?: string | null
  [key: string]: any
}

export interface Servico {
  id: string
  descricao: string
  depto_id?: number | null
}

export interface Depto {
  id: number
  nome: string
}

export interface CancelReason {
  id: string
  motivo: string
}

export interface Responsavel {
  id: string
  nome: string
}

export async function createContact(payload: Partial<Contact>) {
  if (!payload.manychat_id) {
    payload.manychat_id = 'manual_' + new Date().getTime()
  }
  const { data, error } = await supabase
    .from('manychat_contatos')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContact(id: string) {
  const { error } = await supabase.rpc('hard_delete_manychat_contato', { p_contato_id: id })
  if (error) throw error
}

export async function getResponsaveis() {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, legaldesk_usuario_id')
    .eq('ativo', true)
    .order('name')
  return data?.map((d: any) => ({ id: d.legaldesk_usuario_id || d.id, nome: d.name })) || []
}

export async function getServicos() {
  const { data } = await supabase
    .from('manychat_servicos')
    .select('id, descricao')
    .order('descricao')
  return data || []
}

export async function getDeptos() {
  const { data } = await supabase.from('manychat_deptos').select('id, nome').order('nome')
  return data || []
}

export async function getContacts(
  filters: ContactsFilters,
  sort?: { column: string; ascending: boolean },
) {
  let query = supabase
    .from('manychat_contatos')
    .select(`
      id, created_at,
      nome, first_name, last_name, telefone, whatsapp_phone,
      lead_servico, lead_empresa_pf, lead_resumo, observacoes,
      current_stage, data_follow_up, sla_status, origem,
      foto, manychat_live_chat_url,
      manychat_servicos(descricao),
      manychat_deptos(nome),
      legaldesk_usuarios(nome),
      profiles!manychat_contatos_responsible_user_id_profiles_fkey(name)
    `)
    .is('deleted_at', null)
    .limit(1000)

  if (filters.stages !== undefined) {
    if (filters.stages.length === 0) {
      query = query.in('current_stage', ['__EMPTY__'])
    } else {
      if (filters.stages.includes('nivel_1_novo')) {
        query = query.or(
          `current_stage.in.(${filters.stages.map((s) => `"${s}"`).join(',')}),current_stage.is.null,current_stage.eq.""`,
        )
      } else {
        query = query.in('current_stage', filters.stages)
      }
    }
  }

  if (filters.search) {
    const s = `%${filters.search}%`
    query = query.or(
      `nome.ilike."${s}",lead_nome.ilike."${s}",lead_email.ilike."${s}",telefone.ilike."${s}",whatsapp_phone.ilike."${s}"`,
    )
  }

  if (filters.responsavel_id && filters.responsavel_id !== 'all')
    query = query.eq('responsavel_id', filters.responsavel_id)
  if (filters.servico_id && filters.servico_id !== 'all')
    query = query.eq('servico_id', filters.servico_id)
  if (filters.depto_id && filters.depto_id !== 'all') query = query.eq('depto_id', filters.depto_id)
  if (filters.origem && filters.origem !== 'all') query = query.eq('origem', filters.origem)

  if (filters.sla && filters.sla !== 'all') {
    query = query.eq('sla_status', filters.sla)
  }

  if (filters.follow_up && filters.follow_up !== 'all') {
    const todayStart = startOfDay(new Date()).toISOString()
    const todayEnd = endOfDay(new Date()).toISOString()

    if (filters.follow_up === 'today') {
      query = query.gte('data_follow_up', todayStart).lte('data_follow_up', todayEnd)
    } else if (filters.follow_up === 'next_7_days') {
      const next7Days = endOfDay(addDays(new Date(), 7)).toISOString()
      query = query.gt('data_follow_up', todayEnd).lte('data_follow_up', next7Days)
    } else if (filters.follow_up === 'overdue') {
      query = query.lt('data_follow_up', todayStart)
    } else if (filters.follow_up === 'none') {
      query = query.is('data_follow_up', null)
    }
  }

  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset)
    query = query.range(filters.offset, filters.offset + (filters.limit || 1000) - 1)

  if (sort && sort.column) {
    query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function updateContact(id: string, updates: any, previousStage?: string) {
  const payload = { ...updates }
  if (previousStage && payload.current_stage && previousStage !== payload.current_stage) {
    payload.last_stage_change_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('manychat_contatos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateContactStage(
  id: string,
  stage: string,
  cancelReasonId?: string,
  cancelObservation?: string,
) {
  const { data: currentContact } = await supabase
    .from('manychat_contatos')
    .select('manychat_id, current_stage')
    .eq('id', id)
    .single()

  const updates: any = { current_stage: stage, last_stage_change_at: new Date().toISOString() }

  if (stage !== 'cancelado') {
    updates.cancel_reason_id = null
    updates.cancel_obs = null
  } else {
    if (cancelReasonId !== undefined) updates.cancel_reason_id = cancelReasonId
    if (cancelObservation !== undefined) updates.cancel_obs = cancelObservation
  }

  const { data, error } = await supabase
    .from('manychat_contatos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (currentContact && currentContact.current_stage !== stage) {
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('mc_kanban_history').insert({
      manychat_id: currentContact.manychat_id,
      contato_id: id,
      previous_stage: currentContact.current_stage,
      new_stage: stage,
      changed_by: userData?.user?.id || null,
    })
  }

  return data
}

export async function getCancelReasons() {
  const { data, error } = await supabase
    .from('manychat_cancel_reasons')
    .select('id, motivo')
    .order('motivo')

  if (error) {
    return [
      { id: '1', motivo: 'Preço' },
      { id: '2', motivo: 'Concorrente' },
      { id: '3', motivo: 'Não responde' },
      { id: '4', motivo: 'Outro' },
    ]
  }
  return data || []
}
