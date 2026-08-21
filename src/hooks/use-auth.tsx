import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export interface UserProfile {
  perfil: string
  ativo: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
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
  const [loading, setLoading] = useState(true)

  const handleSessionChange = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setSession(null)
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('perfil, ativo')
        .eq('id', currentSession.user.id)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error)
      }

      if (!profileData) {
        setProfile(null)
        setSession(currentSession)
        setUser(currentSession.user)
      } else if (profileData.ativo === false) {
        // Usuário inativo: destruir sessão Supabase e manter user null
        setProfile({
          perfil: profileData.perfil ?? '',
          ativo: false,
        })
        setUser(null)
        setSession(null)
        await supabase.auth.signOut()
      } else {
        setProfile({
          perfil: profileData.perfil ?? '',
          ativo: Boolean(profileData.ativo),
        })
        setSession(currentSession)
        setUser(currentSession.user)
      }
    } catch (err) {
      console.error('Exceção ao carregar perfil:', err)
      setSession(currentSession)
      setUser(currentSession.user)
      setProfile(null)
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

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error }
    }

    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('perfil, ativo')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileData && profileData.ativo === false) {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setProfile({
          perfil: profileData.perfil ?? '',
          ativo: false,
        })
        return { error: null, disabled: true }
      }
    }

    return { error: null, disabled: false }
  }

  const signOut = async () => {
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
