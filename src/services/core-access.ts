import { supabase } from '@/lib/supabase/client'

/**
 * Identificador constante do sistema Conectaí no Gestor de Acessos Ricci.
 * Confirmado via banco de dados em `public.core_sistemas`:
 * - id: '1b085fa4-a4fa-4490-889a-9fea074f41d7'
 * - codigo: 'CONECTAI'
 * - nome: 'Conectaí'
 */
export const CORE_CONECTAI_SYSTEM_CODE = 'CONECTAI'
export const CORE_CONECTAI_SYSTEM_ID = '1b085fa4-a4fa-4490-889a-9fea074f41d7'

/**
 * Dados de identidade e vínculo lidos do sistema central `core_*`.
 */
/**
 * Status explícito do acesso do usuário ao sistema Conectaí no Gestor de Acessos Ricci (`core_*`).
 * Distingue categoricamente falha técnica de ausência/inativação de acesso central:
 * - 'ok': Vínculo ativo encontrado no Conectaí com perfil ativo e válido.
 * - 'no_core_user': Usuário não possui registro correspondente em `core_usuarios`.
 * - 'no_system_link': Usuário existe em `core_usuarios`, mas não possui registro em `core_usuario_sistemas` para o Conectaí.
 * - 'link_inactive': Vínculo com o sistema Conectaí está com `ativo = false` em `core_usuario_sistemas`.
 * - 'profile_inactive_or_invalid': Perfil associado está inativo (`ativo = false`) ou código inválido/desconhecido em `core_perfis`.
 * - 'technical_error': Falha técnica de rede/consulta/RLS ao tentar consultar o core.
 */
export type CoreAccessStatus =
  | 'ok'
  | 'no_core_user'
  | 'user_inactive'
  | 'system_inactive'
  | 'no_system_link'
  | 'link_inactive'
  | 'profile_inactive_or_invalid'
  | 'technical_error'

/**
 * Perfil válido suportado pelo Conectaí no core (normalizado em minúsculas).
 */
export type ConectaiRole = 'administrador' | 'gestor' | 'operacional'

/**
 * Normaliza códigos de perfil do core (ex: 'ADMINISTRADOR', 'GESTOR', 'OPERACIONAL')
 * para os perfis reconhecidos pelo Conectaí.
 */
export function normalizeCoreRole(codigo?: string | null): ConectaiRole | null {
  if (!codigo) return null
  const cleaned = codigo.trim().toLowerCase()
  if (cleaned === 'administrador' || cleaned === 'gestor' || cleaned === 'operacional') {
    return cleaned as ConectaiRole
  }
  return null
}

/**
 * Resultado completo da leitura e resolução do acesso central via `core_*`.
 */
export interface CoreAccessResult {
  status: CoreAccessStatus
  data: CoreAccessData | null
  /** Perfil normalizado no Conectaí se o status for 'ok' */
  resolvedPerfil: ConectaiRole | null
  /** Mensagem técnica descritiva para fins de auditoria/diagnóstico */
  detail?: string
}

/**
 * Dados de identidade e vínculo lidos do sistema central `core_*`.
 */
export interface CoreAccessData {
  /** ID na tabela `core_usuarios` */
  id: string
  /** ID no Supabase Auth (`auth.users.id`) */
  authUserId: string | null
  nome: string
  email: string
  ativo: boolean
  /** ID do gestor na tabela `core_usuarios` (auto-relacionamento) */
  gestorId: string | null
  /** Dados do gestor corporativo quando acessível/existente */
  gestor?: {
    id: string
    nome?: string | null
    email?: string | null
    authUserId?: string | null
  } | null
  /** Vínculo específico com o sistema Conectaí */
  vinculoConectai?: {
    id: string
    sistemaId: string
    sistemaCodigo: string
    sistemaNome: string
    perfilId: string
    perfilCodigo: string
    perfilNome: string
    ativo: boolean
    perfilAtivo: boolean
  } | null
}

/**
 * Resolução da fonte efetiva do perfil.
 */
export type EffectiveProfileSource = 'core' | 'legacy_fallback' | 'core_denied'

/**
 * Estrutura agregada expondo identidade legada, central e resolução efetiva.
 * Na Etapa 4: perfil é resolvido via core-first com fallback legado e menor privilégio.
 */
export interface CoreSubordinate {
  /** ID na tabela `core_usuarios` */
  id: string
  /** ID no Supabase Auth (`auth.users.id`) */
  authUserId: string | null
  nome: string
  email: string
  ativo: boolean
  /** ID do vínculo com o Conectaí em `core_usuario_sistemas` */
  vinculoId: string
  /** Perfil normalizado no Conectaí ('administrador' | 'gestor' | 'operacional') */
  perfilCodigo: ConectaiRole
}

export type ManagedTeamSource = 'core' | 'core_partial_bridge' | 'legacy_fallback' | 'empty'

