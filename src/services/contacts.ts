import { supabase } from '@/lib/supabase/client'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { OFFICIAL_STAGES } from '@/constants/stages'

export interface ContactsFilters {
  stages?: string[]
  responsavel_id?: string
  servico_id?: string
  depto_id?: string | number
  sla?: string
  follow_up?: string
  origem_id?: string | number
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
  origem_id?: number | null
  manychat_origens?: { nome: string } | null
  responsavel_id?: string | null
  orcamento?: string | null
  valor?: number | null
  observacoes?: string
  data_follow_up?: string | null
  numero_cliente?: number | null
  porte_empresa_id?: number | null
  porte_empresa?: string | null
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

export interface Origem {
  id: number
  nome: string
}

export interface PorteEmpresa {
  id: number
  nome: string
  ordem: number
  ativo: boolean
}

export interface Subservico {
  id: number
  nome: string
  ordem: number
}

export function sanitizeContactPayload(payload: Partial<Contact>) {
  const allowedFields = [
    'manychat_id',
    'nome',
    'lead_nome',
    'telefone',
    'whatsapp_phone',
    'lead_email',
    'lead_empresa_pf',
    'lead_servico',
    'lead_resumo',
    'servico_id',
    'depto_id',
    'responsavel_id',
    'origem_id',
    'orcamento',
    'valor',
    'observacoes',
    'current_stage',
    'sla_status',
    'data_follow_up',
    'cancel_reason_id',
    'cancel_obs',
    'last_stage_change_at',
    'created_at',
    'numero_cliente',
    'porte_empresa_id',
    'porte_empresa',
  ]

  const sanitized: Partial<Contact> = {}

  for (const key of allowedFields) {
    if (key in payload) {
      sanitized[key] = payload[key]
    }
  }

  return sanitized
}

export async function createContact(payload: Partial<Contact>) {
  const sanitized = sanitizeContactPayload(payload)
  if (!sanitized.manychat_id) {
    sanitized.manychat_id = 'manual_' + new Date().getTime()
  }
  const { data, error } = await supabase
    .from('manychat_contatos')
    .insert([sanitized as any])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContact(id: string) {
  const { error } = await supabase.rpc('hard_delete_manychat_contato', { p_contato_id: id })
  if (error) throw error
}

export async function getResponsaveis(): Promise<Responsavel[]> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-user-access', {
      body: { action: 'list_responsaveis' },
    })

    if (error || !data || !Array.isArray(data.responsaveis)) {
      return []
    }

    return data.responsaveis
  } catch {
    return []
  }
}

export async function getServicos() {
  const { data } = await supabase
    .from('manychat_servicos')
    .select('id, descricao, depto_id')
    .order('descricao')
  return data || []
}

export async function getDeptos() {
  const { data } = await supabase.from('manychat_deptos').select('id, nome').order('nome')
  return data || []
}

export async function getOrigens() {
  const { data } = await supabase
    .from('manychat_origens')
    .select('id, nome')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
  return data || []
}

