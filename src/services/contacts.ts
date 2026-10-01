import { supabase } from '@/lib/supabase/client'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { OFFICIAL_STAGES } from '@/constants/stages'

export interface ContactsFilters {
  stages?: string[]
  responsavel_ids?: string[]
  responsavel_core_usuario_ids?: string[]
  servico_ids?: string[]
  depto_ids?: (string | number)[]
  follow_ups?: string[]
  origem_ids?: (string | number)[]
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
  responsavel_core_usuario_id?: string | null
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
  email?: string
  core_usuario_id?: string
  legaldesk_usuario_id?: string
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

/**
 * Regra central de autorização de edição de atendimentos:
 * Baseada no vínculo oficial central `manychat_contatos.responsavel_core_usuario_id` (FK para `core_usuarios.id`).
 *
 * - ADMINISTRADOR: pode editar qualquer atendimento (se hasSystemAccess === true).
 * - OPERACIONAL: pode editar somente se `contact.responsavel_core_usuario_id === profile.core_usuario_id`.
 * - GESTOR: pode editar se:
 *    (1) ele próprio for o responsável (`contact.responsavel_core_usuario_id === profile.core_usuario_id`), OU
 *    (2) o responsável pertencer à sua equipe central (`managedCoreUserIds` inclui `contact.responsavel_core_usuario_id`).
 *
 * Tratamento seguro:
 * - Atendimentos sem responsável (`responsavel_core_usuario_id` nulo/vazio) NÃO concedem permissão
 *   nem para Gestor nem para Operacional.
 * - `hasSystemAccess === true` é obrigatório para qualquer perfil/operação.
 * - Compatibilidade retroativa transparente com chamadas legadas que passam IDs operacionais.
 */
export function canEditContact(
  contact: Pick<Contact, 'responsavel_id' | 'responsavel_core_usuario_id'> | null | undefined,
  profile:
    | {
        perfil?: string | null
        core_usuario_id?: string | null
        legaldesk_usuario_id?: string | null
        ativo?: boolean
        hasSystemAccess?: boolean
      }
    | null
    | undefined,
  managedCoreUserIds?: string[] | null,
): boolean {
  if (!profile || profile.ativo === false) {
    return false
  }

  // 1. Princípio de menor privilégio: a autorização de edição exige contexto central resolvido.
  // Se hasSystemAccess !== true (incluindo undefined, false, null) → não edita.
  // Nem administrador recebe autorização frontend se hasSystemAccess !== true.
  if (profile.hasSystemAccess !== true) {
    return false
  }

  // 2. Administrador (perfil efetivo 'administrador' com hasSystemAccess === true) → pode editar qualquer atendimento.
  if (profile.perfil === 'administrador') {
    return true
  }

  // Atendimentos sem responsável central ou legado definido:
  // NÃO concedem permissão a gestor nem operacional.
  const centralContactResp = contact?.responsavel_core_usuario_id
    ? String(contact.responsavel_core_usuario_id).trim()
    : null
  const legacyContactResp = contact?.responsavel_id ? String(contact.responsavel_id).trim() : null

  // Identificador do contato prioriza o campo central
  const contactEffectiveResp = centralContactResp || legacyContactResp
  if (!contactEffectiveResp) {
    return false
  }

  // Identificador do usuário logado: prioriza ID central de core_usuarios
  const userCentralId = profile.core_usuario_id ? String(profile.core_usuario_id).trim() : null
  const userLegacyId = profile.legaldesk_usuario_id
    ? String(profile.legaldesk_usuario_id).trim()
    : null

  // 3. Operacional → pode editar somente quando o atendimento é próprio
  if (profile.perfil === 'operacional') {
    if (centralContactResp && userCentralId) {
      return centralContactResp === userCentralId
    }
    // Compatibilidade segura para dados em transição / mocks de teste:
    if (legacyContactResp && userLegacyId) {
      return legacyContactResp === userLegacyId
    }
    if (centralContactResp && userLegacyId) {
      return centralContactResp === userLegacyId
    }
    if (legacyContactResp && userCentralId) {
      return legacyContactResp === userCentralId
    }
    return false
  }

  // 4. Gestor → pode editar:
  // (a) atendimento próprio
  // (b) membro da sua equipe (subordinados centrais em managedCoreUserIds)
  if (profile.perfil === 'gestor') {
    // (a) atendimento próprio
    const isOwn =
      (Boolean(centralContactResp) &&
        Boolean(userCentralId) &&
        centralContactResp === userCentralId) ||
      (Boolean(legacyContactResp) && Boolean(userLegacyId) && legacyContactResp === userLegacyId) ||
      (Boolean(centralContactResp) &&
        Boolean(userLegacyId) &&
        centralContactResp === userLegacyId) ||
      (Boolean(legacyContactResp) && Boolean(userCentralId) && legacyContactResp === userCentralId)

    if (isOwn) {
      return true
    }

    // (b) membro da equipe gerenciada
    if (managedCoreUserIds && managedCoreUserIds.length > 0) {
      const teamSet = new Set(managedCoreUserIds.map((id) => String(id).trim()))
      if (centralContactResp && teamSet.has(centralContactResp)) {
        return true
      }
      if (legacyContactResp && teamSet.has(legacyContactResp)) {
        return true
      }
    }

    return false
  }

  return false
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
    'responsavel_core_usuario_id',
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

export async function notifyResponsavelTransfer(
  contatoId: string,
  previousResponsavelCoreId: string | null,
  newResponsavelCoreId: string,
  legacyPreviousId?: string | null,
  legacyNewId?: string | null,
) {
  const { data, error } = await supabase.functions.invoke('notify-responsavel-transfer', {
    body: {
      contato_id: contatoId,
      new_responsavel_core_usuario_id: newResponsavelCoreId,
      previous_responsavel_core_usuario_id: previousResponsavelCoreId,
      // Retrocompatibilidade para quem lê os campos anteriores
      new_responsavel_id: newResponsavelCoreId || legacyNewId,
      previous_responsavel_id: previousResponsavelCoreId || legacyPreviousId,
    },
  })
  if (error) throw error
  return data
}

export async function notifyReabertura(
  contatoId: string,
  previousStage: string | null,
  newStage: string,
  responsavelCoreId?: string | null,
) {
  const { data, error } = await supabase.functions.invoke('notify-responsavel-transfer', {
    body: {
      type: 'reabertura',
      contato_id: contatoId,
      previous_stage: previousStage,
      new_stage: newStage,
      responsavel_core_usuario_id: responsavelCoreId,
      responsavel_id: responsavelCoreId,
    },
  })
  if (error) throw error
  return data
}

export async function createContact(payload: Partial<Contact>) {
  const sanitized = sanitizeContactPayload(payload)
  if (!sanitized.manychat_id) {
    sanitized.manychat_id = 'manual_' + new Date().getTime()
  }

  // Se for criação manual (manychat_id começando com 'manual_'), valida campos obrigatórios essenciais
  if (sanitized.manychat_id.startsWith('manual_')) {
    const cleanNome = (sanitized.lead_nome || sanitized.nome || '').trim()
    if (!cleanNome) {
      throw new Error('O campo Nome do Contato é obrigatório.')
    }
    sanitized.lead_nome = cleanNome
    sanitized.nome = cleanNome

    const origemId = sanitized.origem_id
    if (origemId == null || isNaN(Number(origemId)) || Number(origemId) <= 0) {
      throw new Error('O campo Origem é obrigatório.')
    }

    const servicoId = sanitized.servico_id
    if (!servicoId || typeof servicoId !== 'string' || !servicoId.trim()) {
      throw new Error('O campo Serviço Selecionado é obrigatório.')
    }

    const deptoId = sanitized.depto_id
    if (deptoId == null || isNaN(Number(deptoId)) || Number(deptoId) <= 0) {
      throw new Error('O campo Departamento é obrigatório.')
    }

    const currentStage = (sanitized.current_stage || '').trim()
    const isStageValid = OFFICIAL_STAGES.some((s) => s.id === currentStage)
    if (!currentStage || !isStageValid) {
      throw new Error('O campo Status é obrigatório e deve ser válido.')
    }
  }

  const { data, error } = await supabase
    .from('manychat_contatos')
    .insert([sanitized as any])
    .select()
    .single()
  if (error) throw error
  return data
}

export interface DeleteContactAuthContext {
  perfil?: string | null
  ativo?: boolean
  hasSystemAccess?: boolean
}

export async function deleteContact(id: string, authContext?: DeleteContactAuthContext | null) {
  // Apenas administradores com acesso confirmado ao sistema Conectaí podem excluir atendimentos.
  // Utiliza autorização central via useAuth() (hasSystemAccess === true e perfil efetivo 'administrador').
  // Não cria nova consulta independente em profiles.
  if (
    !authContext ||
    authContext.ativo === false ||
    authContext.hasSystemAccess !== true ||
    authContext.perfil !== 'administrador'
  ) {
    throw new Error('Permissão negada: apenas administradores podem excluir atendimentos.')
  }

  const { error } = await supabase.rpc('hard_delete_manychat_contato', { p_contato_id: id })
  if (error) throw error
}

export async function getResponsaveis(): Promise<Responsavel[]> {
  try {
    // Listagem oficial de responsáveis para Atendimentos e Kanban:
    // Carrega usuários ativos de `core_usuarios` vinculados ao Conectaí
    // e mapeia em paralelo com legaldesk_usuarios para preenchimento de compatibilidade retroativa.
    const [coreRes, ldRes] = await Promise.all([
      supabase
        .from('core_usuarios')
        .select('id, nome, email, ativo')
        .eq('ativo', true)
        .order('nome', { ascending: true }),
      supabase
        .from('legaldesk_usuarios')
        .select('id, nome, email, exibir_gestao_usuarios, ativo')
        .eq('ativo', true),
    ])

    const coreData = coreRes.data || []
    const ldData = ldRes.data || []

    const ldByEmail = new Map<string, any>()
    for (const ld of ldData) {
      if (ld.email) {
        ldByEmail.set(ld.email.trim().toLowerCase(), ld)
      }
    }

    if (coreData.length > 0) {
      return coreData.map((u) => {
        const emailKey = (u.email || '').trim().toLowerCase()
        const ldMatch = ldByEmail.get(emailKey)
        return {
          id: u.id, // ID central oficial (core_usuarios.id)
          nome: u.nome || '',
          email: u.email || undefined,
          core_usuario_id: u.id,
          legaldesk_usuario_id: ldMatch?.id,
        }
      })
    }

    // Fallback de contingência caso core_usuarios falhe
    return ldData
      .filter((u) => u.exibir_gestao_usuarios !== false)
      .map((u) => ({
        id: u.id,
        nome: u.nome || '',
        email: u.email || undefined,
        legaldesk_usuario_id: u.id,
      }))
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
      responsavel_core_usuario_id,
      cancel_reason_id,
      manychat_origens(nome),
      manychat_servicos(descricao),
      manychat_deptos(nome),
      manychat_portes_empresa(nome),
      legaldesk_usuarios(nome),
      core_usuarios!manychat_contatos_responsavel_core_usuario_id_fkey(nome, email),
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
        `lead_nome.ilike."${s}",nome.ilike."${s}",lead_email.ilike."${s}",numero_cliente.eq.${numericSearch}`,
      )
    } else {
      query = query.or(`lead_nome.ilike."${s}",nome.ilike."${s}",lead_email.ilike."${s}"`)
    }
  }