export interface ManagedTeamResult {
  /** Fonte utilizada para resolver a equipe: 'core', 'core_partial_bridge', 'legacy_fallback' ou 'empty' */
  source: ManagedTeamSource
  /** Status da leitura central */
  status: 'ok' | 'technical_error'
  /** Subordinados válidos e ativos encontrados no core */
  coreSubordinates: CoreSubordinate[]
  /** IDs operacionais (legaldesk_usuario_id) prontos para consumo por canEditContact */
  managedUserIds: string[]
  /** IDs de core_usuarios correspondentes aos subordinados válidos */
  managedCoreUserIds: string[]
  /** Mensagem descritiva em caso de falha ou auditoria */
  detail?: string
  /** Diagnóstico de inconsistência na ponte RPC, se houver */
  rpcDiscrepancy?: 'empty_rpc' | 'partial_rpc' | 'rpc_error' | null
}

export interface AggregatedUserIdentity {
  authUserId: string
  /** Identidade e dados legados (tabela `profiles`) */
  legacy: {
    perfil: string
    ativo: boolean
    legaldeskUsuarioId: string | null
    gestorId: string | null
    managedUserIds: string[]
  }
  /** Identidade e vínculos centrais (tabelas `core_*`), preenchido se a leitura tiver sucesso */
  core: CoreAccessData | null
  /** Status da leitura central */
  coreStatus?: CoreAccessStatus
  /**
   * Resolução efetiva utilizada pelo Conectaí.
   * Na Etapa 4: perfil vem de core quando válido, fallback quando técnico/temporário,
   * e bloqueado/sem privilégio quando negado pelo core.
   */
  effective: {
    source: EffectiveProfileSource
    perfil: string
    ativo: boolean
    gestorId: string | null
    legaldeskUsuarioId: string | null
    managedUserIds: string[]
    coreStatus?: CoreAccessStatus
  }
}

/**
 * Realiza a leitura preparatória dos dados de acesso corporativo em `core_*`.
 *
 * Consultas executadas (em conformidade com as RLS do authenticated):
 * 1. `core_usuarios` filtrando por `auth_user_id = authUserId`
 * 2. Identificação do sistema Conectaí em `core_sistemas` (código 'CONECTAI')
 * 3. Vínculo do usuário no Conectaí em `core_usuario_sistemas` + `core_perfis`
 * 4. Dados do gestor em `core_usuarios` caso exista `gestor_id` e permissão RLS
 *
 * Tratamento de falhas:
 * Envolvido em try/catch completo. NUNCA lança exceção para a camada chamadora.
 * Em caso de qualquer erro ou tabela inacessível, retorna null silenciosamente.
 */
/**
 * Executa a leitura central em `core_*` e retorna o resultado estruturado com distinção
 * categórica entre falha técnica, usuário inexistente, ausência de vínculo e vínculo/perfil inativo.
 */
