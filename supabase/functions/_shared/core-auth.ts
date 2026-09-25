import { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const SYSTEM_CODE_CONECTAI = 'CONECTAI'
export const ROLE_CODE_ADMINISTRADOR = 'ADMINISTRADOR'

export interface CoreAdminAuthResult {
  allowed: boolean
  error?: string
  status?: number
  coreUser?: {
    id: string
    auth_user_id: string | null
    nome: string
    email: string
  }
}

/**
 * Validação central estrita para autorização de Administrador no Conectaí:
 * auth.users.id → core_usuarios.auth_user_id → core_usuario_sistemas → sistema CONECTAI → core_perfis.codigo = 'ADMINISTRADOR'
 *
 * Valida:
 * - core_usuarios.ativo = true
 * - core_usuario_sistemas.ativo = true
 * - core_sistemas.ativo = true
 * - core_perfis.ativo = true
 *
 * NÃO usa profiles.perfil como fallback de autorização.
 */
export async function verifyConectaiAdmin(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<CoreAdminAuthResult> {
  if (!authUserId) {
    return {
      allowed: false,
      error: 'Não autorizado.',
      status: 401,
    }
  }

  // 1. Localizar o usuário correspondente em core_usuarios
  const { data: coreUser, error: userError } = await supabase
    .from('core_usuarios')
    .select('id, auth_user_id, nome, email, ativo')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (userError || !coreUser) {
    return {
      allowed: false,
      error: 'Permissão negada: usuário corporativo não localizado.',
      status: 403,
    }
  }

  if (!coreUser.ativo) {
    return {
      allowed: false,
      error: 'Permissão negada: usuário inativo no sistema corporativo.',
      status: 403,
    }
  }

  // 2. Localizar vínculo com o sistema CONECTAI e perfil ADMINISTRADOR
  const { data: adminLinks, error: linkError } = await supabase
    .from('core_usuario_sistemas')
    .select(`
      id,
      ativo,
      core_sistemas!inner(codigo, ativo),
      core_perfis!inner(codigo, ativo)
    `)
    .eq('usuario_id', coreUser.id)
    .eq('ativo', true)
    .eq('core_sistemas.codigo', SYSTEM_CODE_CONECTAI)
    .eq('core_sistemas.ativo', true)
    .eq('core_perfis.codigo', ROLE_CODE_ADMINISTRADOR)
    .eq('core_perfis.ativo', true)

  if (linkError || !adminLinks || adminLinks.length === 0) {
    return {
      allowed: false,
      error: 'Permissão negada: apenas administradores do Conectaí possuem acesso.',
      status: 403,
    }
  }

  return {
    allowed: true,
    coreUser: {
      id: coreUser.id,
      auth_user_id: coreUser.auth_user_id,
      nome: coreUser.nome,
      email: coreUser.email,
    },
  }
}

/**
 * Localização de gestor para notificação de transferência/atribuição:
 * 1. responsavel_id (legaldesk_usuario_id) → profiles.legaldesk_usuario_id apenas como ponte temporária para obter auth_user_id
 * 2. localizar o correspondente em core_usuarios (por auth_user_id)
 * 3. usar core_usuarios.gestor_id para determinar quem é o gestor (auto-relacionamento core_usuarios.id)
 * 4. buscar os dados do gestor em core_usuarios (email, nome)
 *
 * A hierarquia vem exclusivamente do core_*. profiles.gestor_id NUNCA decide quem é o gestor.
 */
export async function resolveGestorFromCore(
  supabase: SupabaseClient,
  targetLegaldeskUsuarioId: string,
  destEmail: string,
): Promise<{ gestorEmail: string | null; gestorNome: string | null }> {
  try {
    if (!targetLegaldeskUsuarioId) {
      return { gestorEmail: null, gestorNome: null }
    }

    // 1. Ponte temporária: profiles.legaldesk_usuario_id -> profiles.id (que é o auth_user_id)
    const { data: bridgeProfile, error: bridgeError } = await supabase
      .from('profiles')
      .select('id')
      .eq('legaldesk_usuario_id', targetLegaldeskUsuarioId)
      .maybeSingle()

    if (bridgeError || !bridgeProfile?.id) {
      return { gestorEmail: null, gestorNome: null }
    }

    // 2. Localizar usuário correspondente em core_usuarios
    const { data: coreUser, error: coreUserError } = await supabase
      .from('core_usuarios')
      .select('id, gestor_id')
      .eq('auth_user_id', bridgeProfile.id)
      .maybeSingle()

    if (coreUserError || !coreUser?.gestor_id) {
      return { gestorEmail: null, gestorNome: null }
    }

    // 3. Buscar dados do gestor em core_usuarios usando core_usuarios.gestor_id
    const { data: gestorCore, error: gestorError } = await supabase
      .from('core_usuarios')
      .select('id, nome, email, ativo')
      .eq('id', coreUser.gestor_id)
      .maybeSingle()

    if (gestorError || !gestorCore) {
      return { gestorEmail: null, gestorNome: null }
    }

    const candidateEmail = (gestorCore.email || '').trim()
    if (candidateEmail && candidateEmail.toLowerCase() !== destEmail.toLowerCase()) {
      return {
        gestorEmail: candidateEmail,
        gestorNome: (gestorCore.nome || '').trim() || null,
      }
    }

    return { gestorEmail: null, gestorNome: null }
  } catch (err) {
    console.warn('Falha segura na resolução de gestor via core_*:', err)
    return { gestorEmail: null, gestorNome: null }
  }
}
