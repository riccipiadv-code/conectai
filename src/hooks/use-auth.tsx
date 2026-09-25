import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import {
  CoreAccessData,
  CoreAccessStatus,
  EffectiveProfileSource,
  AggregatedUserIdentity,
  fetchCoreAccessResult,
  resolveEffectiveProfile,
  auditCoreEquivalence,
} from '@/services/core-access'

export interface UserProfile {
  /**
   * Perfil efetivo do usuário no Conectaí.
   * Na Etapa 4: resolvido via core-first com fallback legado e menor privilégio.
   */
  perfil: string
  ativo: boolean
  gestor_id?: string | null
  legaldesk_usuario_id?: string | null
  managed_user_ids?: string[]
  /**
   * Fonte efetiva de onde o perfil foi resolvido.
   * 'core' | 'legacy_fallback' | 'core_denied'
   */
  perfilSource?: EffectiveProfileSource
  /**
   * Status detalhado da leitura no Gestor de Acessos Ricci (`core_*`).
   */
  coreStatus?: CoreAccessStatus
  /**
   * Indica se o usuário possui acesso permitido ao sistema Conectaí.
   * Falso quando core_denied ('no_core_user', 'no_system_link', 'link_inactive', 'profile_inactive_or_invalid')
   * ou quando o cadastro legado estiver inativo (ativo = false).
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

  // Cadastro desativado em profiles.ativo: bloqueado e com logout/sessão encerrada
  if (profile && profile.ativo === false) {
    return {
      allowed: false,
      redirectReason: 'disabled',
      shouldSignOut: true,
    }
  }

  // Se profile possui hasSystemAccess explicitamente falso ou perfilSource === 'core_denied'
  // Bloqueado no Conectaí, MAS NÃO deve encerrar a sessão Supabase Auth
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
   * Dados corporativos centrais lidos de `core_*` (camada preparatória).
   * Opcional / aditivo para não quebrar consumidores existentes.
   */
  coreAccess?: CoreAccessData | null
  /**
   * Estrutura agregada consolidando identidade legada, central e resolução efetiva.
   * Opcional / aditivo.
   */
  identity?: AggregatedUserIdentity | null
  /**
   * Flag central indicando se o usuário autenticado tem acesso permitido ao Conectaí.
   * Verdadeiro apenas se autenticado, profiles.ativo === true e profile.hasSystemAccess === true
   * (respeitando a decisão única já produzida por resolveEffectiveProfile).
   */
  hasSystemAccess: boolean
  signIn: (email: string, password: string) => Promise<{ error: any; disabled?: boolean }>
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
      setCoreAccess(null)
      setIdentity(null)
      setLoading(false)
      return
    }

    const authUserId = currentSession.user.id
    currentAuthUserIdRef.current = authUserId
    const requestId = ++coreAccessRequestIdRef.current

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('perfil, ativo, legaldesk_usuario_id, gestor_id')
        .eq('id', authUserId)
        .maybeSingle()

      // Verificar se a sessão ainda é a mesma antes de prosseguir
      if (
        currentAuthUserIdRef.current !== authUserId ||
        coreAccessRequestIdRef.current !== requestId
      ) {
        return
      }

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error)
      }

      // Se usuário não tiver perfil ou estiver inativo: não conceder acesso
      if (!profileData) {
        // Perfil inexistente no sistema: encerrar sessão
        currentAuthUserIdRef.current = null
        coreAccessRequestIdRef.current += 1
        setProfile(null)
        setUser(null)
        setSession(null)
        setManagedUserIds([])
        setCoreAccess(null)
        setIdentity(null)
        await supabase.auth.signOut()
        return
      }

      if (profileData.ativo === false) {
        // Usuário inativo: destruir sessão Supabase e manter user e session null
        currentAuthUserIdRef.current = null
        coreAccessRequestIdRef.current += 1
        setProfile({
          perfil: profileData.perfil ?? '',
          ativo: false,
          gestor_id: profileData.gestor_id ?? null,
          legaldesk_usuario_id: profileData.legaldesk_usuario_id ?? null,
          managed_user_ids: [],
        })
        setUser(null)
        setSession(null)
        setManagedUserIds([])
        setCoreAccess(null)
        setIdentity(null)
        await supabase.auth.signOut()
        return
      }

      // Carregar dados legados necessários (equipe do gestor se perfil for gestor)
      let teamUserIds: string[] = []
      if (profileData.perfil === 'gestor') {
        const { data: teamProfiles, error: teamError } = await supabase
          .from('profiles')
          .select('legaldesk_usuario_id')
          .eq('gestor_id', authUserId)

        if (teamError) {
          console.error('Erro ao buscar equipe do gestor:', teamError)
        } else if (teamProfiles) {
          teamUserIds = teamProfiles
            .map((p) => p.legaldesk_usuario_id)
            .filter((id): id is string => Boolean(id))
        }
      }

      // Verificar novamente sessão antes de consultar core
      if (
        currentAuthUserIdRef.current !== authUserId ||
        coreAccessRequestIdRef.current !== requestId
      ) {
        return
      }

      const legacyProfileInfo = {
        perfil: profileData.perfil ?? '',
        ativo: Boolean(profileData.ativo),
        legaldeskUsuarioId: profileData.legaldesk_usuario_id ?? null,
        gestorId: profileData.gestor_id ?? null,
        managedUserIds: teamUserIds,
      }

      // Consultar Gestor de Acessos Ricci (core_*) ANTES de liberar o perfil efetivo e o loading.
      // Timeout seguro de 10s para evitar qualquer chance de loading infinito em caso de rede travada.
      let coreResult: Awaited<ReturnType<typeof fetchCoreAccessResult>>
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('core_timeout')), 10000),
        )
        coreResult = await Promise.race([fetchCoreAccessResult(authUserId), timeoutPromise])
      } catch (coreErr: any) {
        if (import.meta.env.DEV) {
          console.warn('[use-auth] Falha técnica ou timeout ao consultar core access:', coreErr)
        }
        coreResult = {
          status: 'technical_error',
          data: null,
          resolvedPerfil: null,
          detail: coreErr?.message || 'Erro inesperado ou timeout ao consultar core',
        }
      }

      // Verificar se a sessão não mudou enquanto a consulta ao core estava em andamento
      if (
        currentAuthUserIdRef.current !== authUserId ||
        coreAccessRequestIdRef.current !== requestId
      ) {
        return
      }

      // Resolver perfil efetivo:
      // - ok -> perfil do core
      // - technical_error -> fallback para profiles.perfil (legacy_fallback)
      // - no_core_user, no_system_link, link_inactive, profile_inactive_or_invalid -> perfil vazio (core_denied)
      const resolution = resolveEffectiveProfile(coreResult, legacyProfileInfo.perfil)
      const coreData = coreResult.data

      auditCoreEquivalence(legacyProfileInfo, coreData, resolution.perfil, resolution.source)

      // Determinar se tem acesso ao sistema Conectaí:
      // Acesso negado se o core explicitamente negar o vínculo/perfil do Conectaí ou cadastro inativo
      const hasAccess = legacyProfileInfo.ativo && resolution.hasSystemAccess

      // Somente agora, com a resolução final do perfil concluída, publicar dados de autenticação e perfil
      setManagedUserIds(teamUserIds)
      setCoreAccess(coreData)
      setProfile({
        perfil: resolution.perfil,
        ativo: legacyProfileInfo.ativo,
        gestor_id: legacyProfileInfo.gestorId,
        legaldesk_usuario_id: legacyProfileInfo.legaldeskUsuarioId,
        managed_user_ids: teamUserIds,
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
          managedUserIds: legacyProfileInfo.managedUserIds,
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

    const channel = supabase
      .channel(`profile-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          const updatedProfile = payload.new as { perfil?: string; ativo?: boolean }
          if (updatedProfile && updatedProfile.ativo === false) {
            currentAuthUserIdRef.current = null
            coreAccessRequestIdRef.current += 1
            await supabase.auth.signOut()
            setUser(null)
            setSession(null)
            setManagedUserIds([])
            setCoreAccess(null)
            setIdentity(null)
            setProfile({
              perfil: updatedProfile.perfil ?? '',
              ativo: false,
            })
            window.location.href = '/login?reason=disabled'
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, profile?.ativo])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error }
    }

    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('perfil, ativo, legaldesk_usuario_id, gestor_id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileData && profileData.ativo === false) {
        currentAuthUserIdRef.current = null
        coreAccessRequestIdRef.current += 1
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setManagedUserIds([])
        setCoreAccess(null)
        setIdentity(null)
        setProfile({
          perfil: profileData.perfil ?? '',
          ativo: false,
          gestor_id: profileData.gestor_id ?? null,
          legaldesk_usuario_id: profileData.legaldesk_usuario_id ?? null,
          managed_user_ids: [],
        })
        return { error: null, disabled: true }
      }
    }

    return { error: null, disabled: false }
  }

  const signOut = async () => {
    currentAuthUserIdRef.current = null
    coreAccessRequestIdRef.current += 1
    setManagedUserIds([])
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
    user && profile && profile.ativo === true && profile.hasSystemAccess === true,
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        managedUserIds,
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
