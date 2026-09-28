import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getSafeErrorMessage } from '@/lib/safe-error'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Loader2,
  UserX,
  UserCog,
  ShieldCheck,
  AlertTriangle,
  Plus,
  UserPlus,
} from 'lucide-react'

export type UserRow = {
  id: string
  core_usuario_id?: string
  auth_user_id?: string | null
  legaldesk_id?: string | null
  nome: string
  sigla: string
  email: string
  profile_id?: string | null
  perfil: string | null
  perfil_codigo?: string | null
  perfil_nome?: string | null
  ativo_sys: boolean
  ativo?: boolean
  gestor_id?: string | null
  gestor_nome?: string | null
  auth_user_exists?: boolean
  status: 'sem_acesso' | 'ativo' | 'bloqueado' | 'inconsistente'
  tem_acesso?: boolean
}

type PerfilOption = {
  id: string
  codigo: string
  nome: string
}

type GestorOption = {
  id: string
  name: string
  nome?: string
  email: string
}

async function extractErrorMessage(
  error: any,
  data?: any,
  fallback = 'Falha na comunicação com o servidor.',
): Promise<string> {
  let extractedMessage: string | null = null

  if (error) {
    const errAny = error as any
    if (errAny.context && typeof errAny.context.json === 'function') {
      try {
        const bodyJson = await errAny.context.json()
        extractedMessage = bodyJson?.error || bodyJson?.message
      } catch {
        // Ignore parse error
      }
    } else if (errAny.context?.error) {
      extractedMessage = errAny.context.error
    } else if (typeof errAny.context === 'string') {
      try {
        const parsed = JSON.parse(errAny.context)
        extractedMessage = parsed?.error || parsed?.message
      } catch {
        extractedMessage = errAny.context
      }
    }
  }

  return extractedMessage || data?.error || error?.message || fallback
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const { toast } = useToast()
  const [perfisOptions, setPerfisOptions] = useState<PerfilOption[]>([])
  const [gestoresOptions, setGestoresOptions] = useState<GestorOption[]>([])

  const getPerfilLabel = (codigoOrId: string | null): string => {
    if (!codigoOrId) return ''
    const match = perfisOptions.find(
      (p) => p.codigo.toLowerCase() === codigoOrId.toLowerCase() || p.id === codigoOrId,
    )
    return match ? match.nome : codigoOrId
  }

  // Modal Criar Novo Usuário
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createSigla, setCreateSigla] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPerfil, setCreatePerfil] = useState('')
  const [createGestorId, setCreateGestorId] = useState<string>('none')
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [creatingUser, setCreatingUser] = useState(false)

  // Diálogos modais de linha
  const [grantAccessModalUser, setGrantAccessModalUser] = useState<UserRow | null>(null)
  const [grantAccessPerfil, setGrantAccessPerfil] = useState<string>('')
  const [grantAccessGestorId, setGrantAccessGestorId] = useState<string>('none')
  const [grantingAccess, setGrantingAccess] = useState(false)

  const [activateModalUser, setActivateModalUser] = useState<UserRow | null>(null)

  const [revokeModalUser, setRevokeModalUser] = useState<UserRow | null>(null)

  const [editModalUser, setEditModalUser] = useState<UserRow | null>(null)
  const [editPerfil, setEditPerfil] = useState<string>('ADMINISTRADOR')
  const [editEmail, setEditEmail] = useState<string>('')
  const [editGestorId, setEditGestorId] = useState<string>('none')
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [editingUser, setEditingUser] = useState(false)

  const [deleteModalUser, setDeleteModalUser] = useState<UserRow | null>(null)

  const loadPerfis = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-core-user', {
        body: { action: 'list_perfis' },
      })

      if (error || data?.error) {
        const finalErrorMessage = await extractErrorMessage(
          error,
          data,
          'Falha ao carregar perfis de acesso.',
        )
        throw new Error(finalErrorMessage)
      }

      setPerfisOptions(data?.perfis || [])
    } catch (err: any) {
      setPerfisOptions([])
      console.error(err)
      toast({
        title: 'Erro ao carregar perfis',
        description: getSafeErrorMessage(err, 'Falha ao carregar perfis de acesso.'),
        variant: 'destructive',
      })
    }
  }

  const loadGestores = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-core-user', {
        body: { action: 'list_gestores' },
      })

      if (error || data?.error) {
        const finalErrorMessage = await extractErrorMessage(
          error,
          data,
          'Falha ao carregar lista de gestores.',
        )
        throw new Error(finalErrorMessage)
      }

      setGestoresOptions(data?.gestores || [])
    } catch (err: any) {
      setGestoresOptions([])
      console.error(err)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('manage-core-user', {
        body: { action: 'list_users' },
      })

      if (error || data?.error) {
        const finalErrorMessage = await extractErrorMessage(
          error,
          data,
          'Falha na comunicação com o servidor.',
        )
        throw new Error(finalErrorMessage)
      }

      if (data?.users) {
        setUsers(data.users)
      }
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao carregar usuários',
        description: getSafeErrorMessage(err, 'Falha na comunicação com o servidor.'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPerfis()
    loadGestores()
    loadData()
  }, [])

  // 1. Modal "Criar Novo Usuário"
  const handleOpenCreateModal = () => {
    setCreateName('')
    setCreateSigla('')
    setCreateEmail('')
    setCreatePerfil('')
    setCreateGestorId('none')
    setCreateErrors({})
    loadGestores()
    setCreateModalOpen(true)
  }

  const handleCreateUser = async () => {
    const errors: Record<string, string> = {}

    if (!createName.trim()) {
      errors.name = 'Nome é obrigatório.'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!createEmail.trim()) {
      errors.email = 'E-mail é obrigatório.'
    } else if (!emailRegex.test(createEmail.trim())) {
      errors.email = 'Formato de e-mail inválido.'
    }

    if (!createPerfil) {
      errors.perfil = 'Selecione um perfil de acesso.'
    }

    setCreateErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setCreatingUser(true)
    try {
      const { data, error } = await supabase.functions.invoke('manage-core-user', {
        body: {
          action: 'create_user',
          nome: createName.trim(),
          sigla: createSigla.trim().toUpperCase() || undefined,
          email: createEmail.trim().toLowerCase(),
          perfil: createPerfil,
          gestor_id: createGestorId !== 'none' ? createGestorId : null,
          ativo: true,
        },
      })

      if (error || data?.error) {
        const finalErrorMessage = await extractErrorMessage(error, data, 'Falha ao criar usuário.')
        throw new Error(finalErrorMessage)
      }

      toast({
        title: 'Usuário criado!',
        description: 'Usuário criado com sucesso no Gestor de Acessos.',
      })
      setCreateModalOpen(false)
      await Promise.all([loadData(), loadGestores()])
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao criar usuário',
        description: getSafeErrorMessage(err, 'Falha ao criar usuário.'),
        variant: 'destructive',
      })
    } finally {
      setCreatingUser(false)
    }
  }

  // 2. Modal Conceder Acesso (para colaboradores com tem_acesso === false)
  const handleOpenGrantAccessModal = (user: UserRow) => {
    setGrantAccessModalUser(user)
    setGrantAccessPerfil('')
    setGrantAccessGestorId(user.gestor_id || 'none')
    loadGestores()
  }

  const handleConfirmGrantAccess = async () => {
    if (!grantAccessModalUser) return
    if (!grantAccessPerfil) {
      toast({
        title: 'Perfil obrigatório',
        description: 'Selecione um perfil de acesso.',
        variant: 'destructive',
      })
      return
    }
    const user = grantAccessModalUser
    setGrantingAccess(true)
    setActionLoadingId(user.id)
    try {
      const { data, error } = await supabase.functions.invoke('manage-core-user', {
        body: {
          action: 'grant_access',
          usuario_id: user.id,
          perfil: grantAccessPerfil,
          gestor_id: grantAccessGestorId !== 'none' ? grantAccessGestorId : null,
        },
      })

      if (error || data?.error) {
        const finalErrorMessage = await extractErrorMessage(
          error,
          data,
          'Falha ao conceder acesso.',
        )
        throw new Error(finalErrorMessage)
      }

      toast({
        title: 'Acesso concedido!',
        description: `Acesso concedido com sucesso para ${user.nome} com perfil "${getPerfilLabel(grantAccessPerfil) || grantAccessPerfil}".`,
      })
      setGrantAccessModalUser(null)
      await Promise.all([loadData(), loadGestores()])
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao conceder acesso',
        description: getSafeErrorMessage(err, 'Falha ao conceder acesso.'),
        variant: 'destructive',
      })
    } finally {
      setGrantingAccess(false)
      setActionLoadingId(null)
    }
  }

  // 3. Reativar Acesso Bloqueado (usuário com vínculo inativado)
  const handleOpenActivateModal = (user: UserRow) => {
    if (!user.tem_acesso) {
      handleOpenGrantAccessModal(user)
      return
    }
    setActivateModalUser(user)
  }

  const handleConfirmActivateBlocked = async () => {
    if (!activateModalUser) return
    const user = activateModalUser
    setActionLoadingId(user.id)
    try {
      const perfilToGrant = user.perfil_codigo || user.perfil || 'OPERACIONAL'
      const { data, error } = await supabase.functions.invoke('manage-core-user', {
        body: {
          action: 'grant_access',
          usuario_id: user.id,
          perfil: perfilToGrant,
          gestor_id: user.gestor_id || null,
        },
      })

      if (error || data?.error) {
        const finalErrorMessage = await extractErrorMessage(
          error,
          data,
          'Falha ao reativar acesso.',
        )
        throw new Error(finalErrorMessage)
      }

      toast({
        title: 'Acesso reativado',
        description: `O acesso de ${user.nome} foi reativado com sucesso.`,
      })
      setActivateModalUser(null)
      await Promise.all([loadData(), loadGestores()])
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Falha ao reativar acesso',
        description: getSafeErrorMessage(err, 'Falha ao reativar acesso.'),
        variant: 'destructive',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // 4. Desativar Acesso (revoke_access)
  const handleOpenRevokeModal = (user: UserRow) => {
    setRevokeModalUser(user)
  }

  const handleConfirmRevoke = async () => {
    if (!revokeModalUser) return
    const user = revokeModalUser
    setActionLoadingId(user.id)
    try {
      const { data, error } = await supabase.functions.invoke('manage-core-user', {
        body: {
          action: 'revoke_access',
          usuario_id: user.id,
        },
      })

      if (error || data?.error) {
        const finalErrorMessage = await extractErrorMessage(error, data, 'Erro ao revogar acesso.')
        throw new Error(finalErrorMessage)
      }

      toast({
        title: 'Acesso desativado',
        description: `O acesso de ${user.nome} ao Conectaí foi bloqueado.`,
      })
      setRevokeModalUser(null)
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Falha ao desativar acesso',
        description: getSafeErrorMessage(err, 'Falha ao desativar acesso.'),
        variant: 'destructive',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // 5. Editar Acesso (change_perfil)
  const handleOpenEditModal = (user: UserRow) => {
    setEditModalUser(user)
    const initialPerfil = (user.perfil_codigo || user.perfil || 'ADMINISTRADOR').toUpperCase()
    setEditPerfil(initialPerfil)
    setEditEmail(user.email || '')
    setEditGestorId(user.gestor_id || 'none')
    setEditErrors({})
    loadGestores()
  }

  const handleConfirmEdit = async () => {
    if (!editModalUser) return

    const errors: Record<string, string> = {}
    const trimmedEmail = editEmail.trim().toLowerCase()

    if (!trimmedEmail) {
      errors.email = 'E-mail é obrigatório.'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Formato de e-mail inválido.'
      }
    }

    if (!editPerfil) {
      errors.perfil = 'Selecione um perfil de acesso.'
    }

    setEditErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    const user = editModalUser
    setEditingUser(true)
    setActionLoadingId(user.id)
    try {
      const { data, error } = await supabase.functions.invoke('manage-core-user', {
        body: {
          action: 'change_perfil',
          usuario_id: user.id,
          email: trimmedEmail,
          perfil: editPerfil,
          gestor_id: editGestorId !== 'none' ? editGestorId : null,
        },
      })

      if (error || data?.error) {
        const finalErrorMessage = await extractErrorMessage(
          error,
          data,
          'Falha ao atualizar dados do usuário.',
        )
        throw new Error(finalErrorMessage)
      }

      toast({
        title: 'Usuário atualizado com sucesso!',
        description: `Os dados de ${user.nome} foram salvos com sucesso.`,
      })
      setEditModalUser(null)
      await Promise.all([loadData(), loadGestores()])
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Falha ao atualizar usuário',
        description: getSafeErrorMessage(err, 'Falha ao atualizar usuário.'),
        variant: 'destructive',
      })
    } finally {
      setEditingUser(false)
      setActionLoadingId(null)
    }
  }

  // 6. Remover Usuário da Gestão (hide_from_management)
  const handleOpenInactivateModal = (user: UserRow) => {
    setDeleteModalUser(user)
  }

  const handleConfirmInactivate = async () => {
    if (!deleteModalUser) return
    const user = deleteModalUser
    setActionLoadingId(user.id)
    try {
      const { data, error } = await supabase.functions.invoke('manage-core-user', {
        body: {
          action: 'hide_from_management',
          usuario_id: user.id,
          legaldesk_id: user.legaldesk_id || undefined,
        },
      })

      if (error || data?.error) {
        const finalErrorMessage = await extractErrorMessage(error, data, 'Erro ao remover usuário.')
        throw new Error(finalErrorMessage)
      }

      toast({
        title: 'Usuário removido',
        description: `O usuário ${user.nome} foi removido da Gestão de Usuários com sucesso.`,
      })

      setDeleteModalUser(null)
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Falha ao remover usuário',
        description: getSafeErrorMessage(err, 'Falha ao remover usuário.'),
        variant: 'destructive',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        (u.nome || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.sigla || '').toLowerCase().includes(search.toLowerCase())
      if (!matchesSearch) return false

      if (filter === 'with_access') return u.tem_acesso === true
      if (filter === 'without_access') return u.tem_acesso === false
      return true
    })
  }, [users, search, filter])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Botão Criar Novo no topo, acima da busca */}
      <div className="flex justify-start">
        <Button onClick={handleOpenCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Novo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou sigla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="all">Todos ({users.length})</TabsTrigger>
            <TabsTrigger value="with_access">
              Com Acesso ({users.filter((u) => u.tem_acesso === true).length})
            </TabsTrigger>
            <TabsTrigger value="without_access">
              Sem Acesso ({users.filter((u) => u.tem_acesso === false).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="border border-slate-200/60 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Sigla / E-mail</TableHead>
                <TableHead className="text-center">Acesso</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead>Gestor</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nenhum colaborador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => {
                  const isOperating = actionLoadingId === u.id

                  return (
                    <TableRow key={u.id}>
                      {/* 1. Nome */}
                      <TableCell className="font-medium">{u.nome}</TableCell>

                      {/* 2. Sigla / E-mail */}
                      <TableCell>
                        <div className="flex flex-col">
                          {u.sigla && (
                            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                              {u.sigla}
                            </span>
                          )}
                          <span className="text-[13px] text-muted-foreground truncate max-w-[220px]">
                            {u.email || 'Sem e-mail'}
                          </span>
                        </div>
                      </TableCell>

                      {/* 3. Indicador de Acesso Conectaí */}
                      <TableCell className="text-center">
                        <Badge
                          variant={u.tem_acesso ? 'default' : 'secondary'}
                          className={
                            u.tem_acesso
                              ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/15 border-blue-200 dark:border-blue-900/50'
                              : 'text-muted-foreground hover:bg-secondary'
                          }
                        >
                          {u.tem_acesso ? 'Com acesso' : 'Sem acesso'}
                        </Badge>
                      </TableCell>

                      {/* 4. Ativo (Botão Toggle) */}
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (u.status === 'ativo') {
                              handleOpenRevokeModal(u)
                            } else {
                              handleOpenActivateModal(u)
                            }
                          }}
                          className="inline-flex focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full"
                        >
                          <Badge
                            variant={u.status === 'ativo' ? 'default' : 'secondary'}
                            className={`cursor-pointer transition-colors ${
                              u.status === 'ativo'
                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-900/50'
                                : 'text-muted-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {u.status === 'ativo' ? 'Sim' : 'Não'}
                          </Badge>
                        </button>
                      </TableCell>

                      {/* 5. Gestor */}
                      <TableCell>
                        <span className="text-[13px] text-slate-700 dark:text-slate-300">
                          {u.gestor_nome || '-'}
                        </span>
                      </TableCell>

                      {/* 6. Perfil */}
                      <TableCell>
                        {u.status === 'ativo' || u.status === 'bloqueado' ? (
                          <Badge
                            variant="outline"
                            className="bg-slate-50 dark:bg-zinc-800/60 font-medium text-slate-700 dark:text-slate-300"
                          >
                            {getPerfilLabel(u.perfil_codigo || u.perfil) || 'Sem perfil'}
                          </Badge>
                        ) : (
                          <span className="text-[13px] text-muted-foreground italic">
                            Sem perfil
                          </span>
                        )}
                      </TableCell>

                      {/* 7. Ações */}
                      <TableCell className="text-right">
                        {isOperating ? (
                          <div className="flex items-center justify-end">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        ) : !u.tem_acesso ? (
                          /* Sem acesso: mostrar Conceder acesso + Remover */
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-xs gap-1.5"
                              onClick={() => handleOpenGrantAccessModal(u)}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Conceder acesso
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                              onClick={() => handleOpenInactivateModal(u)}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Remover
                            </Button>
                          </div>
                        ) : u.status === 'ativo' ? (
                          /* Com acesso e Ativo = Sim: mostrar Editar + Remover */
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5"
                              onClick={() => handleOpenEditModal(u)}
                            >
                              <UserCog className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                              onClick={() => handleOpenInactivateModal(u)}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Remover
                            </Button>
                          </div>
                        ) : (
                          /* Com acesso mas Bloqueado/Inconsistente: mostrar Editar + Remover */
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5"
                              onClick={() => handleOpenEditModal(u)}
                            >
                              <UserCog className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                              onClick={() => handleOpenInactivateModal(u)}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Remover
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODAL CRIAR NOVO USUÁRIO */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Criar Novo Usuário
            </DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo usuário no sistema.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleCreateUser()
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nome <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Nome completo"
                value={createName}
                onChange={(e) => {
                  setCreateName(e.target.value)
                  if (createErrors.name) {
                    setCreateErrors((prev) => ({ ...prev, name: '' }))
                  }
                }}
              />
              {createErrors.name && <p className="text-xs text-red-500">{createErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Sigla <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                placeholder="Ex: BFM"
                value={createSigla}
                onChange={(e) => {
                  setCreateSigla(e.target.value.toUpperCase())
                  if (createErrors.sigla) {
                    setCreateErrors((prev) => ({ ...prev, sigla: '' }))
                  }
                }}
              />
              {createErrors.sigla && <p className="text-xs text-red-500">{createErrors.sigla}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                E-mail <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={createEmail}
                onChange={(e) => {
                  setCreateEmail(e.target.value.toLowerCase())
                  if (createErrors.email) {
                    setCreateErrors((prev) => ({ ...prev, email: '' }))
                  }
                }}
              />
              {createErrors.email && <p className="text-xs text-red-500">{createErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Perfil de Acesso <span className="text-rose-500">*</span>
              </label>
              <Select
                value={createPerfil}
                onValueChange={(val) => {
                  setCreatePerfil(val)
                  if (createErrors.perfil) {
                    setCreateErrors((prev) => ({ ...prev, perfil: '' }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um perfil..." />
                </SelectTrigger>
                <SelectContent>
                  {perfisOptions.map((p) => (
                    <SelectItem key={p.codigo} value={p.codigo}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createErrors.perfil && <p className="text-xs text-red-500">{createErrors.perfil}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Gestor <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Select value={createGestorId} onValueChange={(val) => setCreateGestorId(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um gestor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {gestoresOptions.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name || g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={creatingUser}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingUser}>
                {creatingUser && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Conceder Acesso */}
      <Dialog
        open={!!grantAccessModalUser}
        onOpenChange={(open) => {
          if (!open && !grantingAccess) {
            setGrantAccessModalUser(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Conceder Acesso
            </DialogTitle>
            <DialogDescription>
              Conceda acesso ao sistema reutilizando o colaborador corporativo.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleConfirmGrantAccess()
            }}
            className="py-4 space-y-4"
          >
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <Input
                value={grantAccessModalUser?.nome || ''}
                readOnly
                className="bg-muted/50 cursor-not-allowed h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                <Input
                  value={grantAccessModalUser?.email || '-'}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Sigla</label>
                <Input
                  value={grantAccessModalUser?.sigla || '-'}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-sm font-medium text-foreground">
                Perfil de Acesso <span className="text-rose-500">*</span>
              </label>
              <Select value={grantAccessPerfil} onValueChange={setGrantAccessPerfil}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um perfil..." />
                </SelectTrigger>
                <SelectContent>
                  {perfisOptions.map((p) => (
                    <SelectItem key={p.codigo} value={p.codigo}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Gestor <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Select
                value={grantAccessGestorId}
                onValueChange={(val) => setGrantAccessGestorId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um gestor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {gestoresOptions
                    .filter((g) => g.id !== grantAccessModalUser?.id)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name || g.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGrantAccessModalUser(null)}
                disabled={grantingAccess}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!grantAccessPerfil || grantingAccess}>
                {grantingAccess && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Conceder acesso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Reativar Acesso Bloqueado */}
      <Dialog
        open={!!activateModalUser}
        onOpenChange={(open) => !open && setActivateModalUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
              Reativar Acesso
            </DialogTitle>
            <DialogDescription>
              Deseja reativar o acesso de{' '}
              <strong className="text-foreground">{activateModalUser?.nome}</strong>? O usuário
              voltará a ter acesso ao sistema.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActivateModalUser(null)}
              disabled={actionLoadingId === activateModalUser?.id}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmActivateBlocked}
              disabled={actionLoadingId === activateModalUser?.id}
            >
              {actionLoadingId === activateModalUser?.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirmar Reativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Desativar Acesso */}
      <Dialog open={!!revokeModalUser} onOpenChange={(open) => !open && setRevokeModalUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Desativar Acesso
            </DialogTitle>
            <DialogDescription>
              Deseja bloquear o acesso de{' '}
              <strong className="text-foreground">{revokeModalUser?.nome}</strong>? O usuário não
              conseguirá mais acessar o sistema Conectaí.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeModalUser(null)}
              disabled={actionLoadingId === revokeModalUser?.id}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={actionLoadingId === revokeModalUser?.id}
            >
              {actionLoadingId === revokeModalUser?.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Editar Acesso */}
      <Dialog
        open={!!editModalUser}
        onOpenChange={(open) => {
          if (!open && !editingUser) {
            setEditModalUser(null)
          }
        }}
      >
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Atualize as configurações de e-mail, perfil e gestor do usuário.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleConfirmEdit()
            }}
            className="py-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input
                  value={editModalUser?.nome || ''}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Sigla</label>
                <Input
                  value={editModalUser?.sigla || '-'}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                E-mail <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={editEmail}
                onChange={(e) => {
                  setEditEmail(e.target.value)
                  if (editErrors.email) {
                    setEditErrors((prev) => ({ ...prev, email: '' }))
                  }
                }}
                disabled={editingUser}
                className="h-9"
              />
              {editErrors.email && <p className="text-xs text-red-500">{editErrors.email}</p>}
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-sm font-medium text-foreground">
                Perfil de Acesso <span className="text-rose-500">*</span>
              </label>
              <Select
                value={editPerfil}
                onValueChange={(val) => {
                  setEditPerfil(val)
                  if (editErrors.perfil) {
                    setEditErrors((prev) => ({ ...prev, perfil: '' }))
                  }
                }}
                disabled={editingUser}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o perfil..." />
                </SelectTrigger>
                <SelectContent>
                  {perfisOptions.map((p) => (
                    <SelectItem key={p.codigo} value={p.codigo}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editErrors.perfil && <p className="text-xs text-red-500">{editErrors.perfil}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Gestor <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Select
                value={editGestorId}
                onValueChange={(val) => setEditGestorId(val)}
                disabled={editingUser}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o gestor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {gestoresOptions
                    .filter((g) => g.id !== editModalUser?.id)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name || g.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalUser(null)}
                disabled={editingUser}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editingUser}>
                {editingUser && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Remover Usuário */}
      <Dialog open={!!deleteModalUser} onOpenChange={(open) => !open && setDeleteModalUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Remover usuário
            </DialogTitle>
            <DialogDescription className="space-y-2 text-left pt-2 text-foreground font-normal">
              Deseja remover este usuário da Gestão de Usuários? Ele deixará de aparecer nesta tela
              e, caso possua acesso ao Conectaí, esse acesso também será desativado. Nenhum cadastro
              será excluído do banco de dados.
            </DialogDescription>
          </DialogHeader>

          {deleteModalUser && (
            <div className="p-3 bg-muted/40 rounded-md border text-xs space-y-1">
              <div>
                <strong>Nome:</strong> {deleteModalUser.nome}
              </div>
              <div>
                <strong>E-mail:</strong> {deleteModalUser.email || '-'}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModalUser(null)}
              disabled={actionLoadingId === deleteModalUser?.id}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmInactivate}
              disabled={actionLoadingId === deleteModalUser?.id}
            >
              {actionLoadingId === deleteModalUser?.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
