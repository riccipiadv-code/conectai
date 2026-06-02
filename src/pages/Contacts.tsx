import { useEffect, useState } from 'react'
import {
  getContacts,
  getResponsaveis,
  getServicos,
  getDeptos,
  ContactsFilters,
} from '@/services/contacts'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format, isBefore, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  FileText,
  Loader2,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Contacts() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ responsaveis: [], servicos: [], deptos: [] })
  const [searchTerm, setSearchTerm] = useState('')

  const [filters, setFilters] = useState<ContactsFilters>({
    stage: 'all',
    responsavel_id: 'all',
    servico_id: 'all',
    depto_id: 'all',
    sla: 'all',
    follow_up: 'all',
    origem: 'all',
  })

  const [sort, setSort] = useState<{ column: string; ascending: boolean }>({
    column: 'data_follow_up',
    ascending: true,
  })

  // Modals for actions
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<any>(null)

  useEffect(() => {
    Promise.all([getResponsaveis(), getServicos(), getDeptos()]).then(([r, s, d]: any) => {
      setMeta({ responsaveis: r, servicos: s, deptos: d })
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    getContacts(filters, sort)
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [filters, sort])

  const toggleSort = (col: string) => {
    setSort((prev) => ({
      column: col,
      ascending: prev.column === col ? !prev.ascending : true,
    }))
  }

  const updateFilter = (key: keyof ContactsFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredData = data.filter((c: any) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      c.nome?.toLowerCase().includes(term) ||
      c.first_name?.toLowerCase().includes(term) ||
      c.whatsapp_phone?.toLowerCase().includes(term) ||
      c.telefone?.toLowerCase().includes(term) ||
      c.lead_empresa_pf?.toLowerCase().includes(term)
    )
  })

  const renderSortIcon = (col: string) => {
    if (sort.column !== col) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
    return sort.ascending ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    )
  }

  const formatPhone = (p: string) => (p ? p : '-')

  const handleManyChat = (c: any) => {
    if (c.manychat_live_chat_url) {
      window.open(c.manychat_live_chat_url, '_blank')
    }
  }

  const getSlaVariant = (sla: string | null) => {
    if (sla === 'red') return 'destructive'
    if (sla === 'yellow') return 'default'
    return 'secondary'
  }

  return (
    <div className="space-y-4 animate-fade-in p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Atendimentos
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os registros e acompanhe os follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Criar Novo
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Buscar</Label>
              <Input
                placeholder="Nome, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Estágio</Label>
              <Select value={filters.stage} onValueChange={(v) => updateFilter('stage', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="nivel_1_novo">Novo</SelectItem>
                  <SelectItem value="orcamento_aprovado">Aprovado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Responsável</Label>
              <Select
                value={filters.responsavel_id}
                onValueChange={(v) => updateFilter('responsavel_id', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {meta.responsaveis?.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Serviço</Label>
              <Select
                value={filters.servico_id}
                onValueChange={(v) => updateFilter('servico_id', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {meta.servicos?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Departamento</Label>
              <Select value={filters.depto_id} onValueChange={(v) => updateFilter('depto_id', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {meta.deptos?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">SLA</Label>
              <Select value={filters.sla} onValueChange={(v) => updateFilter('sla', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="green">No Prazo</SelectItem>
                  <SelectItem value="yellow">Vencendo Hoje</SelectItem>
                  <SelectItem value="red">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Follow Up</Label>
              <Select value={filters.follow_up} onValueChange={(v) => updateFilter('follow_up', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="next_7_days">Próximos 7 dias</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                  <SelectItem value="none">Sem Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Origem</Label>
              <Select value={filters.origem} onValueChange={(v) => updateFilter('origem', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Agente">Agente</SelectItem>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Whatsapp">Whatsapp</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div className="overflow-x-auto w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                <TableHead className="w-[220px] max-w-[220px] pl-6 font-semibold">
                  Contato
                </TableHead>
                <TableHead className="w-[180px] max-w-[180px] font-semibold">
                  Serviço / Empresa
                </TableHead>
                <TableHead className="w-[350px] max-w-[350px] font-semibold">Consulta</TableHead>
                <TableHead className="font-semibold">Estágio</TableHead>
                <TableHead
                  className="w-[110px] cursor-pointer font-semibold select-none hover:text-primary transition-colors"
                  onClick={() => toggleSort('data_follow_up')}
                >
                  <div className="flex items-center">
                    Dt. FUP
                    {renderSortIcon('data_follow_up')}
                  </div>
                </TableHead>
                <TableHead className="min-w-[160px] font-semibold text-center">Ações</TableHead>
                <TableHead className="pr-6 font-semibold text-right">SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-8 w-8 text-slate-300" />
                      <span>Nenhum atendimento encontrado para os filtros selecionados.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((c: any) => {
                  const fupDate = c.data_follow_up ? parseISO(c.data_follow_up) : null
                  const isOverdue = fupDate && isBefore(startOfDay(fupDate), startOfDay(new Date()))

                  const contactName =
                    c.nome || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Desconhecido'
                  const phone = formatPhone(c.whatsapp_phone || c.telefone)
                  const initials = contactName.substring(0, 2).toUpperCase()

                  let stageLabel = c.current_stage || '-'
                  if (stageLabel === 'nivel_1_novo') stageLabel = 'Novo'
                  else if (stageLabel === 'orcamento_aprovado') stageLabel = 'Aprovado'
                  else if (stageLabel === 'cancelado') stageLabel = 'Cancelado'
                  else
                    stageLabel = stageLabel
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l: any) => l.toUpperCase())

                  return (
                    <TableRow
                      key={c.id}
                      className="group hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <TableCell className="w-[220px] max-w-[220px] pl-6 align-top py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={c.foto} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col whitespace-normal break-words overflow-hidden">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                              {contactName}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
                              {phone}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="w-[180px] max-w-[180px] align-top py-3">
                        <div className="flex flex-col whitespace-normal break-words">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {c.lead_servico || c.manychat_servicos?.descricao || '-'}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {c.lead_empresa_pf || '-'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="w-[350px] max-w-[350px] align-top py-3">
                        <div
                          className="text-sm whitespace-normal break-words line-clamp-3 text-slate-600 dark:text-slate-400 leading-relaxed"
                          title={c.lead_resumo || c.observacoes || ''}
                        >
                          {c.lead_resumo || c.observacoes || '-'}
                        </div>
                      </TableCell>

                      <TableCell className="align-top py-3">
                        <Badge
                          variant="outline"
                          className="whitespace-nowrap bg-background font-medium"
                        >
                          {stageLabel}
                        </Badge>
                      </TableCell>

                      <TableCell className="w-[110px] align-top py-3">
                        <span
                          className={cn(
                            'text-sm whitespace-nowrap font-medium',
                            isOverdue
                              ? 'text-red-600 dark:text-red-500'
                              : 'text-slate-700 dark:text-slate-300',
                          )}
                        >
                          {fupDate ? format(fupDate, 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        </span>
                      </TableCell>

                      <TableCell className="min-w-[160px] align-top py-3 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                                onClick={() => handleManyChat(c)}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir ManyChat</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                                onClick={() => {
                                  setSelectedContact(c)
                                  setViewOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50"
                                onClick={() => {
                                  setSelectedContact(c)
                                  setEditOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                                onClick={() => {
                                  setSelectedContact(c)
                                  setDeleteOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>

                      <TableCell className="pr-6 align-top py-3 text-right">
                        <Badge variant={getSlaVariant(c.sla_status)}>
                          {c.sla_status?.toUpperCase() || 'OK'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visualizar Contato</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm">
            Visualizando dados de{' '}
            <span className="font-semibold">
              {selectedContact?.nome || selectedContact?.first_name}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm">
            Editando dados de{' '}
            <span className="font-semibold">
              {selectedContact?.nome || selectedContact?.first_name}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Contato</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm">
            Tem certeza que deseja excluir o contato{' '}
            <span className="font-semibold">
              {selectedContact?.nome || selectedContact?.first_name}
            </span>
            ?
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(false)}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
