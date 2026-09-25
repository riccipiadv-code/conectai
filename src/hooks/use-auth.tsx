import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import {
  CoreAccessData,
  AggregatedUserIdentity,
  fetchCoreAccess,
  auditCoreEquivalence,
} from '@/services/core-access'

export interface UserProfile {
  perfil: string
  ativo: boolean
  gestor_id?: string | null
  legaldesk_usuario_id?: string | null
  managed_user_ids?: string[]
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

  const loadCoreAccessAsync = (
    authUserId: string,
    legacyProfile: {
      perfil: string
      ativo: boolean
      legaldeskUsuarioId: string | null
      gestorId: string | null
      managedUserIds: string[]
    },
    requestId: number,
  ) => {
    // Leitura preparatória assíncrona — NUNCA bloqueia loading de autenticação nem trava a interface
    fetchCoreAccess(authUserId)
      .then((coreData) => {
        // Validação estrita de sessão: garantir que o usuário ainda é o mesmo e nenhuma requisição mais recente foi disparada
        if (
          currentAuthUserIdRef.current !== authUserId ||
          coreAccessRequestIdRef.current !== requestId
        ) {
          // Sessão trocada, encerrada ou sobrescrita enquanto a consulta estava em andamento.
          // Descartar silenciosamente sem aplicar estado nem emitir alertas ao usuário.
          return
        }

        setCoreAccess(coreData)
        auditCoreEquivalence(legacyProfile, coreData)
        setIdentity({
          authUserId,
          legacy: legacyProfile,
          core: coreData,
          effective: {
            source: 'legacy',
            perfil: legacyProfile.perfil,
            ativo: legacyProfile.ativo,
            gestorId: legacyProfile.gestorId,
            legaldeskUsuarioId: legacyProfile.legaldeskUsuarioId,
            managedUserIds: legacyProfile.managedUserIds,
          },
        })
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[use-auth] Falha não impeditiva ao ler core access:', err)
        }
      })
  }

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

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('perfil, ativo, legaldesk_usuario_id, gestor_id')
        .eq('id', currentSession.user.id)
        .maybeSingle()

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
      } else if (profileData.ativo === false) {
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
      } else {
        let teamUserIds: string[] = []
        if (profileData.perfil === 'gestor') {
          // Carregar a equipe do gestor: profiles vinculados via gestor_id = auth.uid()
          const { data: teamProfiles, error: teamError } = await supabase
            .from('profiles')
            .select('legaldesk_usuario_id')
            .eq('gestor_id', currentSession.user.id)

          if (teamError) {
            console.error('Erro ao buscar equipe do gestor:', teamError)
          } else if (teamProfiles) {
            teamUserIds = teamProfiles
              .map((p) => p.legaldesk_usuario_id)
              .filter((id): id is string => Boolean(id))
          }
        }

        const legacyProfileInfo = {
          perfil: profileData.perfil ?? '',
          ativo: Boolean(profileData.ativo),
          legaldeskUsuarioId: profileData.legaldesk_usuario_id ?? null,
          gestorId: profileData.gestor_id ?? null,
          managedUserIds: teamUserIds,
        }

        setManagedUserIds(teamUserIds)
        setProfile({
          perfil: legacyProfileInfo.perfil,
          ativo: legacyProfileInfo.ativo,
          gestor_id: legacyProfileInfo.gestorId,
          legaldesk_usuario_id: legacyProfileInfo.legaldeskUsuarioId,
          managed_user_ids: teamUserIds,
        })
        setSession(currentSession)
        setUser(currentSession.user)

        // Inicializar estrutura agregada provisória enquanto core_* é consultado em background
        setIdentity({
          authUserId: currentSession.user.id,
          legacy: legacyProfileInfo,
          core: null,
          effective: {
            source: 'legacy',
            ...legacyProfileInfo,
          },
        })

        // Disparar leitura preparatória única do core_* sem bloquear o fluxo
        currentAuthUserIdRef.current = currentSession.user.id
        const requestId = ++coreAccessRequestIdRef.current
        loadCoreAccessAsync(currentSession.user.id, legacyProfileInfo, requestId)
      }
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
      setLoading(false)
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        managedUserIds,
        coreAccess,
        identity,
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
