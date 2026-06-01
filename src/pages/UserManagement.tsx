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
import { Switch } from '@/components/ui/switch'
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
import { Search, Loader2, Save } from 'lucide-react'

type UserRow = {
  legaldesk_id: string
  nome: string
  sigla: string
  email: string
  ativo_ld: boolean
  profile_id?: string
  perfil: string
  ativo_sys: boolean
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, { grant_access: boolean; perfil: string }>
  >({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    const [{ data: ldUsers }, { data: profs }] = await Promise.all([
      supabase.from('legaldesk_usuarios').select('*').order('nome'),
      supabase.from('profiles').select('*'),
    ])

    if (ldUsers) {
      const rows = ldUsers.map((ld) => {
        const prof = profs?.find((p) => p.legaldesk_usuario_id === ld.id || p.email === ld.email)
        return {
          legaldesk_id: ld.id,
          nome: ld.nome,
          sigla: ld.sigla || '',
          email: ld.email || '',
          ativo_ld: ld.ativo ?? false,
          profile_id: prof?.id,
          perfil: prof?.perfil || 'advogado',
          ativo_sys: prof?.ativo ?? false,
        }
      })
      setUsers(rows)
    }
    setPendingChanges({})
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleChange = (legaldesk_id: string, field: 'grant_access' | 'perfil', value: any) => {
    const user = users.find((u) => u.legaldesk_id === legaldesk_id)
    if (!user) return

    setPendingChanges((prev) => {
      const current = prev[legaldesk_id] || { grant_access: user.ativo_sys, perfil: user.perfil }
      const updated = { ...current, [field]: value }
      if (updated.grant_access === user.ativo_sys && updated.perfil === user.perfil) {
        const next = { ...prev }
        delete next[legaldesk_id]
        return next
      }
      return { ...prev, [legaldesk_id]: updated }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const actions = Object.entries(pendingChanges).map(([id, changes]) => {
      const user = users.find((u) => u.legaldesk_id === id)!
      return { legaldesk_id: id, email: user.email, name: user.nome, ...changes }
    })

    const { error } = await supabase.functions.invoke('admin-user-access', { body: { actions } })

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Permissões atualizadas com sucesso.' })
      setShowConfirm(false)
      loadData()
    }
    setSaving(false)
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.nome.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.sigla.toLowerCase().includes(search.toLowerCase())
      if (!matchesSearch) return false

      const currentAccess = pendingChanges[u.legaldesk_id]?.grant_access ?? u.ativo_sys
      if (filter === 'with_access') return currentAccess
      if (filter === 'without_access') return !currentAccess
      if (filter === 'active_ld') return u.ativo_ld
      return true
    })
  }, [users, search, filter, pendingChanges])

  const summary = useMemo(() => {
    let granted = 0,
      revoked = 0
    Object.entries(pendingChanges).forEach(([id, changes]) => {
      const u = users.find((u) => u.legaldesk_id === id)
      if (u) {
        if (changes.grant_access && !u.ativo_sys) granted++
        if (!changes.grant_access && u.ativo_sys) revoked++
      }
    })
    return { granted, revoked, total: Object.keys(pendingChanges).length }
  }, [pendingChanges, users])

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
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="with_access">Com Acesso</TabsTrigger>
            <TabsTrigger value="without_access">Sem Acesso</TabsTrigger>
            <TabsTrigger value="active_ld">Ativos LD</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={summary.total === 0}
          className="w-full sm:w-auto gap-2"
        >
          <Save className="h-4 w-4" /> Salvar Alterações
          {summary.total > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 min-w-5 h-5 rounded-full">
              {summary.total}
            </Badge>
          )}
        </Button>
      </div>

      <div className="border border-slate-200/60 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Sigla / E-mail</TableHead>
                <TableHead className="text-center">Ativo LegalDesk</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-right">Acesso ao Sistema</TableHead>
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
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => {
                  const currentAccess = pendingChanges[u.legaldesk_id]?.grant_access ?? u.ativo_sys
                  const currentPerfil = pendingChanges[u.legaldesk_id]?.perfil ?? u.perfil
                  const isChanged = !!pendingChanges[u.legaldesk_id]

                  return (
                    <TableRow key={u.legaldesk_id} className={isChanged ? 'bg-primary/5' : ''}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {u.sigla && (
                            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                              {u.sigla}
                            </span>
                          )}
                          <span className="text-[13px] text-muted-foreground truncate max-w-[200px]">
                            {u.email || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={u.ativo_ld ? 'default' : 'secondary'}
                          className={
                            u.ativo_ld
                              ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200'
                              : ''
                          }
                        >
                          {u.ativo_ld ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentPerfil}
                          onValueChange={(val) => handleChange(u.legaldesk_id, 'perfil', val)}
                          disabled={!currentAccess}
                        >
                          <SelectTrigger className="h-8 w-[160px] text-[13px]">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="socio_gestor">Sócio Gestor</SelectItem>
                            <SelectItem value="gestor_area">Gestor de Área</SelectItem>
                            <SelectItem value="advogado">Advogado</SelectItem>
                            <SelectItem value="estagiario">Estagiário</SelectItem>
                            <SelectItem value="administrativo">Administrativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-[13px] font-medium text-muted-foreground w-16 text-right">
                            {currentAccess ? 'Liberado' : 'Bloqueado'}
                          </span>
                          <Switch
                            checked={currentAccess}
                            onCheckedChange={(checked) =>
                              handleChange(u.legaldesk_id, 'grant_access', checked)
                            }
                            disabled={!u.email}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alterações de Acesso</DialogTitle>
            <DialogDescription>
              Você está prestes a aplicar {summary.total} alteraç
              {summary.total === 1 ? 'ão' : 'ões'} nos perfis de usuários.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
              <span className="font-medium text-sm">Acessos a serem liberados:</span>
              <span className="text-xl font-bold">{summary.granted}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-900/50">
              <span className="font-medium text-sm">Acessos a serem removidos:</span>
              <span className="text-xl font-bold">{summary.revoked}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
