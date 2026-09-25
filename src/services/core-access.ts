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
  } | null
}

/**
 * Estrutura agregada expondo identidade legada, central e resolução efetiva.
 * NOTA: Nesta etapa preparatória, o resultado efetivo é 100% derivado de `profiles`.
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
  /**
   * Resolução efetiva utilizada pelo Conectaí.
   * Regra da Etapa 3: Estritamente baseado no legado para preservar comportamento.
   */
  effective: {
    source: 'legacy'
    perfil: string
    ativo: boolean
    gestorId: string | null
    legaldeskUsuarioId: string | null
    managedUserIds: string[]
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
export async function fetchCoreAccess(authUserId: string): Promise<CoreAccessData | null> {
  if (!authUserId) return null

  try {
    // 1. Consultar usuário central por auth_user_id
    const { data: usuario, error: userError } = await supabase
      .from('core_usuarios')
      .select('id, auth_user_id, nome, email, ativo, gestor_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (userError || !usuario) {
      if (import.meta.env.DEV && userError) {
        console.warn(
          '[core-access] Usuário não encontrado ou erro em core_usuarios:',
          userError.message,
        )
      }
      return null
    }

    // 2. Consultar sistema Conectaí
    const { data: sistema, error: sysError } = await supabase
      .from('core_sistemas')
      .select('id, codigo, nome, ativo')
      .eq('codigo', CORE_CONECTAI_SYSTEM_CODE)
      .maybeSingle()

    if (sysError && import.meta.env.DEV) {
      console.warn(
        '[core-access] Erro ao buscar sistema Conectaí em core_sistemas:',
        sysError.message,
      )
    }

    const sistemaId = sistema?.id || CORE_CONECTAI_SYSTEM_ID

    // 3. Consultar vínculo em core_usuario_sistemas com o perfil em core_perfis
    let vinculoConectai: CoreAccessData['vinculoConectai'] = null

    if (sistemaId) {
      const { data: vinculo, error: vinculoError } = await supabase
        .from('core_usuario_sistemas')
        .select(`
          id,
          sistema_id,
          perfil_id,
          ativo,
          core_sistemas (id, codigo, nome),
          core_perfis (id, codigo, nome)
        `)
        .eq('usuario_id', usuario.id)
        .eq('sistema_id', sistemaId)
        .maybeSingle()

      if (vinculoError && import.meta.env.DEV) {
        console.warn(
          '[core-access] Erro ao buscar vínculo em core_usuario_sistemas:',
          vinculoError.message,
        )
      }

      if (vinculo) {
        const perfil = Array.isArray(vinculo.core_perfis)
          ? vinculo.core_perfis[0]
          : vinculo.core_perfis
        const sis = Array.isArray(vinculo.core_sistemas)
          ? vinculo.core_sistemas[0]
          : vinculo.core_sistemas

        vinculoConectai = {
          id: vinculo.id,
          sistemaId: vinculo.sistema_id,
          sistemaCodigo: sis?.codigo || CORE_CONECTAI_SYSTEM_CODE,
          sistemaNome: sis?.nome || (sistema?.nome ?? 'Conectaí'),
          perfilId: vinculo.perfil_id,
          perfilCodigo: perfil?.codigo || '',
          perfilNome: perfil?.nome || '',
          ativo: Boolean(vinculo.ativo),
        }
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
          // Se RLS não permitir leitura de outro registro de core_usuarios, registra apenas o ID
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

    return {
      id: usuario.id,
      authUserId: usuario.auth_user_id,
      nome: usuario.nome,
      email: usuario.email,
      ativo: Boolean(usuario.ativo),
      gestorId: usuario.gestor_id,
      gestor,
      vinculoConectai,
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[core-access] Falha não bloqueante ao carregar core access:', err)
    }
    return null
  }
}

/**
 * Validação de equivalência silenciosa entre os dados legados (`profiles`) e `core_*`.
 * Regra: NUNCA exibe erro ao usuário nem bloqueia login. Apenas log em dev caso haja divergência.
 */
export function auditCoreEquivalence(
  legacy: {
    perfil: string
    ativo: boolean
    gestorId: string | null
  },
  core: CoreAccessData | null,
): void {
  if (!core) {
    if (import.meta.env.DEV) {
      console.info(
        '[core-access:audit] Usuário não possui registro no core_* ou leitura não retornou dados.',
      )
    }
    return
  }

  const discrepancies: string[] = []

  // 1. Comparar ativo
  if (legacy.ativo !== core.ativo) {
    discrepancies.push(`ativo difere: legacy=${legacy.ativo} vs core=${core.ativo}`)
  }

  // 2. Comparar perfil (normalizado para minúsculo)
  const legacyPerfil = (legacy.perfil || '').trim().toLowerCase()
  const corePerfil = (core.vinculoConectai?.perfilCodigo || '').trim().toLowerCase()
  if (legacyPerfil && corePerfil && legacyPerfil !== corePerfil) {
    discrepancies.push(`perfil difere: legacy="${legacyPerfil}" vs core="${corePerfil}"`)
  }

  // 3. Comparar gestor (se ambos existirem ou se um tiver e outro não)
  // Observação: legacy.gestorId é auth.users.id do gestor, enquanto core.gestorId é core_usuarios.id.
  // Se core.gestor possuir authUserId, comparamos diretamente.
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
      '[core-access:audit] Divergências detectadas (mantendo legado como efetivo):',
      discrepancies,
    )
  }
}
