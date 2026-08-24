import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Loader2,
  UserCheck,
  UserX,
  UserCog,
  ShieldCheck,
  AlertTriangle,
  Plus,
  UserPlus,
} from 'lucide-react'

export type UserRow = {
  legaldesk_id: string
  nome: string
  sigla: string
  email: string
  ativo_ld: boolean
  profile_id?: string | null
  perfil: string | null // null quando não tem profile
  ativo_sys: boolean
  auth_user_exists: boolean
  status: 'sem_acesso' | 'ativo' | 'bloqueado' | 'inconsistente'
}

export type HiddenUser = {
  id: string
  nome: string
  sigla: string | null
  email: string | null
}

const PERFIL_LABELS: Record<string, string> = {
  socio_gestor: 'Sócio Gestor',
  gestor_area: 'Gestor de Área',
  advogado: 'Advogado',
  estagiario: 'Estagiário',
  administrativo: 'Administrativo',
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const { toast } = useToast()

  // Modal Criar Novo Acesso (colaboradores ocultos)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [hiddenUsers, setHiddenUsers] = useState<HiddenUser[]>([])
  const [loadingHiddenUsers, setLoadingHiddenUsers] = useState(false)
  const [hiddenSearch, setHiddenSearch] = useState('')
  const [selectedHiddenUser, setSelectedHiddenUser] = useState<HiddenUser | null>(null)
  const [createPerfil, setCreatePerfil] = useState<string>('advogado')
  const [creatingAccess, setCreatingAccess] = useState(false)

  // Diálogos modais de linha
  const [grantModalUser, setGrantModalUser] = useState<UserRow | null>(null)
  const [grantPerfil, setGrantPerfil] = useState<string>('advogado')

  const [reactivateModalUser, setReactivateModalUser] = useState<UserRow | null>(null)

  const [revokeModalUser, setRevokeModalUser] = useState<UserRow | null>(null)

  const [editModalUser, setEditModalUser] = useState<UserRow | null>(null)
  const [editPerfil, setEditPerfil] = useState<string>('advogado')

  const [deleteModalUser, setDeleteModalUser] = useState<UserRow | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: { action: 'list_users' },
      })

      if (error || data?.error) {
        let extractedMessage: string | null = null

        // Tentar extrair mensagem detalhada do erro (ex: error.context response body no Supabase FunctionsHttpError)
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

        const finalErrorMessage =
          extractedMessage ||
          data?.error ||
          error?.message ||
          'Falha na comunicação com o servidor.'
        throw new Error(finalErrorMessage)
      }

      if (data?.users) {
        setUsers(data.users)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: err.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 1. Modal "Criar Novo"
  const handleOpenCreateModal = async () => {
    setCreateModalOpen(true)
    setHiddenSearch('')
    setSelectedHiddenUser(null)
    setCreatePerfil('advogado')
    setLoadingHiddenUsers(true)

    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: { action: 'list_hidden_users' },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao carregar colaboradores ocultos.')
      }

      setHiddenUsers(data?.users || [])
    } catch (err: any) {
      toast({
        title: 'Erro ao listar colaboradores',
        description: err.message || 'Falha ao buscar usuários ocultos.',
        variant: 'destructive',
      })
    } finally {
      setLoadingHiddenUsers(false)
    }
  }

  const handleConfirmCreateAccess = async () => {
    if (!selectedHiddenUser) return
    setCreatingAccess(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: {
          action: 'grant_access',
          legaldesk_id: selectedHiddenUser.id,
          email: selectedHiddenUser.email,
          name: selectedHiddenUser.nome,
          perfil: createPerfil,
        },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao liberar acesso.')
      }

      toast({
        title: 'Acesso liberado!',
        description: `O acesso para ${selectedHiddenUser.nome} como "${PERFIL_LABELS[createPerfil] || createPerfil}" foi configurado com sucesso.`,
      })
      setCreateModalOpen(false)
      setSelectedHiddenUser(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao liberar acesso',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setCreatingAccess(false)
    }
  }

  const filteredHiddenUsers = useMemo(() => {
    if (!hiddenSearch) return hiddenUsers
    const s = hiddenSearch.toLowerCase()
    return hiddenUsers.filter((u) => {
      const matchNome = u.nome?.toLowerCase().includes(s)
      const matchEmail = u.email?.toLowerCase().includes(s)
      const matchSigla = u.sigla?.toLowerCase().includes(s)
      return matchNome || matchEmail || matchSigla
    })
  }, [hiddenUsers, hiddenSearch])

  // 2. Ativar Acesso (para novo usuário da tabela sem profile)
  const handleOpenGrantModal = (user: UserRow) => {
    setGrantModalUser(user)
    setGrantPerfil('advogado')
  }

  const handleConfirmGrant = async () => {
    if (!grantModalUser) return
    const user = grantModalUser
    setActionLoadingId(user.legaldesk_id)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: {
          action: 'grant_access',
          legaldesk_id: user.legaldesk_id,
          email: user.email,
          name: user.nome,
          perfil: grantPerfil,
        },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao conceder acesso.')
      }

      toast({
        title: 'Acesso liberado!',
        description: `O acesso para ${user.nome} como "${PERFIL_LABELS[grantPerfil] || grantPerfil}" foi configurado com sucesso.`,
      })
      setGrantModalUser(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao liberar acesso',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // 3. Reativar Acesso (usuário bloqueado)
  const handleOpenReactivateModal = (user: UserRow) => {
    setReactivateModalUser(user)
  }

  const handleConfirmReactivate = async () => {
    if (!reactivateModalUser) return
    const user = reactivateModalUser
    setActionLoadingId(user.legaldesk_id)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: {
          action: 'grant_access',
          legaldesk_id: user.legaldesk_id,
          email: user.email,
          name: user.nome,
          perfil: user.perfil || 'advogado',
        },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao reativar acesso.')
      }

      toast({
        title: 'Acesso reativado!',
        description: `O acesso de ${user.nome} foi reativado com sucesso.`,
      })
      setReactivateModalUser(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao reativar acesso',
        description: err.message,
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
    setActionLoadingId(user.legaldesk_id)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: {
          action: 'revoke_access',
          legaldesk_id: user.legaldesk_id,
          email: user.email,
          name: user.nome,
        },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao revogar acesso.')
      }

      toast({
        title: 'Acesso desativado',
        description: `O acesso de ${user.nome} foi bloqueado.`,
      })
      setRevokeModalUser(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao desativar acesso',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // 5. Editar Acesso (change_perfil)
  const handleOpenEditModal = (user: UserRow) => {
    setEditModalUser(user)
    setEditPerfil(user.perfil || 'advogado')
  }

  const handleConfirmEdit = async () => {
    if (!editModalUser) return
    const user = editModalUser
    setActionLoadingId(user.legaldesk_id)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: {
          action: 'change_perfil',
          legaldesk_id: user.legaldesk_id,
          email: user.email,
          name: user.nome,
          perfil: editPerfil,
        },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao alterar perfil.')
      }

      toast({
        title: 'Perfil alterado',
        description: `O perfil de ${user.nome} foi atualizado para "${PERFIL_LABELS[editPerfil] || editPerfil}".`,
      })
      setEditModalUser(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao alterar perfil',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // 6. Inativar Usuário (hide_from_management)
  const handleOpenInactivateModal = (user: UserRow) => {
    setDeleteModalUser(user)
  }

  const handleConfirmInactivate = async () => {
    if (!deleteModalUser) return
    const user = deleteModalUser
    setActionLoadingId(user.legaldesk_id)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: {
          action: 'hide_from_management',
          legaldesk_id: user.legaldesk_id,
          email: user.email,
          name: user.nome,
        },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao inativar usuário.')
      }

      toast({
        title: 'Usuário inativado',
        description: `O usuário ${user.nome} foi inativado na Gestão de Usuários com sucesso.`,
      })

      setDeleteModalUser(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao inativar usuário',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.nome.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.sigla.toLowerCase().includes(search.toLowerCase())
      if (!matchesSearch) return false

      if (filter === 'with_access') return u.status === 'ativo'
      if (filter === 'without_access') return u.status !== 'ativo'
      if (filter === 'active_ld') return u.ativo_ld
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
              Com Acesso ({users.filter((u) => u.status === 'ativo').length})
            </TabsTrigger>
            <TabsTrigger value="without_access">
              Sem Acesso ({users.filter((u) => u.status !== 'ativo').length})
            </TabsTrigger>
            <TabsTrigger value="active_ld">
              Ativos LD ({users.filter((u) => u.ativo_ld).length})
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
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhum colaborador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => {
                  const isOperating = actionLoadingId === u.legaldesk_id

                  return (
                    <TableRow key={u.legaldesk_id}>
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

                      {/* 3. Ativo */}
                      <TableCell className="text-center">
                        <Badge
                          variant={u.status === 'ativo' ? 'default' : 'secondary'}
                          className={
                            u.status === 'ativo'
                              ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-900/50'
                              : 'text-muted-foreground'
                          }
                        >
                          {u.status === 'ativo' ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>

                      {/* 4. Perfil */}
                      <TableCell>
                        {u.status === 'ativo' || u.status === 'bloqueado' ? (
                          <Badge
                            variant="outline"
                            className="bg-slate-50 dark:bg-zinc-800/60 font-medium text-slate-700 dark:text-slate-300"
                          >
                            {PERFIL_LABELS[u.perfil || 'advogado'] || u.perfil || 'Advogado'}
                          </Badge>
                        ) : (
                          <span className="text-[13px] text-muted-foreground italic">
                            Sem perfil
                          </span>
                        )}
                      </TableCell>

                      {/* 5. Ações */}
                      <TableCell className="text-right">
                        {isOperating ? (
                          <div className="flex items-center justify-end">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        ) : u.status === 'ativo' ? (
                          /* Ativo = Sim: mostrar Editar + Inativar */
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
                              Inativar
                            </Button>
                          </div>
                        ) : (
                          /* Ativo = Não (sem_acesso, bloqueado, inconsistente): mostrar apenas Inativar */
                          <div className="flex items-center justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                              onClick={() => handleOpenInactivateModal(u)}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Inativar
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

      {/* MODAL CRIAR NOVO: Listar colaboradores ocultos e conceder acesso */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Criar Novo Acesso
            </DialogTitle>
            <DialogDescription>
              Selecione um colaborador do LegalDesk para liberar o acesso ao Skip.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nome, sigla ou e-mail..."
                value={hiddenSearch}
                onChange={(e) => setHiddenSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="border rounded-md overflow-hidden bg-slate-50/50 dark:bg-zinc-900/50">
              {loadingHiddenUsers ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  Carregando colaboradores...
                </div>
              ) : filteredHiddenUsers.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground px-4">
                  Nenhum colaborador oculto encontrado para os termos buscados.
                </div>
              ) : (
                <ScrollArea className="h-52">
                  <div className="divide-y divide-border/60">
                    {filteredHiddenUsers.map((u) => {
                      const isSelected = selectedHiddenUser?.id === u.id
                      const hasEmail = Boolean(u.email)

                      return (
                        <button
                          key={u.id}
                          type="button"
                          disabled={!hasEmail}
                          onClick={() => setSelectedHiddenUser(u)}
                          className={`w-full text-left px-3 py-2.5 transition-colors flex items-center justify-between gap-3 text-sm ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-accent/60'
                          } ${!hasEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{u.nome}</span>
                              {u.sigla && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0">
                                  {u.sigla}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email || 'Sem e-mail cadastrado no LegalDesk'}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {selectedHiddenUser && (
              <div className="p-3 bg-primary/5 rounded-md border border-primary/20 space-y-3">
                <div className="text-xs font-semibold text-primary">
                  Colaborador selecionado: {selectedHiddenUser.nome}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Perfil de Permissão:
                  </label>
                  <Select value={createPerfil} onValueChange={setCreatePerfil}>
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Selecione um perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="socio_gestor">Sócio Gestor</SelectItem>
                      <SelectItem value="gestor_area">Gestor de Área</SelectItem>
                      <SelectItem value="advogado">Advogado</SelectItem>
                      <SelectItem value="estagiario">Estagiário</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={creatingAccess}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCreateAccess}
              disabled={!selectedHiddenUser || creatingAccess || !selectedHiddenUser.email}
            >
              {creatingAccess && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Liberar Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Ativar Acesso (Para usuário da tabela sem profile) */}
      <Dialog open={!!grantModalUser} onOpenChange={(open) => !open && setGrantModalUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Ativar Acesso
            </DialogTitle>
            <DialogDescription>
              Deseja liberar o acesso de{' '}
              <strong className="text-foreground">{grantModalUser?.nome}</strong> (
              {grantModalUser?.email}) ao sistema?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <label className="text-sm font-medium text-foreground">
              Selecione o perfil de permissões:
            </label>
            <Select value={grantPerfil} onValueChange={setGrantPerfil}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um perfil..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="socio_gestor">Sócio Gestor</SelectItem>
                <SelectItem value="gestor_area">Gestor de Área</SelectItem>
                <SelectItem value="advogado">Advogado</SelectItem>
                <SelectItem value="estagiario">Estagiário</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O usuário receberá um convite por e-mail para definir a senha e acessar o sistema.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGrantModalUser(null)}
              disabled={actionLoadingId === grantModalUser?.legaldesk_id}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmGrant}
              disabled={actionLoadingId === grantModalUser?.legaldesk_id}
            >
              {actionLoadingId === grantModalUser?.legaldesk_id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirmar e Liberar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Reativar Acesso */}
      <Dialog
        open={!!reactivateModalUser}
        onOpenChange={(open) => !open && setReactivateModalUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              Reativar Acesso
            </DialogTitle>
            <DialogDescription>
              Deseja reativar o acesso de{' '}
              <strong className="text-foreground">{reactivateModalUser?.nome}</strong> ao sistema?
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 text-sm text-muted-foreground">
            O usuário voltará a ter acesso ao sistema com o perfil{' '}
            <strong className="text-foreground">
              {PERFIL_LABELS[reactivateModalUser?.perfil || 'advogado'] ||
                reactivateModalUser?.perfil}
            </strong>
            .
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReactivateModalUser(null)}
              disabled={actionLoadingId === reactivateModalUser?.legaldesk_id}
            >
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConfirmReactivate}
              disabled={actionLoadingId === reactivateModalUser?.legaldesk_id}
            >
              {actionLoadingId === reactivateModalUser?.legaldesk_id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Reativar Acesso
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
              conseguirá mais acessar o sistema.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeModalUser(null)}
              disabled={actionLoadingId === revokeModalUser?.legaldesk_id}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={actionLoadingId === revokeModalUser?.legaldesk_id}
            >
              {actionLoadingId === revokeModalUser?.legaldesk_id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Editar Acesso (Completamente reformulado) */}
      <Dialog open={!!editModalUser} onOpenChange={(open) => !open && setEditModalUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Editar Acesso
            </DialogTitle>
            <DialogDescription>
              Atualize as configurações de perfil e permissões de acesso do colaborador.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
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

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                <Input
                  value={editModalUser?.email || '-'}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status Ativo</label>
                <div className="h-9 flex items-center">
                  <Badge
                    variant={editModalUser?.status === 'ativo' ? 'default' : 'secondary'}
                    className={
                      editModalUser?.status === 'ativo'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50'
                        : 'text-muted-foreground'
                    }
                  >
                    {editModalUser?.status === 'ativo' ? 'Sim' : 'Não'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-sm font-medium text-foreground">Perfil de Acesso:</label>
              <Select value={editPerfil} onValueChange={setEditPerfil}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o perfil..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="socio_gestor">Sócio Gestor</SelectItem>
                  <SelectItem value="gestor_area">Gestor de Área</SelectItem>
                  <SelectItem value="advogado">Advogado</SelectItem>
                  <SelectItem value="estagiario">Estagiário</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalUser(null)}
              disabled={actionLoadingId === editModalUser?.legaldesk_id}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmEdit}
              disabled={actionLoadingId === editModalUser?.legaldesk_id}
            >
              {actionLoadingId === editModalUser?.legaldesk_id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Salvar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Inativar Usuário */}
      <Dialog open={!!deleteModalUser} onOpenChange={(open) => !open && setDeleteModalUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Inativar usuário
            </DialogTitle>
            <DialogDescription className="space-y-2 text-left pt-2 text-foreground font-normal">
              Deseja inativar este usuário na Gestão de Usuários? Ele deixará de aparecer nesta tela
              e, caso possua acesso ao sistema, esse acesso também será desativado. Nenhum cadastro
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
              disabled={actionLoadingId === deleteModalUser?.legaldesk_id}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmInactivate}
              disabled={actionLoadingId === deleteModalUser?.legaldesk_id}
            >
              {actionLoadingId === deleteModalUser?.legaldesk_id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Inativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