  // Se qualquer filtro de array estiver explicitamente vazio (nenhuma opção selecionada), retornar vazio
  if (
    (filters.responsavel_ids && filters.responsavel_ids.length === 0) ||
    (filters.servico_ids && filters.servico_ids.length === 0) ||
    (filters.depto_ids && filters.depto_ids.length === 0) ||
    (filters.follow_ups && filters.follow_ups.length === 0) ||
    (filters.origem_ids && filters.origem_ids.length === 0)
  ) {
    return []
  }

  const responsavelFilter = filters.responsavel_core_usuario_ids || filters.responsavel_ids
  if (responsavelFilter) {
    if (responsavelFilter.includes('__NULL__')) {
      const validIds = responsavelFilter.filter((id) => id !== '__NULL__')
      if (validIds.length > 0) {
        query = query.or(
          `responsavel_core_usuario_id.in.(${validIds.join(',')}),responsavel_core_usuario_id.is.null`,
        )
      } else {
        query = query.is('responsavel_core_usuario_id', null)
      }
    } else {
      query = query.in('responsavel_core_usuario_id', responsavelFilter)
    }
  }

  if (filters.servico_ids) {
    query = query.in('servico_id', filters.servico_ids)
  }

  if (filters.depto_ids) {
    query = query.in('depto_id', filters.depto_ids.map(Number))
  }