export async function fetchCoreAccessResult(authUserId: string): Promise<CoreAccessResult> {
  if (!authUserId) {
    return {
      status: 'technical_error',
      data: null,
      resolvedPerfil: null,
      detail: 'authUserId não fornecido',
    }
  }

  try {
    // 1. Consultar usuário central por auth_user_id
    const { data: usuario, error: userError } = await supabase
      .from('core_usuarios')
      .select('id, auth_user_id, nome, email, ativo, gestor_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (userError) {
      if (import.meta.env.DEV) {
        console.warn('[core-access] Erro técnico ao consultar core_usuarios:', userError.message)
      }
      return {
        status: 'technical_error',
        data: null,
        resolvedPerfil: null,
        detail: `Erro ao consultar core_usuarios: ${userError.message}`,
      }
    }

    if (!usuario) {
      return {
        status: 'no_core_user',
        data: null,
        resolvedPerfil: null,
        detail: 'Usuário não cadastrado em core_usuarios',
      }
    }

    // 2. Identificar ID do sistema Conectaí
    const sistemaId = CORE_CONECTAI_SYSTEM_ID

    // 2. Se o usuário estiver inativo no Gestor de Acessos Ricci (core_usuarios.ativo = false)
    if (!usuario.ativo) {
      return {
        status: 'user_inactive',
        data: {
          id: usuario.id,
          authUserId: usuario.auth_user_id,
          nome: usuario.nome,
          email: usuario.email,
          ativo: false,
          gestorId: usuario.gestor_id,
          gestor: null,
          vinculoConectai: null,
        },
        resolvedPerfil: null,
        detail: 'Usuário desativado no Gestor de Acessos Ricci (core_usuarios.ativo = false)',
      }
    }

    // 3. Consultar vínculo em core_usuario_sistemas com perfil associado em core_perfis
    const { data: vinculo, error: vinculoError } = await supabase
      .from('core_usuario_sistemas')
      .select(`
        id,
        sistema_id,
        perfil_id,
        ativo,
        core_sistemas (id, codigo, nome, ativo),
        core_perfis (id, codigo, nome, ativo)
      `)
      .eq('usuario_id', usuario.id)
      .eq('sistema_id', sistemaId)
      .maybeSingle()

    if (vinculoError) {
      if (import.meta.env.DEV) {
        console.warn(
          '[core-access] Erro técnico ao consultar core_usuario_sistemas:',
          vinculoError.message,
        )
      }
      return {
        status: 'technical_error',
        data: {
          id: usuario.id,
          authUserId: usuario.auth_user_id,
          nome: usuario.nome,
          email: usuario.email,
          ativo: Boolean(usuario.ativo),
          gestorId: usuario.gestor_id,
          gestor: null,
          vinculoConectai: null,
        },
        resolvedPerfil: null,
        detail: `Erro ao consultar vínculo no core: ${vinculoError.message}`,
      }
    }

    // 4. Consultar gestor corporativo (se houver gestor_id)
    let gestor: CoreAccessData['gestor'] = null
    if (usuario.gestor_id) {
      try {
        const { data: gestorData, error: gestorError } = await supabase
          .from('core_usuarios')
          .select('id, auth_user_id, nome, email')
          .eq('id', usuario.gestor_id)
          .maybeSingle()

        if (!gestorError && gestorData) {
          gestor = {
            id: gestorData.id,
            nome: gestorData.nome,
            email: gestorData.email,
            authUserId: gestorData.auth_user_id,
          }
        } else {
          gestor = {
            id: usuario.gestor_id,
            nome: null,
            email: null,
            authUserId: null,
          }
        }
      } catch {
        gestor = {
          id: usuario.gestor_id,
          nome: null,
          email: null,
          authUserId: null,
        }
      }
    }

    // Se o usuário não possui registro de vínculo com o Conectaí
    if (!vinculo) {
      return {
        status: 'no_system_link',
        data: {
          id: usuario.id,
          authUserId: usuario.auth_user_id,
          nome: usuario.nome,
          email: usuario.email,
          ativo: Boolean(usuario.ativo),
          gestorId: usuario.gestor_id,
          gestor,
          vinculoConectai: null,
        },
        resolvedPerfil: null,
        detail: 'Usuário não possui vínculo com o sistema Conectaí em core_usuario_sistemas',
      }
    }

    const perfilRaw = Array.isArray(vinculo.core_perfis)
      ? vinculo.core_perfis[0]
      : vinculo.core_perfis
    const sisRaw = Array.isArray(vinculo.core_sistemas)
      ? vinculo.core_sistemas[0]
      : vinculo.core_sistemas

    const sistemaAtivo = sisRaw ? Boolean(sisRaw.ativo) : false
    const vinculoAtivo = Boolean(vinculo.ativo)
    const perfilAtivo = perfilRaw ? Boolean(perfilRaw.ativo) : false
    const perfilCodigo = perfilRaw?.codigo || ''
    const normalizedRole = normalizeCoreRole(perfilCodigo)

    const vinculoConectai: NonNullable<CoreAccessData['vinculoConectai']> = {
      id: vinculo.id,
      sistemaId: vinculo.sistema_id,
      sistemaCodigo: sisRaw?.codigo || CORE_CONECTAI_SYSTEM_CODE,
      sistemaNome: sisRaw?.nome || 'Conectaí',
      perfilId: vinculo.perfil_id,
      perfilCodigo,
      perfilNome: perfilRaw?.nome || '',
      ativo: vinculoAtivo,
      perfilAtivo,
    }

    const coreData: CoreAccessData = {
      id: usuario.id,
      authUserId: usuario.auth_user_id,
      nome: usuario.nome,
      email: usuario.email,
      ativo: Boolean(usuario.ativo),
      gestorId: usuario.gestor_id,
      gestor,
      vinculoConectai,
    }

    // Validar status do sistema Conectaí
    if (!sistemaAtivo) {
      return {
        status: 'system_inactive',
        data: coreData,
        resolvedPerfil: null,
        detail: 'Sistema Conectaí está desativado (core_sistemas.ativo = false)',
      }
    }

    // Validar status do vínculo e perfil
    if (!vinculoAtivo) {
      return {
        status: 'link_inactive',
        data: coreData,
        resolvedPerfil: null,
        detail:
          'Vínculo do usuário com o sistema Conectaí está inativo (core_usuario_sistemas.ativo = false)',
      }
    }

    if (!perfilAtivo || !normalizedRole) {
      return {
        status: 'profile_inactive_or_invalid',
        data: coreData,
        resolvedPerfil: null,
        detail: !perfilAtivo
          ? 'Perfil do vínculo no Conectaí está inativo (core_perfis.ativo = false)'
          : `Código de perfil '${perfilCodigo}' não é válido no Conectaí`,
      }
    }

    return {
      status: 'ok',
      data: coreData,
      resolvedPerfil: normalizedRole,
      detail: `Perfil central confirmado: ${normalizedRole}`,
    }
  } catch (err: any) {
    if (import.meta.env.DEV) {
      console.warn('[core-access] Exceção técnica em fetchCoreAccessResult:', err)
    }
    return {
      status: 'technical_error',
      data: null,
      resolvedPerfil: null,
      detail: err?.message || 'Exceção inesperada na leitura do core',
    }
  }
}

