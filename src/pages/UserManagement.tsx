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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Loader2,
  UserCheck,
  UserX,
  UserCog,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
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

  // Diálogos modais
  const [grantModalUser, setGrantModalUser] = useState<UserRow | null>(null)
  const [grantPerfil, setGrantPerfil] = useState<string>('advogado')

  const [reactivateModalUser, setReactivateModalUser] = useState<UserRow | null>(null)

  const [revokeModalUser, setRevokeModalUser] = useState<UserRow | null>(null)

  const [changePerfilUser, setChangePerfilUser] = useState<UserRow | null>(null)
  const [newPerfil, setNewPerfil] = useState<string>('advogado')

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

  // 1. Ativar Acesso (novo usuário sem profile)
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

  // 2. Reativar Acesso (usuário com profile e ativo_sys=false)
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

  // 3. Desativar Acesso (usuário com profile e ativo_sys=true)
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

  // 4. Alterar Perfil
  const handleOpenChangePerfilModal = (user: UserRow) => {
    setChangePerfilUser(user)
    setNewPerfil(user.perfil || 'advogado')
  }

  const handleConfirmChangePerfil = async () => {
    if (!changePerfilUser) return
    const user = changePerfilUser
    setActionLoadingId(user.legaldesk_id)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: {
          action: 'change_perfil',
          legaldesk_id: user.legaldesk_id,
          email: user.email,
          name: user.nome,
          perfil: newPerfil,
        },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao alterar perfil.')
      }

      toast({
        title: 'Perfil alterado',
        description: `O perfil de ${user.nome} foi atualizado para "${PERFIL_LABELS[newPerfil] || newPerfil}".`,
      })
      setChangePerfilUser(null)
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

  // 5. Excluir Acesso
  const handleOpenDeleteModal = (user: UserRow) => {
    setDeleteModalUser(user)
  }

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return
    const user = deleteModalUser
    setActionLoadingId(user.legaldesk_id)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-access', {
        body: {
          action: 'delete_access',
          legaldesk_id: user.legaldesk_id,
          email: user.email,
          name: user.nome,
        },
      })

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao excluir acesso.')
      }

      if (data?.deleted === false && data?.deactivated) {
        toast({
          title: 'Acesso desativado (com dependências)',
          description: `O usuário ${user.nome} possui registros vinculados no sistema. A conta de acesso foi desativada em vez de excluída fisicamente.`,
        })
      } else {
        toast({
          title: 'Acesso excluído',
          description: `A conta de acesso ao Skip de ${user.nome} foi removida com sucesso. O registro no LegalDesk permanece intacto.`,
        })
      }

      setDeleteModalUser(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao excluir acesso',
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
                        {u.status === 'ativo' ? (
                          <Badge
                            variant="outline"
                            className="bg-slate-50 dark:bg-zinc-800/60 font-medium text-slate-700 dark:text-slate-300"
                          >
                            Administrador
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
                        ) : u.status === 'sem_acesso' || u.status === 'inconsistente' ? (
                          /* Usuário SEM acesso ou INCONSISTENTE: Ativar Acesso */
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 hover:text-primary font-medium"
                            disabled={!u.email}
                            title={
                              !u.email ? 'Usuário sem e-mail cadastrado no LegalDesk' : undefined
                            }
                            onClick={() => handleOpenGrantModal(u)}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Ativar Acesso
                          </Button>
                        ) : (
                          /* Usuário COM profile e auth válido: ativo ou bloqueado */
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status === 'ativo' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                                onClick={() => handleOpenRevokeModal(u)}
                              >
                                <UserX className="h-3.5 w-3.5 mr-1" />
                                Desativar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
                                onClick={() => handleOpenReactivateModal(u)}
                              >
                                <UserCheck className="h-3.5 w-3.5 mr-1" />
                                Ativar
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => handleOpenChangePerfilModal(u)}
                            >
                              <UserCog className="h-3.5 w-3.5 mr-1" />
                              Alterar Perfil
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              onClick={() => handleOpenDeleteModal(u)}
                              title="Excluir Acesso"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* DIÁLOGO 1: Ativar Acesso (Novo usuário) */}
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

      {/* DIÁLOGO 2: Reativar Acesso */}
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

      {/* DIÁLOGO 3: Desativar Acesso */}
      <Dialog open={!!revokeModalUser} onOpenChange={(open) => !open && setRevokeModalUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
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

      {/* DIÁLOGO 4: Alterar Perfil */}
      <Dialog open={!!changePerfilUser} onOpenChange={(open) => !open && setChangePerfilUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Alterar Perfil de Acesso
            </DialogTitle>
            <DialogDescription>
              Alterar perfil de{' '}
              <strong className="text-foreground">{changePerfilUser?.nome}</strong> de{' '}
              <strong className="text-foreground">
                {PERFIL_LABELS[changePerfilUser?.perfil || 'advogado'] || changePerfilUser?.perfil}
              </strong>{' '}
              para{' '}
              <strong className="text-foreground">{PERFIL_LABELS[newPerfil] || newPerfil}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <label className="text-sm font-medium text-foreground">Novo perfil:</label>
            <Select value={newPerfil} onValueChange={setNewPerfil}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o novo perfil..." />
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangePerfilUser(null)}
              disabled={actionLoadingId === changePerfilUser?.legaldesk_id}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmChangePerfil}
              disabled={actionLoadingId === changePerfilUser?.legaldesk_id}
            >
              {actionLoadingId === changePerfilUser?.legaldesk_id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Salvar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO 5: Excluir Acesso */}
      <Dialog open={!!deleteModalUser} onOpenChange={(open) => !open && setDeleteModalUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Excluir Acesso ao Sistema
            </DialogTitle>
            <DialogDescription className="space-y-2 text-left pt-2">
              <span className="block font-semibold text-rose-600 dark:text-rose-400">
                ATENÇÃO! Isso removerá a conta de acesso ao Skip de {deleteModalUser?.nome}.
              </span>
              <span className="block text-muted-foreground text-xs leading-relaxed">
                Os registros do LegalDesk <strong>NÃO</strong> serão afetados. Caso o colaborador
                possua histórico de tarefas ou atendimentos vinculados, o acesso será desativado com
                segurança para manter a integridade dos dados.
              </span>
              <span className="block text-xs font-medium pt-1">
                Esta ação não pode ser desfeita. Deseja continuar?
              </span>
            </DialogDescription>
          </DialogHeader>

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
              onClick={handleConfirmDelete}
              disabled={actionLoadingId === deleteModalUser?.legaldesk_id}
            >
              {actionLoadingId === deleteModalUser?.legaldesk_id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Sim, Excluir Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