  if (filters.origem_ids) {
    query = query.in('origem_id', filters.origem_ids.map(Number))
  }

  const allFollowUpOptions = ['today', 'next_7_days', 'overdue', 'none']
  const isAllFollowUpsSelected =
    filters.follow_ups && allFollowUpOptions.every((opt) => filters.follow_ups?.includes(opt))

  if (filters.follow_ups && filters.follow_ups.length > 0 && !isAllFollowUpsSelected) {
    const todayStart = startOfDay(new Date()).toISOString()
    const todayEnd = endOfDay(new Date()).toISOString()
    const next7Days = endOfDay(addDays(new Date(), 7)).toISOString()

    const orConditions: string[] = []
    for (const fup of filters.follow_ups) {
      if (fup === 'today') {
        orConditions.push(
          `and(data_follow_up.gte."${todayStart}",data_follow_up.lte."${todayEnd}")`,
        )
      } else if (fup === 'next_7_days') {
        orConditions.push(`and(data_follow_up.gt."${todayEnd}",data_follow_up.lte."${next7Days}")`)
      } else if (fup === 'overdue') {
        orConditions.push(`data_follow_up.lt."${todayStart}"`)
      } else if (fup === 'none') {
        orConditions.push('data_follow_up.is.null')
      }
    }

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','))
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
        responsavel_core_usuario_id,
        cancel_reason_id,
        manychat_origens(nome),
        manychat_servicos(descricao),
        manychat_deptos(nome),
        manychat_portes_empresa(nome),
        legaldesk_usuarios(nome),
        core_usuarios!manychat_contatos_responsavel_core_usuario_id_fkey(nome, email),
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

export async function updateContact(
  id: string,
  updates: any,
  previousStage?: string,
  _userId?: string,
) {
  // Etapa 5.19: A validação de frontend é feita antes da chamada nos componentes
  // (Contacts, Kanban, ContactModal) com o contexto central resolvido pelo useAuth().
  // Não reconstruir autorização pelo legado dentro do service (sem chamadas a profiles.perfil,
  // profiles.legaldesk_usuario_id ou legacy_managed_operational_ids). A RLS e as policies
  // do banco atuam como a barreira final de segurança.

  const rawPayload = { ...updates }

  if (rawPayload.current_stage) {
    const isValid = OFFICIAL_STAGES.some((s) => s.id === rawPayload.current_stage)
    if (!isValid) {
      throw new Error(`Status inválido: ${rawPayload.current_stage}`)
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
    throw new Error(`Status inválido: ${stage}`)
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
      .eq('contato_id', contatoId)
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
      .eq('contato_id', contatoId)
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