/**
 * Função mantida para retrocompatibilidade: retorna CoreAccessData ou null.
 */
export async function fetchCoreAccess(authUserId: string): Promise<CoreAccessData | null> {
  const result = await fetchCoreAccessResult(authUserId)
  return result.data
}

/**
 * Validação de equivalência silenciosa entre os dados legados (`profiles`) e `core_*`.
 * Regra: NUNCA exibe erro ao usuário nem bloqueia login. Apenas log em dev caso haja divergência.
 */
/**
 * Resolve o perfil efetivo seguindo a estratégia core-first com fallback legado e menor privilégio:
 * - Se coreStatus === 'ok' e resolvedPerfil for válido: perfil vem do CORE (`source: 'core'`).
 * - Se coreStatus for ausência de acesso central ('no_core_user', 'no_system_link', 'link_inactive', 'profile_inactive_or_invalid'):
 *   NÃO faz fallback para profiles. Trata como acesso negado no core (`source: 'core_denied'`),
 *   atribuindo perfil vazio ('') para aplicar menor privilégio (sem permissões de administrador/gestor).
 * - Se coreStatus for erro técnico ('technical_error') ou leitura indisponível temporariamente:
 *   aplica fallback para `profiles.perfil` (`source: 'legacy_fallback'`).
 */
export function resolveEffectiveProfile(
  coreResult: CoreAccessResult | null,
  legacyPerfil: string,
): {
  perfil: string
  source: EffectiveProfileSource
  coreStatus: CoreAccessStatus
  hasSystemAccess: boolean
} {
  if (!coreResult) {
    return {
      perfil: legacyPerfil || '',
      source: 'legacy_fallback',
      coreStatus: 'technical_error',
      hasSystemAccess: Boolean(legacyPerfil),
    }
  }

  const { status, resolvedPerfil } = coreResult

  if (status === 'ok' && resolvedPerfil) {
    return {
      perfil: resolvedPerfil,
      source: 'core',
      coreStatus: 'ok',
      hasSystemAccess: true,
    }
  }

  // Falha técnica: permite fallback de transição
  if (status === 'technical_error') {
    return {
      perfil: legacyPerfil || '',
      source: 'legacy_fallback',
      coreStatus: 'technical_error',
      hasSystemAccess: Boolean(legacyPerfil),
    }
  }

  // Resultado central válido indicando ausência ou inativação de acesso:
  // Princípio de menor privilégio: NÃO aplicar fallback para profiles, perfil fica vazio/sem permissões
  return {
    perfil: '',
    source: 'core_denied',
    coreStatus: status,
    hasSystemAccess: false,
  }
}

/**
 * Converte subordinados do core em IDs operacionais (`legaldesk_usuario_id`) através da RPC `core_managed_operational_ids`.
 * Etapa 5.10: Substitui a consulta direta à tabela `profiles` pela RPC `core_managed_operational_ids()`.
 *
 * Retorna `{ status: 'ok', items }` ou `{ status: 'error', error }`.
 */
export async function bridgeSubordinatesToOperationalIds(): Promise<{
  status: 'ok' | 'error'
  items: Array<{ auth_user_id: string; legaldesk_usuario_id: string }>
  error?: string
}> {
  try {
    const { data, error } = await supabase.rpc('core_managed_operational_ids')

    if (error) {
      if (import.meta.env.DEV) {
        console.warn(
          '[core-access] Erro ao chamar RPC core_managed_operational_ids:',
          error.message,
        )
      }
      return {
        status: 'error',
        items: [],
        error: error.message,
      }
    }

    const items = (data || []).filter(
      (item): item is { auth_user_id: string; legaldesk_usuario_id: string } =>
        Boolean(item && item.auth_user_id && item.legaldesk_usuario_id),
    )

    return {
      status: 'ok',
      items,
    }
  } catch (err: any) {
    if (import.meta.env.DEV) {
      console.warn('[core-access] Exceção na RPC core_managed_operational_ids:', err)
    }
    return {
      status: 'error',
      items: [],
      error: err?.message || 'Exceção inesperada na RPC core_managed_operational_ids',
    }
  }
}

/**
 * Consulta a equipe legada de subordinados operacionais via RPC `legacy_managed_operational_ids`.
 * Etapa 5.12: Fallback legado seguro e restrito a falha técnica completa na leitura do core.
 * Substitui integralmente qualquer consulta direta à tabela `profiles` com `eq('gestor_id', authUserId)`.
 *
 * Retorna `{ status: 'ok', items, managedUserIds }` ou `{ status: 'error', items: [], managedUserIds: [], error }`.
 * NUNCA lança exceção.
 */
