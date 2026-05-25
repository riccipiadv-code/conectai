import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Contact = Database['public']['Tables']['manychat_contatos']['Row'] & {
  current_stage?: string
  sla_status?: string
  manychat_servicos?: { descricao: string } | null
  cancel_reason_id?: string | null
  cancel_obs?: string | null
}

export interface Servico {
  id: string
  descricao: string
  depto_id: number | null
}

export interface Depto {
  id: number
  nome: string
}

export interface CancelReason {
  id: string
  motivo: string
}

export async function getServicos(): Promise<Servico[]> {
  const { data, error } = await supabase
    .from('manychat_servicos')
    .select('id, descricao, depto_id')
    .eq('ativo', true)
    .order('ordem_fluxo', { ascending: true })
  if (error) throw error
  console.log('servicosData', data)
  return data
}

export async function getDeptos(): Promise<Depto[]> {
  const { data, error } = await supabase
    .from('manychat_deptos')
    .select('id, nome')
    .eq('ativo', true)
    .order('id', { ascending: true })
  if (error) throw error
  console.log('deptosData', data)
  return data
}

export async function getCancelReasons(): Promise<CancelReason[]> {
  const { data, error } = await supabase
    .from('manychat_cancel_reasons')
    .select('id, motivo')
    .eq('ativo', true)
    .order('motivo')
  if (error) throw error
  return data
}

export async function getContacts() {
  const { data, error } = await supabase
    .from('manychat_contatos')
    .select('*, manychat_servicos(descricao)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data as Contact[]
}

export async function updateContact(id: string, updates: Partial<Contact>, previousStage?: string) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id || null
  const now = new Date().toISOString()

  if (updates.current_stage && previousStage && updates.current_stage !== previousStage) {
    const newStage = updates.current_stage
    const validTransitions: Record<string, string[]> = {
      nivel_1_novo: [
        'nivel_2_especialista',
        'nivel_3_especial',
        'reuniao_consulta_agendada',
        'enviado_orcamento_ag_retorno',
        'orcamento_aprovado',
        'cancelado',
      ],
      nivel_2_especialista: [
        'nivel_3_especial',
        'reuniao_consulta_agendada',
        'enviado_orcamento_ag_retorno',
        'orcamento_aprovado',
        'cancelado',
      ],
      nivel_3_especial: [
        'reuniao_consulta_agendada',
        'enviado_orcamento_ag_retorno',
        'orcamento_aprovado',
        'cancelado',
      ],
      reuniao_consulta_agendada: [
        'enviado_orcamento_ag_retorno',
        'orcamento_aprovado',
        'cancelado',
      ],
      enviado_orcamento_ag_retorno: ['orcamento_aprovado', 'cancelado'],
      orcamento_aprovado: ['cancelado'],
      cancelado: [],
    }
    const allowed = validTransitions[previousStage] || []
    if (!allowed.includes(newStage) && newStage !== 'cancelado') {
      throw new Error(
        `Transição de estágio não permitida: de '${previousStage}' para '${newStage}'`,
      )
    }
    updates.last_stage_change_at = now
  }

  if (updates.current_stage && updates.current_stage !== 'cancelado') {
    updates.cancel_reason_id = null
    updates.cancel_obs = null
  }

  const payload: any = {
    ...updates,
    manual_updated_at: now,
    manual_updated_by: userId,
    updated_at: now,
  }

  if (updates.depto_id !== undefined) {
    payload.depto_id = updates.depto_id
  } else {
    delete payload.depto_id
  }

  const { error } = await supabase.from('manychat_contatos').update(payload).eq('id', id)

  if (error) throw error

  if (updates.current_stage && previousStage && updates.current_stage !== previousStage) {
    const { data: contact } = await supabase
      .from('manychat_contatos')
      .select('manychat_id')
      .eq('id', id)
      .single()
    if (contact) {
      await supabase.from('mc_kanban_history').insert({
        contato_id: id,
        manychat_id: contact.manychat_id,
        previous_stage: previousStage,
        new_stage: updates.current_stage,
        changed_by: userId,
        created_at: now,
      })
    }
  }
}

export async function deleteContact(id: string) {
  const { error } = await supabase.rpc('hard_delete_manychat_contato', {
    p_contato_id: id,
  })

  if (error) throw error
}

export async function updateContactStage(id: string, newStage: string) {
  // 1. Obter contato atual
  const { data: contact, error: fetchError } = await supabase
    .from('manychat_contatos')
    .select('id, manychat_id, current_stage')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError
  if (!contact) throw new Error('Contato não encontrado')

  const currentStage = contact.current_stage || 'nivel_1_novo'

  if (currentStage === newStage) return

  // 2. Validar transição de estágio
  const validTransitions: Record<string, string[]> = {
    nivel_1_novo: [
      'nivel_2_especialista',
      'nivel_3_especial',
      'reuniao_consulta_agendada',
      'enviado_orcamento_ag_retorno',
      'orcamento_aprovado',
      'cancelado',
    ],
    nivel_2_especialista: [
      'nivel_3_especial',
      'reuniao_consulta_agendada',
      'enviado_orcamento_ag_retorno',
      'orcamento_aprovado',
      'cancelado',
    ],
    nivel_3_especial: [
      'reuniao_consulta_agendada',
      'enviado_orcamento_ag_retorno',
      'orcamento_aprovado',
      'cancelado',
    ],
    reuniao_consulta_agendada: ['enviado_orcamento_ag_retorno', 'orcamento_aprovado', 'cancelado'],
    enviado_orcamento_ag_retorno: ['orcamento_aprovado', 'cancelado'],
    orcamento_aprovado: ['cancelado'],
    cancelado: [],
  }

  const allowed = validTransitions[currentStage] || []
  if (!allowed.includes(newStage) && newStage !== 'cancelado') {
    throw new Error(`Transição de estágio não permitida: de '${currentStage}' para '${newStage}'`)
  }

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id || null

  const now = new Date().toISOString()

  // 3. Atualizar o contato
  const { error: updateError } = await supabase
    .from('manychat_contatos')
    .update({
      current_stage: newStage,
      last_stage_change_at: now,
      updated_at: now,
    })
    .eq('id', id)

  if (updateError) throw updateError

  // 4. Registrar histórico
  const { error: historyError } = await supabase.from('mc_kanban_history').insert({
    contato_id: contact.id,
    manychat_id: contact.manychat_id,
    previous_stage: currentStage,
    new_stage: newStage,
    changed_by: userId,
    created_at: now,
  })

  if (historyError) {
    console.error('Erro ao salvar histórico do kanban:', historyError)
    throw historyError
  }
}

export async function getDashboardStats() {
  const { count: totalContacts, error: contactsError } = await supabase
    .from('manychat_contatos')
    .select('*', { count: 'exact', head: true })

  if (contactsError) throw contactsError

  const { count: activeSyncs, error: syncsError } = await supabase
    .from('manychat_sync_control')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success')

  if (syncsError) throw syncsError

  const { count: recentMessages, error: msgsError } = await supabase
    .from('mc_messages')
    .select('*', { count: 'exact', head: true })

  if (msgsError) throw msgsError

  return {
    totalContacts: totalContacts || 0,
    successfulSyncs: activeSyncs || 0,
    totalMessages: recentMessages || 0,
  }
}
