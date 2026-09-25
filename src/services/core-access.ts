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

    // 3. Consultar vínculo em core_usuario_sistemas com perfil associado em core_perfis
    const { data: vinculo, error: vinculoError } = await supabase
      .from('core_usuario_sistemas')
      .select(`
        id,
        sistema_id,
        perfil_id,
        ativo,
        core_sistemas (id, codigo, nome),
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
} {
  if (!coreResult) {
    return {
      perfil: legacyPerfil || '',
      source: 'legacy_fallback',
      coreStatus: 'technical_error',
    }
  }

  const { status, resolvedPerfil } = coreResult

  if (status === 'ok' && resolvedPerfil) {
    return {
      perfil: resolvedPerfil,
      source: 'core',
      coreStatus: 'ok',
    }
  }

  // Falha técnica: permite fallback de transição
  if (status === 'technical_error') {
    return {
      perfil: legacyPerfil || '',
      source: 'legacy_fallback',
      coreStatus: 'technical_error',
    }
  }

  // Resultado central válido indicando ausência ou inativação de acesso:
  // Princípio de menor privilégio: NÃO aplicar fallback para profiles, perfil fica vazio/sem permissões
  return {
    perfil: '',
    source: 'core_denied',
    coreStatus: status,
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