export async function fetchLegacyManagedOperationalIds(): Promise<{
  status: 'ok' | 'error'
  items: Array<{ auth_user_id: string; legaldesk_usuario_id: string }>
  managedUserIds: string[]
  error?: string
}> {
  try {
    const { data, error } = await supabase.rpc('legacy_managed_operational_ids')

    if (error) {
      if (import.meta.env.DEV) {
        console.warn(
          '[core-access] Erro ao chamar RPC legacy_managed_operational_ids:',
          error.message,
        )
      }
      return {
        status: 'error',
        items: [],
        managedUserIds: [],
        error: error.message,
      }
    }

    const items = (data || []).filter(
      (item): item is { auth_user_id: string; legaldesk_usuario_id: string } =>
        Boolean(item && item.auth_user_id && item.legaldesk_usuario_id),
    )

    const managedUserIds = Array.from(
      new Set(items.map((i) => i.legaldesk_usuario_id).filter(Boolean)),
    )

    return {
      status: 'ok',
      items,
      managedUserIds,
    }
  } catch (err: any) {
    if (import.meta.env.DEV) {
      console.warn('[core-access] Exceção na RPC legacy_managed_operational_ids:', err)
    }
    return {
      status: 'error',
      items: [],
      managedUserIds: [],
      error: err?.message || 'Exceção inesperada na RPC legacy_managed_operational_ids',
    }
  }
}

/**
 * Consulta a equipe de subordinados diretos de um gestor no Gestor de Acessos Ricci (`core_*`).
 *
 * Regras (Etapa 5.10):
 * - Filtra `core_usuarios` onde `gestor_id = gestorCoreId` e `ativo = true`.
 * - Valida vínculo com Conectaí em `core_usuario_sistemas`: `sistema_id = CORE_CONECTAI_SYSTEM_ID`, `ativo = true`.
 * - Valida perfil associado em `core_perfis`: `ativo = true` e código válido (`ADMINISTRADOR`, `GESTOR` ou `OPERACIONAL`).
 * - Obtém temporariamente os `legaldesk_usuario_id` correspondentes via RPC `core_managed_operational_ids()`.
 *
 * Retorna `{ status: 'ok', subordinates, managedUserIds, managedCoreUserIds, rpcBridge }` ou `{ status: 'technical_error' }`.
 * NUNCA lança exceção.
 */
