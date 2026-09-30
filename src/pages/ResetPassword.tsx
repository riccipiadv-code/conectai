import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  useEffect(() => {
    // Encerrar qualquer sessão temporária decorrente de recovery e redirecionar para o login
    // com a mensagem de orientação para solicitar um novo link
    const terminate = async () => {
      // Limpar tokens na URL caso existam
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      try {
        await signOut()
      } catch {
        // silencioso
      }
      navigate('/login?reason=recovery_blocked', { replace: true })
    }
    terminate()
  }, [signOut, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Redirecionando...</CardTitle>
          <CardDescription>
            A redefinição de senha foi centralizada no Gestor de Acessos Ricci.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Encerrando sessão temporária e redirecionando para a tela de login...
        </CardContent>
      </Card>
    </div>
  )
}
