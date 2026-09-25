import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { getSafeErrorMessage } from '@/lib/safe-error'
import { Lock, Mail, AlertTriangle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const { user, profile, loading, signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const reason = searchParams.get('reason')
  const isDisabledParam = reason === 'disabled'
  const isNoAccessParam = reason === 'no_access'

  useEffect(() => {
    if (isDisabledParam) {
      toast({
        title: 'Acesso desativado',
        description: 'Seu acesso foi desativado. Entre em contato com o administrador.',
        variant: 'destructive',
      })
    } else if (isNoAccessParam) {
      toast({
        title: 'Acesso não permitido',
        description:
          'Seu usuário não possui acesso ao Conectaí. Procure o administrador do Gestor de Acessos Ricci.',
        variant: 'destructive',
      })
    }
  }, [isDisabledParam, isNoAccessParam, toast])

  useEffect(() => {
    // Redireciona para home apenas se autenticado, ativo no core (coreStatus !== 'user_inactive') e com acesso liberado ao sistema Conectaí
    if (
      !loading &&
      user &&
      profile &&
      profile.coreStatus !== 'user_inactive' &&
      profile.hasSystemAccess === true &&
      profile.perfilSource !== 'core_denied'
    ) {
      navigate('/')
    }
  }, [user, profile, loading, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error, disabled, noAccess } = await signIn(email, password)

    if (error) {
      console.error('[Login] Erro:', error)
      toast({
        title: 'Erro ao entrar',
        description: getSafeErrorMessage(error, 'Verifique suas credenciais e tente novamente.'),
        variant: 'destructive',
      })
    } else if (disabled) {
      toast({
        title: 'Acesso Negado',
        description: 'Seu acesso foi desativado. Entre em contato com o administrador.',
        variant: 'destructive',
      })
      navigate('/login?reason=disabled')
    } else if (noAccess) {
      toast({
        title: 'Acesso Não Permitido',
        description:
          'Seu usuário não possui acesso ao Conectaí. Procure o administrador do Gestor de Acessos Ricci.',
        variant: 'destructive',
      })
      navigate('/login?reason=no_access')
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      })
      navigate('/')
    }

    setIsLoading(false)
  }

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await resetPassword(email)

    if (error) {
      console.error('[Login] Erro na recuperação:', error)
      toast({
        title: 'Erro na recuperação',
        description: getSafeErrorMessage(error, 'Ocorreu um erro ao enviar o link.'),
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'E-mail enviado',
        description:
          'Se o e-mail existir em nossa base, você receberá um link para redefinir a senha.',
      })
      setIsRecoveryMode(false)
    }

    setIsLoading(false)
  }

  if (isRecoveryMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md animate-fade-in-up">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Recuperar Senha</CardTitle>
            <CardDescription>
              Informe seu e-mail para receber um link de recuperação
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRecovery}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="recovery-email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsRecoveryMode(false)}
                disabled={isLoading}
              >
                Voltar ao login
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Conectaí</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>
        {isDisabledParam && (
          <div className="px-6 pb-2">
            <Alert
              variant="destructive"
              className="border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40"
            >
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <AlertTitle className="text-rose-900 dark:text-rose-200 font-semibold text-sm">
                Acesso Desativado
              </AlertTitle>
              <AlertDescription className="text-rose-800 dark:text-rose-300 text-xs">
                Seu acesso foi desativado. Entre em contato com o administrador.
              </AlertDescription>
            </Alert>
          </div>
        )}
        {isNoAccessParam && (
          <div className="px-6 pb-2">
            <Alert
              variant="destructive"
              className="border-amber-300 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/40"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-900 dark:text-amber-200 font-semibold text-sm">
                Acesso Não Permitido
              </AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-300 text-xs">
                Seu usuário não possui acesso ao Conectaí. Procure o administrador do Gestor de
                Acessos Ricci.
              </AlertDescription>
            </Alert>
          </div>
        )}
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@riccipi.com.br"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={() => setIsRecoveryMode(true)}
                  className="text-sm font-medium text-primary hover:underline"
                  tabIndex={-1}
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