export async function fetchCoreManagedTeamResult(gestorCoreId: string): Promise<{
  status: 'ok' | 'technical_error'
  subordinates: CoreSubordinate[]
  managedUserIds: string[]
  managedCoreUserIds: string[]
  detail?: string
  rpcBridge?: {
    status: 'ok' | 'error'
    items: Array<{ auth_user_id: string; legaldesk_usuario_id: string }>
    error?: string
  }
}> {
  if (!gestorCoreId) {
    return {
      status: 'technical_error',
      subordinates: [],
      managedUserIds: [],
      managedCoreUserIds: [],
      detail: 'gestorCoreId não fornecido',
    }
  }

  try {
    // 1. Buscar subordinados diretos na tabela core_usuarios
    const { data: directSubs, error: subsError } = await supabase
      .from('core_usuarios')
      .select('id, auth_user_id, nome, email, ativo, gestor_id')
      .eq('gestor_id', gestorCoreId)

    if (subsError) {
      if (import.meta.env.DEV) {
        console.warn(
          '[core-access] Erro técnico ao buscar subordinados em core_usuarios:',
          subsError.message,
        )
      }
      return {
        status: 'technical_error',
        subordinates: [],
        managedUserIds: [],
        managedCoreUserIds: [],
        detail: subsError.message,
      }
    }

    // Se o gestor não possui subordinados cadastrados no core
    if (!directSubs || directSubs.length === 0) {
      return {
        status: 'ok',
        subordinates: [],
        managedUserIds: [],
        managedCoreUserIds: [],
        rpcBridge: { status: 'ok', items: [] },
      }
    }

    // Apenas subordinados com cadastro de usuário ativo
    const activeSubs = directSubs.filter((s) => s.ativo === true)
    if (activeSubs.length === 0) {
      return {
        status: 'ok',
        subordinates: [],
        managedUserIds: [],
        managedCoreUserIds: [],
        rpcBridge: { status: 'ok', items: [] },
      }
    }

    const subCoreIds = activeSubs.map((s) => s.id)

    // 2. Buscar vínculos com o Conectaí em core_usuario_sistemas + core_perfis
    const { data: vinculos, error: vinculosError } = await supabase
      .from('core_usuario_sistemas')
      .select(`
        id,
        usuario_id,
        sistema_id,
        perfil_id,
        ativo,
        core_perfis (id, codigo, nome, ativo)
      `)
      .in('usuario_id', subCoreIds)
      .eq('sistema_id', CORE_CONECTAI_SYSTEM_ID)

    if (vinculosError) {
      if (import.meta.env.DEV) {
        console.warn(
          '[core-access] Erro técnico ao buscar vínculos da equipe em core_usuario_sistemas:',
          vinculosError.message,
        )
      }
      return {
        status: 'technical_error',
        subordinates: [],
        managedUserIds: [],
        managedCoreUserIds: [],
        detail: vinculosError.message,
      }
    }

    // 3. Filtrar apenas subordinados com vínculo ativo e perfil ativo/válido no Conectaí
    const eligibleSubordinates: CoreSubordinate[] = []

    for (const sub of activeSubs) {
      const vinculo = (vinculos || []).find((v) => v.usuario_id === sub.id)
      if (!vinculo || !vinculo.ativo) {
        // Sem vínculo com Conectaí ou vínculo inativo: descartar
        continue
      }

      const perfilRaw = Array.isArray(vinculo.core_perfis)
        ? vinculo.core_perfis[0]
        : vinculo.core_perfis
      if (!perfilRaw || !perfilRaw.ativo) {
        // Perfil central inativo: descartar
        continue
      }

      const normalizedRole = normalizeCoreRole(perfilRaw.codigo)
      if (!normalizedRole) {
        // Perfil desconhecido/inválido: descartar
        continue
      }

      eligibleSubordinates.push({
        id: sub.id,
        authUserId: sub.auth_user_id,
        nome: sub.nome,
        email: sub.email,
        ativo: true,
        vinculoId: vinculo.id,
        perfilCodigo: normalizedRole,
      })
    }

    // Se nenhum subordinado for elegível (vínculo ou perfil inativo no Conectaí)
    if (eligibleSubordinates.length === 0) {
      return {
        status: 'ok',
        subordinates: [],
        managedUserIds: [],
        managedCoreUserIds: [],
        rpcBridge: { status: 'ok', items: [] },
      }
    }

    // 4. Etapa 5.10: Obter legaldesk_usuario_id via RPC core_managed_operational_ids
    const rpcResult = await bridgeSubordinatesToOperationalIds()

    // Mapear apenas para os subordinados elegíveis do core
    const eligibleAuthIds = new Set(
      eligibleSubordinates.map((s) => s.authUserId).filter((id): id is string => Boolean(id)),
    )

    let operationalIds: string[] = []
    if (rpcResult.status === 'ok') {
      operationalIds = rpcResult.items
        .filter((item) => eligibleAuthIds.has(item.auth_user_id))
        .map((item) => item.legaldesk_usuario_id)
        .filter(Boolean)
    }

    return {
      status: 'ok',
      subordinates: eligibleSubordinates,
      managedUserIds: operationalIds,
      managedCoreUserIds: eligibleSubordinates.map((s) => s.id),
      rpcBridge: rpcResult,
    }
  } catch (err: any) {
    if (import.meta.env.DEV) {
      console.warn('[core-access] Exceção técnica em fetchCoreManagedTeamResult:', err)
    }
    return {
      status: 'technical_error',
      subordinates: [],
      managedUserIds: [],
      managedCoreUserIds: [],
      detail: err?.message || 'Exceção inesperada na leitura da equipe central',
    }
  }
}

/**
 * Função utilitária pura para resolver a equipe gerenciada (`managedUserIds`) seguindo core-first:
 *
 * Regra Principal da Etapa 5.12:
 * Se o core respondeu com sucesso, o core SEMPRE define quem pertence à equipe.
 * O legado só pode definir a equipe quando houver falha técnica completa na leitura da hierarquia central.
 * NUNCA usar a equipe legada para sobrescrever uma equipe central válida.
 *
 * Cenários:
 * 1. Core válido + ponte operacional completa (ex.: 3 subs, ponte retorna 3):
 *    - Usa os 3 IDs centrais traduzidos.
 *    - source: 'core', status: 'ok', sem fallback legado.
 * 2. Core válido + equipe vazia (0 subs):
 *    - Equipe vazia válida: managedUserIds: [], managedCoreUserIds: [].
 *    - source: 'empty' (ou 'core'), status: 'ok', sem fallback legado.
 * 3. Core válido + ponte operacional parcial (ex.: 3 subs, ponte traduz apenas 2):
 *    - Mantém SOMENTE os subordinados centrais que puderem ser traduzidos com segurança (os 2).
 *    - NÃO usa toda a equipe legada.
 *    - NÃO mescla com subordinados que não pertencem ao core.
 *    - source: 'core_partial_bridge', status: 'ok', rpcDiscrepancy: 'partial_rpc'.
 *    - Registra diagnóstico técnico da inconsistência.
 * 4. Core válido + ponte operacional vazia (ex.: 3 subs, ponte traduz 0):
 *    - NÃO usa hierarquia legada para reconstruir a equipe.
 *    - Resultado operacional fica vazio nesta fase (managedUserIds: []).
 *    - Preserva hierarquia central como autoridade (coreSubordinates e managedCoreUserIds preservados).
 *    - source: 'core_partial_bridge', status: 'ok', rpcDiscrepancy: 'empty_rpc' (ou 'rpc_error' se rpc falhou).
 *    - Registra erro/inconsistência técnica sem elevar permissões via legado.
 * 5. Falha técnica completa da leitura do core (coreTeamResult === null ou status === 'technical_error'):
 *    - Somente neste cenário utiliza o legado via legacyManagedUserIds (da RPC legacy_managed_operational_ids).
 *    - source: 'legacy_fallback', status: 'technical_error'.
 */
