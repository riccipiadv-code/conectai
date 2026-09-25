import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: ReactNode
}

/**
 * AuthGuard:
 * Garante que apenas usuários autenticados e com cadastro ativo acessem rotas internas.
 * Enquanto a autenticação ou o perfil estiverem sendo validados, renderiza uma tela de loading
 * limpa, impedindo categoricamente qualquer flash de conteúdo protegido.
 * Se o usuário for inativo ou não autenticado, redireciona para /login sem renderizar a rota.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, profile, loading, hasSystemAccess } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Usuário inativo no Gestor de Acessos Ricci (core_usuarios.ativo = false): redirecionar com aviso de desativação
  if (profile && (profile.ativo === false || profile.coreStatus === 'user_inactive')) {
    return <Navigate to="/login?reason=disabled" replace />
  }

  // Usuário não autenticado
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Bloqueio do Conectaí quando não possuir acesso permitido ao sistema
  // (hasSystemAccess central false: vínculo inativo, sistema inativo, perfil inativo, core_denied, etc).
  // NÃO destrói a sessão Supabase (pode ter acesso a outros sistemas Ricci com a mesma identidade).
  if (!hasSystemAccess) {
    return <Navigate to="/login?reason=no_access" replace />
  }

  return <>{children}</>
}

interface AdminGuardProps {
  children: ReactNode
}

/**
 * AdminGuard:
 * Garante que somente usuários com perfil 'administrador' ativo consigam acessar rotas restritas
 * (Dashboard, Gestão de Usuários, Logs, Configurações de E-mail).
 * Se o usuário for gestor, operacional ou outro perfil não-admin, redireciona imediatamente para '/'
 * antes de qualquer componente filho ser montado ou dados administrativos serem carregados.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { user, profile, loading, hasSystemAccess } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (profile && (profile.ativo === false || profile.coreStatus === 'user_inactive')) {
    return <Navigate to="/login?reason=disabled" replace />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!hasSystemAccess) {
    return <Navigate to="/login?reason=no_access" replace />
  }

  // Apenas 'administrador' com perfil ativo pode prosseguir
  if (profile?.perfil !== 'administrador') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