export async function getPortesEmpresa() {
  const { data, error } = await supabase
    .from('manychat_portes_empresa')
    .select('id, nome, ordem, ativo')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getSubservicos() {
  const { data, error } = await supabase
    .from('manychat_subservicos')
    .select('id, nome, ordem')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getContatoSubservicos(contatoId: string) {
  const { data, error } = await supabase
    .from('manychat_contatos_subservicos')
    .select('subservico_id')
    .eq('contato_id', contatoId)
  if (error) throw error
  return data?.map((d: any) => d.subservico_id) || []
}

export async function saveContatoSubservicos(contatoId: string, subservicoIds: number[]) {
  const { error: delError } = await supabase
    .from('manychat_contatos_subservicos')
    .delete()
    .eq('contato_id', contatoId)
  if (delError) throw delError

  if (subservicoIds && subservicoIds.length > 0) {
    const inserts = subservicoIds.map((id) => ({
      contato_id: contatoId,
      subservico_id: id,
    }))
    const { error: insError } = await supabase.from('manychat_contatos_subservicos').insert(inserts)
    if (insError) throw insError
  }
}

export async function getContacts(
  filters: ContactsFilters,
  sort?: { column: string; ascending: boolean },
) {
  let query = supabase
    .from('manychat_contatos')
    .select(`
      *,
      origem,
      origem_id,
      servico_id,
      depto_id,
      responsavel_id,
      cancel_reason_id,
      manychat_origens(nome),
      manychat_servicos(descricao),
      manychat_deptos(nome),
      manychat_portes_empresa(nome),
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
    const numericSearch = filters.search.replace(/[^0-9]/g, '')
    if (numericSearch) {
      query = query.or(
        `lead_nome.ilike."${s}",nome.ilike."${s}",lead_email.ilike."${s}",telefone.ilike."${s}",whatsapp_phone.ilike."${s}",numero_cliente.eq.${numericSearch}`,
      )
    } else {
      query = query.or(
        `lead_nome.ilike."${s}",nome.ilike."${s}",lead_email.ilike."${s}",telefone.ilike."${s}",whatsapp_phone.ilike."${s}"`,
      )
    }
  }

  if (filters.responsavel_id && filters.responsavel_id !== 'all')
    query = query.eq('responsavel_id', filters.responsavel_id)
  if (filters.servico_id && filters.servico_id !== 'all')
    query = query.eq('servico_id', filters.servico_id)
  if (filters.depto_id && filters.depto_id !== 'all')
    query = query.eq('depto_id', Number(filters.depto_id))
  if (filters.origem_id && filters.origem_id !== 'all')
    query = query.eq('origem_id', Number(filters.origem_id))

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

export async function getContactsForExport(filters: ContactsFilters) {
  const allData: any[] = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const batchFilters: ContactsFilters = { ...filters, limit: pageSize, offset }
    const batch = await getContacts(batchFilters, {
      column: 'created_at',
      ascending: true,
    })
    allData.push(...batch)
    if (batch.length < pageSize) break
    offset += pageSize
  }

  return allData
}

export async function getAllContactsForExport() {
  const allData: any[] = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('manychat_contatos')
      .select(`
        *,
        origem,
        origem_id,
        servico_id,
        depto_id,
        responsavel_id,
        cancel_reason_id,
        manychat_origens(nome),
        manychat_servicos(descricao),
        manychat_deptos(nome),
        manychat_portes_empresa(nome),
        legaldesk_usuarios(nome),
        profiles!manychat_contatos_responsible_user_id_profiles_fkey(name)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: true, nullsFirst: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw error
    allData.push(...(data || []))
    if (!data || data.length < pageSize) break
    offset += pageSize
  }

  return allData
}

export async function updateContact(id: string, updates: any, previousStage?: string) {
  const rawPayload = { ...updates }

  if (rawPayload.current_stage) {
    const isValid = OFFICIAL_STAGES.some((s) => s.id === rawPayload.current_stage)
    if (!isValid) {
      throw new Error(`Estágio inválido: ${rawPayload.current_stage}`)
    }
  }

  if (previousStage && rawPayload.current_stage && previousStage !== rawPayload.current_stage) {
    rawPayload.last_stage_change_at = new Date().toISOString()
  }

  const payload = sanitizeContactPayload(rawPayload)

  const { data, error } = await supabase
    .from('manychat_contatos')
    .update(payload as any)
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
  const isValid = OFFICIAL_STAGES.some((s) => s.id === stage)
  if (!isValid) {
    throw new Error(`Estágio inválido: ${stage}`)
  }

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

export interface ContatoAnexo {
  id?: string
  nome: string
  link: string
  ordem: number
  contato_id?: string
}

export async function getContatoAnexos(contatoId: string): Promise<ContatoAnexo[]> {
  const { data, error } = await supabase
    .from('manychat_contatos_anexos')
    .select('id, nome, link, ordem')
    .eq('contato_id', contatoId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Erro ao buscar anexos do contato:', error)
    throw error
  }

  return (data || []).map((item) => ({
    id: item.id,
    nome: item.nome,
    link: item.link,
    ordem: item.ordem,
  }))
}

export async function saveContatoAnexos(contatoId: string, anexos: ContatoAnexo[]): Promise<void> {
  // 1. Validar cada anexo
  for (let i = 0; i < anexos.length; i++) {
    const anexo = anexos[i]
    const nomeTrimmed = anexo.nome ? anexo.nome.trim() : ''
    const linkTrimmed = anexo.link ? anexo.link.trim() : ''

    if (!nomeTrimmed) {
      throw new Error(`O anexo #${i + 1} deve ter um nome preenchido.`)
    }

    if (!linkTrimmed) {
      throw new Error(`O anexo "${nomeTrimmed}" deve ter um link preenchido.`)
    }

    if (!linkTrimmed.startsWith('http://') && !linkTrimmed.startsWith('https://')) {
      throw new Error(`O link do anexo "${nomeTrimmed}" deve começar com http:// ou https://`)
    }
  }

  // Obter usuário autenticado para created_by
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.warn('Não foi possível obter usuário autenticado:', authError)
  }
  const currentUserId = authData?.user?.id || null

  // 2. Obter anexos atuais do banco
  const { data: currentRows, error: fetchError } = await supabase
    .from('manychat_contatos_anexos')
    .select('id')
    .eq('contato_id', contatoId)

  if (fetchError) {
    throw new Error(`Erro ao buscar anexos atuais: ${fetchError.message}`)
  }

  const currentIds = new Set<string>((currentRows || []).map((r) => r.id))

  // 3. Identificar operações
  const incomingIds = new Set<string>()
  const toUpdate: Array<{ id: string; nome: string; link: string; ordem: number }> = []
  const toInsert: Array<{
    contato_id: string
    nome: string
    link: string
    ordem: number
    created_by: string | null
  }> = []

  for (let i = 0; i < anexos.length; i++) {
    const item = anexos[i]
    const nome = item.nome.trim()
    const link = item.link.trim()
    const ordem = typeof item.ordem === 'number' ? item.ordem : i

    if (item.id && currentIds.has(item.id)) {
      toUpdate.push({
        id: item.id,
        nome,
        link,
        ordem,
      })
      incomingIds.add(item.id)
    } else {
      toInsert.push({
        contato_id: contatoId,
        nome,
        link,
        ordem,
        created_by: currentUserId,
      })
    }
  }

  // 4. Identificar anexos removidos
  const toDeleteIds: string[] = []
  for (const id of currentIds) {
    if (!incomingIds.has(id)) {
      toDeleteIds.push(id)
    }
  }

  // Executar deleções
  if (toDeleteIds.length > 0) {
    const { error: delError } = await supabase
      .from('manychat_contatos_anexos')
      .delete()
      .in('id', toDeleteIds)

    if (delError) {
      throw new Error(`Erro ao remover anexos: ${delError.message}`)
    }
  }

  // Executar updates
  for (const item of toUpdate) {
    const { error: updError } = await supabase
      .from('manychat_contatos_anexos')
      .update({
        nome: item.nome,
        link: item.link,
        ordem: item.ordem,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (updError) {
      throw new Error(`Erro ao atualizar anexo "${item.nome}": ${updError.message}`)
    }
  }

  // Executar inserts
  if (toInsert.length > 0) {
    const { error: insError } = await supabase.from('manychat_contatos_anexos').insert(toInsert)

    if (insError) {
      throw new Error(`Erro ao inserir novos anexos: ${insError.message}`)
    }
  }
}