export function resolveManagedTeam(
  coreTeamResult: {
    status: 'ok' | 'technical_error'
    subordinates: CoreSubordinate[]
    managedUserIds: string[]
    managedCoreUserIds: string[]
    detail?: string
    rpcBridge?: {
      status: 'ok' | 'error'
      items: Array<{ auth_user_id: string; legaldesk_usuario_id: string }>
      error?: string
    }
  } | null,
  legacyManagedUserIds: string[],
): ManagedTeamResult {
  // Cenário 5: Falha técnica completa da leitura do core
  // SOMENTE neste cenário o legado pode ser utilizado como fallback transitório de continuidade.
  if (!coreTeamResult || coreTeamResult.status !== 'ok') {
    if (import.meta.env.DEV) {
      console.warn(
        '[core-access:resolveManagedTeam] Falha técnica completa na leitura do core. Aplicando fallback legado via RPC legacy_managed_operational_ids.',
        coreTeamResult?.detail,
      )
    }
    return {
      source: 'legacy_fallback',
      status: 'technical_error',
      coreSubordinates: [],
      managedUserIds: legacyManagedUserIds || [],
      managedCoreUserIds: [],
      detail: coreTeamResult?.detail || 'Fallback legado por falha técnica completa no core',
      rpcDiscrepancy: null,
    }
  }

  const { subordinates, managedUserIds, managedCoreUserIds, detail, rpcBridge } = coreTeamResult
  const centralSubsCount = subordinates.length

  // Cenário 2: Core válido + equipe vazia (sem subordinados cadastrados/ativos no core)
  if (centralSubsCount === 0) {
    return {
      source: 'empty',
      status: 'ok',
      coreSubordinates: [],
      managedUserIds: [],
      managedCoreUserIds: [],
      detail,
      rpcDiscrepancy: null,
    }
  }

  // A partir daqui, core respondeu com sucesso E possui subordinados (centralSubsCount > 0).
  // REGRA: O core é a autoridade. O legado NUNCA entra aqui nem substitui a equipe central.

  // Cenário 4a: Erro técnico na execução da RPC core_managed_operational_ids
  if (rpcBridge && rpcBridge.status === 'error') {
    if (import.meta.env.DEV) {
      console.warn(
        `[core-access:resolveManagedTeam] Erro técnico na RPC core_managed_operational_ids: ${rpcBridge.error}. Core é a autoridade: preservando hierarquia central, resultado operacional fica vazio nesta fase sem fallback legado.`,
      )
    }
    return {
      source: 'core_partial_bridge',
      status: 'ok',
      coreSubordinates: subordinates,
      managedUserIds: [],
      managedCoreUserIds,
      detail: `Erro técnico na RPC de IDs operacionais: ${rpcBridge.error}. Equipe central preservada sem permissão operacional legada.`,
      rpcDiscrepancy: 'rpc_error',
    }
  }

  const rpcReturnedCount = managedUserIds.length

  // Cenário 4b: Core válido com subordinados, mas a ponte operacional não traduziu nenhum (retornou 0)
  if (rpcReturnedCount === 0) {
    if (import.meta.env.DEV) {
      console.warn(
        `[core-access:resolveManagedTeam] Inconsistência na ponte RPC: equipe central possui ${centralSubsCount} subordinado(s), mas RPC traduziu 0 IDs operacionais. Core é a autoridade: mantendo equipe operacional vazia nesta fase sem elevar permissões via legado.`,
        { centralSubsCount, subordinates, legacyManagedUserIds },
      )
    }
    return {
      source: 'core_partial_bridge',
      status: 'ok',
      coreSubordinates: subordinates,
      managedUserIds: [],
      managedCoreUserIds,
      detail: `Inconsistência da ponte operacional: central possui ${centralSubsCount} subordinados válidos, mas RPC retornou 0 IDs operacionais.`,
      rpcDiscrepancy: 'empty_rpc',
    }
  }

  // Cenário 3: Core válido + ponte operacional parcial (ex.: central possui 3 subordinados, RPC traduziu apenas 2)
  if (rpcReturnedCount < centralSubsCount) {
    if (import.meta.env.DEV) {
      console.warn(
        `[core-access:resolveManagedTeam] Inconsistência parcial na ponte RPC: central possui ${centralSubsCount} subordinados, mas RPC traduziu apenas ${rpcReturnedCount} IDs operacionais. Mantendo somente os subordinados centrais traduzidos (sem mesclar com legado).`,
        { centralSubsCount, rpcReturnedCount, managedUserIds, legacyManagedUserIds },
      )
    }
    return {
      source: 'core_partial_bridge',
      status: 'ok',
      coreSubordinates: subordinates,
      managedUserIds,
      managedCoreUserIds,
      detail: `Inconsistência parcial da ponte: central tem ${centralSubsCount} subordinados, RPC retornou ${rpcReturnedCount} IDs operacionais com sucesso.`,
      rpcDiscrepancy: 'partial_rpc',
    }
  }

  // Cenário 1: Core válido + ponte operacional completa (todos os subordinados centrais traduzidos)
  return {
    source: 'core',
    status: 'ok',
    coreSubordinates: subordinates,
    managedUserIds,
    managedCoreUserIds,
    detail,
    rpcDiscrepancy: null,
  }
}

