import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import {
  CoreAccessData,
  CoreAccessStatus,
  EffectiveProfileSource,
  AggregatedUserIdentity,
  ManagedTeamSource,
  CoreSubordinate,
  fetchCoreAccessResult,
  fetchCoreManagedTeamResult,
  fetchLegacyManagedOperationalIds,
  resolveEffectiveProfile,
  resolveManagedTeam,
  auditCoreEquivalence,
  auditManagedTeamDiscrepancy,
} from '@/services/core-access'

export interface UserProfile {
  /**
   * Perfil efetivo do usuário no Conectaí.
   * Resolvido exclusivamente via Gestor de Acessos Ricci (`core_*`).
   */
  perfil: string
  ativo: boolean
  gestor_id?: string | null
  legaldesk_usuario_id?: string | null
  managed_user_ids?: string[]
  managed_core_user_ids?: string[]
  /**
   * IDs em core_usuarios dos subordinados diretos da equipe.
   * Estrutura complementar aditiva (Etapa 5.8).
   */
  managedCoreUserIds?: string[]
  /**
   * Fonte de onde a equipe gerenciada foi resolvida ('core' ou 'legacy_fallback').
   */
  managedTeamSource?: ManagedTeamSource
  /**
   * Fonte efetiva de onde o perfil foi resolvido.
   * 'core' | 'technical_error' | 'core_denied'
   */
  perfilSource?: EffectiveProfileSource
  /**
   * Status detalhado da leitura no Gestor de Acessos Ricci (`core_*`).
   */
  coreStatus?: CoreAccessStatus
  /**
   * Indica se o usuário possui acesso permitido ao sistema Conectaí.
   * Falso quando core_denied ('no_core_user', 'no_system_link', 'link_inactive', 'profile_inactive_or_invalid')
   * ou quando houver technical_error sem autoridade válida.
   */
  hasSystemAccess?: boolean
}
/**
 * Função utilitária pura para avaliar se uma tentativa de acesso deve ser permitida ou bloqueada
 * e se a sessão Supabase Auth deve ser preservada ou encerrada.
 * Centraliza as regras de negócio utilizadas pelo AuthGuard e useAuth, facilitando testes unitários isolados.
 */