/**
 * Registra divergências detectadas entre a equipe apurada via core e a equipe legada.
 * Somente log em modo de desenvolvimento (DEV), nunca altera dados nem exibe para o usuário.
 */
export function auditManagedTeamDiscrepancy(
  coreManagedUserIds: string[],
  legacyManagedUserIds: string[],
  sourceApplied: ManagedTeamSource,
): void {
  if (!import.meta.env.DEV) return

  const sortedCore = [...coreManagedUserIds].sort()
  const sortedLegacy = [...legacyManagedUserIds].sort()

  const isIdentical =
    sortedCore.length === sortedLegacy.length &&
    sortedCore.every((val, idx) => val === sortedLegacy[idx])

  if (!isIdentical) {
    console.warn(
      `[core-access:managed-team-audit] Divergência na equipe do gestor (fonte aplicada: ${sourceApplied}):`,
      {
        coreManagedUserIds,
        legacyManagedUserIds,
        inCoreOnly: coreManagedUserIds.filter((id) => !legacyManagedUserIds.includes(id)),
        inLegacyOnly: legacyManagedUserIds.filter((id) => !coreManagedUserIds.includes(id)),
      },
    )
  }
}

/**
 * Validação de equivalência e auditoria entre os dados legados (`profiles`) e `core_*`.
 * Regra: NUNCA exibe erro ao usuário nem bloqueia login. Loga divergências para diagnóstico.
 */
export function auditCoreEquivalence(
  legacy: {
    perfil: string
    ativo: boolean
    gestorId: string | null
  },
  core: CoreAccessData | null,
  effectivePerfil?: string,
  effectiveSource?: EffectiveProfileSource,
): void {
  if (!core) {
    if (import.meta.env.DEV) {
      console.info(
        '[core-access:audit] Usuário sem registro no core_* ou leitura técnica indisponível (usando fallback legado).',
      )
    }
    return
  }

  const discrepancies: string[] = []

  // 1. Comparar ativo (profiles.ativo continua a fonte de controle na Etapa 4)
  if (legacy.ativo !== core.ativo) {
    discrepancies.push(`ativo difere: legacy=${legacy.ativo} vs core=${core.ativo}`)
  }

  // 2. Comparar perfil (normalizado para minúsculo)
  const legacyPerfil = (legacy.perfil || '').trim().toLowerCase()
  const corePerfil = (core.vinculoConectai?.perfilCodigo || '').trim().toLowerCase()
  if (legacyPerfil && corePerfil && legacyPerfil !== corePerfil) {
    discrepancies.push(
      `perfil difere: legacy="${legacyPerfil}" vs core="${corePerfil}" (perfil efetivo aplicado: "${effectivePerfil}" via ${effectiveSource})`,
    )
  }

  // 3. Comparar gestor (se ambos existirem ou se um tiver e outro não)
  if (legacy.gestorId && core.gestor?.authUserId) {
    if (legacy.gestorId !== core.gestor.authUserId) {
      discrepancies.push(
        `gestor authUserId difere: legacy=${legacy.gestorId} vs coreGestorAuth=${core.gestor.authUserId}`,
      )
    }
  } else if (Boolean(legacy.gestorId) !== Boolean(core.gestorId)) {
    discrepancies.push(
      `vínculo de gestor difere presença: legacy=${Boolean(legacy.gestorId)} vs core=${Boolean(core.gestorId)}`,
    )
  }

  if (discrepancies.length > 0 && import.meta.env.DEV) {
    console.warn(
      '[core-access:audit] Divergências detectadas entre profiles e core_* (perfil resolvido via core-first):',
      discrepancies,
    )
  }
}