export function evaluateAccessDecision(params: {
  user: { id: string } | null
  profile: {
    ativo: boolean
    perfil: string
    perfilSource?: EffectiveProfileSource
    coreStatus?: CoreAccessStatus
    hasSystemAccess?: boolean
  } | null
}): {
  allowed: boolean
  redirectReason?: 'disabled' | 'no_access' | 'login'
  shouldSignOut: boolean
} {
  const { user, profile } = params

  if (!user) {
    return {
      allowed: false,
      redirectReason: 'login',
      shouldSignOut: false,
    }
  }

  // Usuário desativado no Gestor de Acessos Ricci (core_usuarios.ativo = false / coreStatus === 'user_inactive'):
  // Bloqueado e com encerramento de sessão (redirect para /login?reason=disabled).
  // profiles.ativo NÃO é mais autoridade de sessão ou de acesso.
  if (profile && profile.coreStatus === 'user_inactive') {
    return {
      allowed: false,
      redirectReason: 'disabled',
      shouldSignOut: true,
    }
  }

  // Se profile possui hasSystemAccess explicitamente falso ou perfilSource === 'core_denied'
  // (ex: sem vínculo com o Conectaí, sistema inativo, vínculo inativo, perfil inativo/inválido)
  // Bloqueado no Conectaí, MAS NÃO encerra a sessão Supabase Auth caso ativo seja true
  // (o usuário pode ter acesso a outros sistemas Ricci com a mesma credencial)
  if (profile?.hasSystemAccess === false || profile?.perfilSource === 'core_denied') {
    return {
      allowed: false,
      redirectReason: 'no_access',
      shouldSignOut: false,
    }
  }

  // Se não há perfil carregado ou o perfil está vazio
  if (!profile || !profile.perfil) {
    return {
      allowed: false,
      redirectReason: 'no_access',
      shouldSignOut: false,
    }
  }

  return {
    allowed: true,
    shouldSignOut: false,
  }
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  managedUserIds: string[]
  /**
   * IDs em core_usuarios da equipe do gestor.
   * Complementar e opcional / aditivo (Etapa 5.8).
   */
  managedCoreUserIds?: string[]
  /**
   * Fonte de resolução da equipe gerenciada ('core' | 'legacy_fallback').
   */
  managedTeamSource?: ManagedTeamSource
  /**
   * Dados corporativos centrais lidos de `core_*` (camada preparatória).
   * Opcional / aditivo para não quebrar consumidores existentes.
   */
  coreAccess?: CoreAccessData | null
  /**
   * Subordinados válidos da equipe central do gestor (Etapa 5.8).
   */
  managedCoreSubordinates?: CoreSubordinate[]
  /**
   * Estrutura agregada consolidando identidade legada, central e resolução efetiva.
   * Opcional / aditivo.
   */
  identity?: AggregatedUserIdentity | null
  /**
   * Flag central indicando se o usuário autenticado tem acesso permitido ao Conectaí.
   * Verdadeiro apenas se autenticado, coreStatus !== 'user_inactive' e profile.hasSystemAccess === true
   * (respeitando a decisão única já produzida por resolveEffectiveProfile e core_usuarios.ativo).
   */
  hasSystemAccess: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: any; disabled?: boolean; noAccess?: boolean }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (password: string) => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [managedUserIds, setManagedUserIds] = useState<string[]>([])
  const [managedCoreUserIds, setManagedCoreUserIds] = useState<string[]>([])
  const [managedTeamSource, setManagedTeamSource] = useState<ManagedTeamSource | undefined>(
    undefined,
  )
  const [managedCoreSubordinates, setManagedCoreSubordinates] = useState<CoreSubordinate[]>([])
  const [coreAccess, setCoreAccess] = useState<CoreAccessData | null>(null)
  const [identity, setIdentity] = useState<AggregatedUserIdentity | null>(null)
  const [loading, setLoading] = useState(true)

  // Ref de controle de concorrência e sessão para proteger leituras assíncronas de core_*
  // Evita race condition se a sessão mudar, expirar ou fizer logout enquanto a consulta está em voo
  const currentAuthUserIdRef = useRef<string | null>(null)
  const coreAccessRequestIdRef = useRef<number>(0)

  const handleSessionChange = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      currentAuthUserIdRef.current = null
      coreAccessRequestIdRef.current += 1
      setSession(null)
      setUser(null)
      setProfile(null)
      setManagedUserIds([])
      setManagedCoreUserIds([])
      setManagedTeamSource(undefined)
      setManagedCoreSubordinates([])
      setCoreAccess(null)
      setIdentity(null)
      setLoading(false)
      return
    }

    const authUserId = currentSession.user.id
    currentAuthUserIdRef.current = authUserId
    const requestId = ++coreAccessRequestIdRef.current

    try {
      // 1. Consultar dados do Gestor de Acessos Ricci (core_*) e profiles em paralelo
      // Timeout seguro de 10s para evitar qualquer chance de loading infinito em caso de rede travada.
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('core_timeout')), 10000),
      )

      const profilePromise = supabase
        .from('profiles')
        .select('perfil, ativo, legaldesk_usuario_id, gestor_id')
        .eq('id', authUserId)
        .maybeSingle()

      const [profileResponse, coreResultRaw] = await Promise.allSettled([
        profilePromise,
        Promise.race([fetchCoreAccessResult(authUserId), timeoutPromise]),
      ])

      // Verificar se a sessão ainda é a mesma antes de prosseguir
      if (
        currentAuthUserIdRef.current !== authUserId ||
        coreAccessRequestIdRef.current !== requestId
      ) {
        return
      }

      const profileData = profileResponse.status === 'fulfilled' ? profileResponse.value.data : null

      if (profileResponse.status === 'fulfilled' && profileResponse.value.error) {
        console.error('Erro ao buscar perfil do usuário:', profileResponse.value.error)
      }

      let coreResult: Awaited<ReturnType<typeof fetchCoreAccessResult>>
      if (coreResultRaw.status === 'fulfilled') {
        coreResult = coreResultRaw.value
      } else {
        if (import.meta.env.DEV) {
          console.warn(
            '[use-auth] Falha técnica ou timeout ao consultar core access:',
            coreResultRaw.reason,
          )
        }
        coreResult = {
          status: 'technical_error',
          data: null,
          resolvedPerfil: null,
          detail: coreResultRaw.reason?.message || 'Erro inesperado ou timeout ao consultar core',
        }
      }

      // Se o usuário foi inativado no Gestor de Acessos Ricci (core_usuarios.ativo = false)
      // A autoridade de sessão agora é o core_usuarios.ativo: encerrar sessão Supabase Auth e redirecionar
      if (coreResult.status === 'user_inactive' || coreResult.data?.ativo === false) {
        currentAuthUserIdRef.current = null
        coreAccessRequestIdRef.current += 1
        setProfile({
          perfil: '',
          ativo: false,
          gestor_id: coreResult.data?.gestorId ?? profileData?.gestor_id ?? null,
          legaldesk_usuario_id: profileData?.legaldesk_usuario_id ?? null,
          managed_user_ids: [],
          managed_core_user_ids: [],
          coreStatus: 'user_inactive',
          hasSystemAccess: false,
        })
        setUser(null)
        setSession(null)
        setManagedUserIds([])
        setManagedCoreUserIds([])
        setManagedTeamSource(undefined)
        setManagedCoreSubordinates([])
        setCoreAccess(coreResult.data)
        setIdentity(null)
        await supabase.auth.signOut()
        return
      }

      // Resolver perfil efetivo via camada central:
      // - ok -> perfil do core
      // - technical_error -> perfil vazio sem fallback de perfil pelo legado (source: 'technical_error', hasSystemAccess: false)
      // - no_core_user, user_inactive, system_inactive, no_system_link, link_inactive, profile_inactive_or_invalid -> perfil vazio (core_denied)
      const resolution = resolveEffectiveProfile(coreResult, profileData?.perfil ?? '')
      const coreData = coreResult.data
      const effectiveRole = resolution.perfil

      // Etapa 5.8: Montagem da equipe do gestor (managedUserIds)
      // NÃO utilizar profileData.perfil === 'gestor' do legado para decidir se deve carregar equipe.
      // Utilizar o perfil efetivo (effectiveRole === 'gestor').
      let finalManagedUserIds: string[] = []
      let finalManagedCoreUserIds: string[] = []
      let finalManagedCoreSubs: CoreSubordinate[] = []
      let finalTeamSource: ManagedTeamSource | undefined = undefined

      let legacyTeamIds: string[] = []

      if (effectiveRole === 'gestor') {
        // Etapa 5.12: Core é a autoridade da hierarquia.
        // O legado só pode definir a equipe quando houver falha técnica completa na leitura da hierarquia central.
        // Consulta direta à tabela profiles por gestor_id REMOVIDA. Fallback usa exclusivamente a RPC legacy_managed_operational_ids().
        if (coreData?.id) {
          try {
            const teamResult = await fetchCoreManagedTeamResult(coreData.id)

            // Verificar novamente sessão após a query central
            if (
              currentAuthUserIdRef.current !== authUserId ||
              coreAccessRequestIdRef.current !== requestId
            ) {
              return
            }

            // Se o core respondeu com sucesso ('ok'), o core define a equipe e NUNCA usa fallback legado
            if (teamResult.status === 'ok') {
              const teamResolution = resolveManagedTeam(teamResult, [])
              finalTeamSource = teamResolution.source
              finalManagedUserIds = teamResolution.managedUserIds
              finalManagedCoreUserIds = teamResolution.managedCoreUserIds
              finalManagedCoreSubs = teamResolution.coreSubordinates
            } else {
              // Falha técnica na leitura da hierarquia central: carregar fallback legado via RPC
              const legacyRpc = await fetchLegacyManagedOperationalIds()

              // Verificar novamente sessão após a RPC legada
              if (
                currentAuthUserIdRef.current !== authUserId ||
                coreAccessRequestIdRef.current !== requestId
              ) {
                return
              }

              legacyTeamIds = legacyRpc.managedUserIds
              const teamResolution = resolveManagedTeam(teamResult, legacyTeamIds)
              finalTeamSource = teamResolution.source
              finalManagedUserIds = teamResolution.managedUserIds
              finalManagedCoreUserIds = teamResolution.managedCoreUserIds
              finalManagedCoreSubs = teamResolution.coreSubordinates

              auditManagedTeamDiscrepancy(
                teamResolution.managedUserIds,
                legacyTeamIds,
                teamResolution.source,
              )
            }
          } catch (teamErr: any) {
            if (import.meta.env.DEV) {
              console.warn(
                '[use-auth] Exceção na carga da equipe central, consultando fallback legado via RPC:',
                teamErr,
              )
            }
            // Falha técnica completa: carregar fallback legado via RPC legacy_managed_operational_ids
            const legacyRpc = await fetchLegacyManagedOperationalIds()

            if (
              currentAuthUserIdRef.current !== authUserId ||
              coreAccessRequestIdRef.current !== requestId
            ) {
              return
            }

            legacyTeamIds = legacyRpc.managedUserIds
            finalTeamSource = 'legacy_fallback'
            finalManagedUserIds = legacyTeamIds
          }
        } else {
          // Usuário gestor sem dados centrais (ex.: coreAccess com falha técnica completa)
          const legacyRpc = await fetchLegacyManagedOperationalIds()

          if (
            currentAuthUserIdRef.current !== authUserId ||
            coreAccessRequestIdRef.current !== requestId
          ) {
            return
          }

          legacyTeamIds = legacyRpc.managedUserIds
          finalTeamSource = 'legacy_fallback'
          finalManagedUserIds = legacyTeamIds
        }
      }

      // Verificar se a sessão não mudou antes de publicar o estado final
      if (
        currentAuthUserIdRef.current !== authUserId ||
        coreAccessRequestIdRef.current !== requestId
      ) {
        return
      }

      const legacyProfileInfo = {
        perfil: profileData?.perfil ?? '',
        ativo: Boolean(profileData?.ativo),
        legaldeskUsuarioId: profileData?.legaldesk_usuario_id ?? null,
        gestorId: profileData?.gestor_id ?? null,
        managedUserIds: legacyTeamIds,
      }

      auditCoreEquivalence(legacyProfileInfo, coreData, resolution.perfil, resolution.source)

      // Autoridade de usuário ativo/inativo migrada para core_usuarios.ativo:
      // Se coreData existir, a autoridade de `ativo` é coreData.ativo.
      // Em fallback técnico puro (sem coreData), preserva profileData?.ativo.
      const isUserActive = coreData ? coreData.ativo : Boolean(profileData?.ativo ?? true)

      // Regra de acesso: permitido apenas se usuário ativo, vínculo Conectaí ativo, sistema ativo e perfil ativo
      // resolution.hasSystemAccess valida vínculo ativo, sistema ativo e perfil ativo.
      const hasAccess = isUserActive && resolution.hasSystemAccess

      // Publicar dados finais de autenticação, equipe e perfil
      setManagedUserIds(finalManagedUserIds)
      setManagedCoreUserIds(finalManagedCoreUserIds)
      setManagedTeamSource(finalTeamSource)
      setManagedCoreSubordinates(finalManagedCoreSubs)
      setCoreAccess(coreData)
      setProfile({
        perfil: resolution.perfil,
        ativo: isUserActive,
        gestor_id: coreData?.gestorId ?? legacyProfileInfo.gestorId,
        legaldesk_usuario_id: legacyProfileInfo.legaldeskUsuarioId,
        managed_user_ids: finalManagedUserIds,
        managed_core_user_ids: finalManagedCoreUserIds,
        managedTeamSource: finalTeamSource,
        perfilSource: resolution.source,
        coreStatus: resolution.coreStatus,
        hasSystemAccess: hasAccess,
      })
      setSession(currentSession)
      setUser(currentSession.user)

      setIdentity({
        authUserId,
        legacy: legacyProfileInfo,
        core: coreData,
        coreStatus: resolution.coreStatus,
        effective: {
          source: resolution.source,
          perfil: resolution.perfil,
          ativo: legacyProfileInfo.ativo,
          gestorId: legacyProfileInfo.gestorId,
          legaldeskUsuarioId: legacyProfileInfo.legaldeskUsuarioId,
          managedUserIds: finalManagedUserIds,
          coreStatus: resolution.coreStatus,
        },
      })
    } catch (err) {
      console.error('Exceção ao carregar perfil:', err)
      currentAuthUserIdRef.current = null
      coreAccessRequestIdRef.current += 1
      setSession(null)
      setUser(null)
      setProfile(null)
      setManagedUserIds([])
      setManagedCoreUserIds([])
      setManagedTeamSource(undefined)
      setManagedCoreSubordinates([])
      setCoreAccess(null)
      setIdentity(null)
    } finally {
      // Liberar loading apenas se esta ainda for a requisição ativa
      if (coreAccessRequestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionChange(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Regra de integração: não colocar async/await direto dentro do callback síncrono, delegar para a função async
      handleSessionChange(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || !profile || profile.ativo !== true) {
      return
    }

    const authUserId = user.id
    const coreUserId = coreAccess?.id

    // Função centralizada para encerrar sessão e redirecionar quando usuário for desativado
    const terminateSessionDisabled = async () => {
      // Proteção de concorrência: verificar se a sessão ainda pertence a este usuário
      if (currentAuthUserIdRef.current !== authUserId) {
        return
      }
      currentAuthUserIdRef.current = null
      coreAccessRequestIdRef.current += 1
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setManagedUserIds([])
      setManagedCoreUserIds([])
      setManagedTeamSource(undefined)
      setManagedCoreSubordinates([])
      setCoreAccess(null)
      setIdentity(null)
      setProfile({
        perfil: '',
        ativo: false,
        coreStatus: 'user_inactive',
        hasSystemAccess: false,
      })
      window.location.href = '/login?reason=disabled'
    }

    // Função para reavaliar as regras centrais caso haja alteração de vínculo, perfil ou sistema
    const reevaluateCoreAccess = async () => {
      if (currentAuthUserIdRef.current !== authUserId) {
        return
      }
      const requestId = ++coreAccessRequestIdRef.current
      try {
        const coreResult = await fetchCoreAccessResult(authUserId)
        if (
          currentAuthUserIdRef.current !== authUserId ||
          coreAccessRequestIdRef.current !== requestId
        ) {
          return
        }

        // Se o usuário foi desativado no Gestor de Acessos Ricci:
        if (coreResult.status === 'user_inactive' || coreResult.data?.ativo === false) {
          await terminateSessionDisabled()
          return
        }

        // Se qualquer condição central ficou inválida (sistema, vínculo, perfil):
        // Bloquear acesso no Conectaí
        const resolution = resolveEffectiveProfile(coreResult, profile.perfil)
        const hasAccess = Boolean(coreResult.data?.ativo && resolution.hasSystemAccess)

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                perfil: resolution.perfil,
                ativo: Boolean(coreResult.data?.ativo),
                perfilSource: resolution.source,
                coreStatus: resolution.coreStatus,
                hasSystemAccess: hasAccess,
              }
            : null,
        )
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[use-auth:realtime] Erro ao reavaliar acesso central:', err)
        }
      }
    }

    // Consolidar em um canal único para as tabelas centrais do Gestor de Acessos Ricci
    const channelName = `core-access-${authUserId}`
    let channel = supabase.channel(channelName)

    // 1. Monitorar core_usuarios do usuário autenticado (inativação direta encerra sessão para /login?reason=disabled)
    channel = channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'core_usuarios',
        filter: `auth_user_id=eq.${authUserId}`,
      },
      async (payload) => {
        const updatedUser = payload.new as { id?: string; ativo?: boolean }
        if (updatedUser && updatedUser.ativo === false) {
          await terminateSessionDisabled()
        } else {
          await reevaluateCoreAccess()
        }
      },
    )

    // 2. Monitorar vínculo em core_usuario_sistemas (se o ID de core_usuarios estiver disponível)
    if (coreUserId) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'core_usuario_sistemas',
          filter: `usuario_id=eq.${coreUserId}`,
        },
        async () => {
          await reevaluateCoreAccess()
        },
      )
    }

    // 3. Monitorar alteração de status do sistema Conectaí
    channel = channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'core_sistemas',
        filter: `codigo=eq.CONECTAI`,
      },
      async () => {
        await reevaluateCoreAccess()
      },
    )

    // 4. Monitorar alteração de perfis do Conectaí
    channel = channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'core_perfis',
      },
      async () => {
        await reevaluateCoreAccess()
      },
    )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, profile?.ativo, coreAccess?.id])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error }
    }

    if (data.user) {
      // Validar acesso considerando o Gestor de Acessos Ricci (core_usuarios.ativo)
      const coreResult = await fetchCoreAccessResult(data.user.id)

      // Se usuário estiver desativado no Gestor de Acessos Ricci:
      if (coreResult.status === 'user_inactive' || coreResult.data?.ativo === false) {
        currentAuthUserIdRef.current = null
        coreAccessRequestIdRef.current += 1
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setManagedUserIds([])
        setManagedCoreUserIds([])
        setManagedTeamSource(undefined)
        setManagedCoreSubordinates([])
        setCoreAccess(coreResult.data)
        setIdentity(null)
        setProfile({
          perfil: '',
          ativo: false,
          gestor_id: coreResult.data?.gestorId ?? null,
          legaldesk_usuario_id: null,
          managed_user_ids: [],
          managed_core_user_ids: [],
          coreStatus: 'user_inactive',
          hasSystemAccess: false,
        })
        return { error: null, disabled: true }
      }

      // Se usuário for negado no core por ausência de vínculo / perfil inativo / sistema inativo:
      if (
        coreResult.status === 'no_core_user' ||
        coreResult.status === 'no_system_link' ||
        coreResult.status === 'link_inactive' ||
        coreResult.status === 'profile_inactive_or_invalid' ||
        coreResult.status === 'system_inactive'
      ) {
        return { error: null, disabled: false, noAccess: true }
      }
    }

    return { error: null, disabled: false }
  }

  const signOut = async () => {
    currentAuthUserIdRef.current = null
    coreAccessRequestIdRef.current += 1
    setManagedUserIds([])
    setManagedCoreUserIds([])
    setManagedTeamSource(undefined)
    setManagedCoreSubordinates([])
    setCoreAccess(null)
    setIdentity(null)
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL || window.location.origin}/resetar-senha`,
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  const hasSystemAccess = Boolean(
    user && profile && profile.coreStatus !== 'user_inactive' && profile.hasSystemAccess === true,
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        managedUserIds,
        managedCoreUserIds,
        managedTeamSource,
        managedCoreSubordinates,
        coreAccess,
        identity,
        hasSystemAccess,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
