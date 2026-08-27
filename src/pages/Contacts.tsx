import { useEffect, useState, useCallback } from 'react'
import {
  getContacts,
  getResponsaveis,
  getServicos,
  getDeptos,
  getCancelReasons,
  getOrigens,
  getSubservicos,
  saveContatoSubservicos,
  updateContact,
  createContact,
  deleteContact,
  getPortesEmpresa,
  notifyResponsavelTransfer,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  FileSpreadsheet,
  Loader2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  Paperclip,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContactModal } from '@/components/shared/contact-modal'
import { AnexosModal } from '@/components/shared/anexos-modal'
import { exportVisibleContactsExcel, exportAllContactsExcel } from '@/services/export-contacts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { OFFICIAL_STAGES, DEFAULT_STAGES } from '@/constants/stages'

export default function Contacts() {
  const { profile } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<{
    responsaveis: any[]
    servicos: any[]
    deptos: any[]
    cancelReasons: any[]
    origens: any[]
    subservicos: any[]
    portesEmpresa: any[]
  }>({
    responsaveis: [],
    servicos: [],
    deptos: [],
    cancelReasons: [],
    origens: [],
    subservicos: [],
    portesEmpresa: [],
  })
  const [searchTerm, setSearchTerm] = useState('')

  const [filters, setFilters] = useState<ContactsFilters>({
    stages: DEFAULT_STAGES,
    responsavel_id: 'all',
    servico_id: 'all',
    depto_id: 'all',
    sla: 'all',
    follow_up: 'all',
    origem_id: 'all',
  })

  const [sort, setSort] = useState<{ column: string; ascending: boolean }>({
    column: 'data_follow_up',
    ascending: true,
  })

  const { toast } = useToast()

  // Modals for actions
  const [updatingContact, setUpdatingContact] = useState<any | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('create')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [anexosModalOpen, setAnexosModalOpen] = useState(false)
  const [anexosContatoId, setAnexosContatoId] = useState<string | null>(null)

  const [deletingContact, setDeletingContact] = useState<any | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [exporting, setExporting] = useState<null | 'visible' | 'all'>(null)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      getResponsaveis(),
      getServicos(),
      getDeptos(),
      getCancelReasons(),
      getOrigens(),
      getSubservicos(),
      getPortesEmpresa(),
    ]).then(([r, s, d, c, o, sub, pe]: any) => {
      setMeta({
        responsaveis: r,
        servicos: s,
        deptos: d,
        cancelReasons: c,
        origens: o,
        subservicos: sub,
        portesEmpresa: pe,
      })
    })
  }, [])

  const fetchData = useCallback(() => {
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

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSort = (col: string) => {
    setSort((prev) => ({
      column: col,
      ascending: prev.column === col ? !prev.ascending : true,
    }))
  }

  const updateFilter = (key: keyof ContactsFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredData = data.filter((c: any) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      c.lead_nome?.toLowerCase().includes(term) ||
      c.nome?.toLowerCase().includes(term) ||
      c.first_name?.toLowerCase().includes(term) ||
      c.whatsapp_phone?.toLowerCase().includes(term) ||
      c.telefone?.toLowerCase().includes(term) ||
      c.lead_empresa_pf?.toLowerCase().includes(term) ||
      (c.numero_cliente != null && String(c.numero_cliente).includes(term))
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
    if (c.manychat_origens?.nome?.toLowerCase() !== 'whatsapp') {
      return
    }
    if (c.manychat_live_chat_url) {
      window.open(c.manychat_live_chat_url, '_blank')
    }
  }

  const handleSendEmail = (c: any) => {
    const email = c.lead_email?.trim()
    if (!email) {
      toast({
        title: 'Aviso',
        description: 'Este contato não possui e-mail cadastrado.',
      })
      return
    }

    const bcc = 'riccipi.adv@gmail.com'
    const subject = `[CONECTAI:${c.controle || ''}]`
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}`
    window.location.href = mailtoUrl
  }

  const renderSlaBadge = (status: string | null) => {
    switch (status) {
      case 'green':
        return (
          <Badge
            variant="outline"
            className="shadow-sm gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            No prazo
          </Badge>
        )
      case 'yellow':
        return (
          <Badge
            variant="outline"
            className="shadow-sm gap-1.5 border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Atenção
          </Badge>
        )
      case 'red':
        return (
          <Badge
            variant="outline"
            className="shadow-sm gap-1.5 border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Atrasado
          </Badge>
        )
      case 'paused':
        return (
          <Badge
            variant="outline"
            className="shadow-sm gap-1.5 border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
          >
            <Clock className="h-3.5 w-3.5" />
            Pausado
          </Badge>
        )
      case 'done':
        return (
          <Badge
            variant="outline"
            className="shadow-sm gap-1.5 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Finalizado
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="shadow-sm gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            No prazo
          </Badge>
        )
    }
  }

  const handleCreateNew = () => {
    setUpdatingContact(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleExportClick = () => {
    setIsExportDialogOpen(true)
  }

  const handleExportVisible = async () => {
    setExporting('visible')
    try {
      const result = await exportVisibleContactsExcel(filteredData)
      if (!result.success) {
        toast({ title: 'Aviso', description: result.message })
      } else {
        toast({ title: 'Sucesso', description: 'Arquivo exportado com sucesso.' })
      }
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao exportar atendimentos.',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
      setIsExportDialogOpen(false)
    }
  }

  const handleExportAll = async () => {
    setExporting('all')
    try {
      const result = await exportAllContactsExcel()
      if (!result.success) {
        toast({ title: 'Aviso', description: result.message })
      } else {
        toast({ title: 'Sucesso', description: 'Arquivo exportado com sucesso.' })
      }
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao exportar atendimentos.',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
      setIsExportDialogOpen(false)
    }
  }

  const handleView = (c: any) => {
    setUpdatingContact(c)
    setModalMode('view')
    setIsModalOpen(true)
  }

  const handleEdit = (c: any) => {
    setUpdatingContact(c)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDelete = (c: any) => {
    setDeletingContact(c)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingContact) {
      try {
        await deleteContact(deletingContact.id)
        toast({ title: 'Sucesso', description: 'Contato excluído.' })
        fetchData()
      } catch (error) {
        console.error(error)
        toast({ title: 'Erro', description: 'Erro ao excluir contato.', variant: 'destructive' })
      }
    }
    setIsDeleteDialogOpen(false)
    setDeletingContact(null)
  }

  const handleSaveModal = async (
    payload: any,
    id?: string,
    prevStage?: string,
    subservicoIds?: number[],
  ) => {
    try {
      if (profile?.perfil !== 'administrador') {
        delete payload.valor
      }

      if (modalMode === 'create') {
        const newContact = await createContact(payload)
        if (newContact?.id && subservicoIds) {
          await saveContatoSubservicos(newContact.id, subservicoIds)
        }
        toast({ title: 'Sucesso', description: 'Contato criado com sucesso.' })
      } else if (modalMode === 'edit' && id) {
        const previousResponsavelId = updatingContact?.responsavel_id || null
        const newResponsavelId = payload.responsavel_id || null

        await updateContact(id, payload, prevStage)
        if (subservicoIds) {
          await saveContatoSubservicos(id, subservicoIds)
        }
        toast({ title: 'Sucesso', description: 'Contato atualizado com sucesso.' })

        const ANA_EDITH_ID = 'f7678df1-1051-49b1-8a4e-6efe80874dfa'
        if (
          previousResponsavelId === ANA_EDITH_ID &&
          previousResponsavelId !== newResponsavelId &&
          newResponsavelId
        ) {
          notifyResponsavelTransfer(id, previousResponsavelId, newResponsavelId).catch(
            (notifyError) => {
              console.error(
                'Erro ao enviar notificação de transferência de responsável:',
                notifyError,
              )
              toast({
                title: 'Aviso',
                description: 'O responsável foi alterado, mas a notificação não pôde ser enviada.',
                variant: 'default',
              })
            },
          )
        }
      }

      fetchData()
      setIsModalOpen(false)
      setTimeout(() => setUpdatingContact(null), 200)
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro.',
        variant: 'destructive',
      })
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setUpdatingContact(null), 200)
  }

  return (
    <div className="space-y-4 animate-fade-in p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Atendimentos ({filteredData.length})
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os registros e acompanhe os follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportClick} disabled={exporting !== null}>
            {exporting !== null ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
          <Button onClick={handleCreateNew}>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal px-3 bg-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    Estágios ({filters.stages?.length || 0})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Estágios
                    </h4>
                  </div>
                  <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() =>
                        updateFilter(
                          'stages',
                          OFFICIAL_STAGES.map((s) => s.id),
                        )
                      }
                    >
                      Selecionar todos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() => updateFilter('stages', DEFAULT_STAGES)}
                    >
                      Padrão
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() => updateFilter('stages', [])}
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {OFFICIAL_STAGES.map((stage) => (
                      <div key={stage.id} className="flex items-center space-x-3 px-1">
                        <Checkbox
                          id={`stage-${stage.id}`}
                          checked={filters.stages?.includes(stage.id)}
                          onCheckedChange={(checked) => {
                            const currentStages = filters.stages || []
                            if (checked) {
                              updateFilter('stages', [...currentStages, stage.id])
                            } else {
                              updateFilter(
                                'stages',
                                currentStages.filter((id) => id !== stage.id),
                              )
                            }
                          }}
                        />
                        <label
                          htmlFor={`stage-${stage.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-slate-700 dark:text-slate-300"
                        >
                          {stage.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
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
              <Select
                value={filters.depto_id != null ? String(filters.depto_id) : 'all'}
                onValueChange={(v) => updateFilter('depto_id', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {meta.deptos?.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nome}
                    </SelectItem>
                  ))}{' '}
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
                  <SelectItem value="yellow">Atenção</SelectItem>
                  <SelectItem value="red">Atrasado</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="done">Finalizado</SelectItem>
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
              <Select
                value={String(filters.origem_id)}
                onValueChange={(v) => updateFilter('origem_id', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {meta.origens?.map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.nome}
                    </SelectItem>
                  ))}
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
                <TableHead className="w-[80px] font-semibold text-center">Enviar e-mail</TableHead>
                <TableHead className="w-[80px] font-semibold text-center">Anexos</TableHead>
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
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
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
                    c.lead_nome ||
                    c.nome ||
                    `${c.first_name || ''} ${c.last_name || ''}`.trim() ||
                    'Desconhecido'
                  const phone = formatPhone(c.whatsapp_phone || c.telefone)

                  const foundStage = OFFICIAL_STAGES.find((s) => s.id === c.current_stage)
                  let stageLabel = foundStage ? foundStage.label : c.current_stage || '-'
                  if (!foundStage && stageLabel !== '-') {
                    stageLabel = stageLabel
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l: any) => l.toUpperCase())
                  }

                  return (
                    <TableRow
                      key={c.id}
                      className="group hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <TableCell className="w-[220px] max-w-[220px] pl-6 align-top py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-slate-300">
                            {c.controle || '-'}
                          </div>
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

                      <TableCell className="w-[80px] align-top py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-600"
                          onClick={() => handleSendEmail(c)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </TableCell>

                      <TableCell className="align-top py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-600"
                          onClick={() => {
                            setAnexosContatoId(c.id)
                            setAnexosModalOpen(true)
                          }}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
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
                          {(() => {
                            const isWhatsApp =
                              c.manychat_origens?.nome?.toLowerCase() === 'whatsapp'
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={!isWhatsApp}
                                      className={cn(
                                        'h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50',
                                        !isWhatsApp &&
                                          'opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent text-slate-400 dark:text-slate-600',
                                      )}
                                      onClick={() => isWhatsApp && handleManyChat(c)}
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isWhatsApp
                                    ? 'Abrir ManyChat'
                                    : 'Disponível apenas para atendimentos de origem WhatsApp.'}
                                </TooltipContent>
                              </Tooltip>
                            )
                          })()}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                                onClick={() => handleView(c)}
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
                                onClick={() => handleEdit(c)}
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
                                onClick={() => handleDelete(c)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>

                      <TableCell className="pr-6 align-top py-3 text-right">
                        {renderSlaBadge(c.sla_status)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        contact={updatingContact}
        onSave={handleSaveModal}
        servicos={meta.servicos}
        deptos={meta.deptos}
        cancelReasons={meta.cancelReasons}
        origens={meta.origens}
        subservicos={meta.subservicos}
        portesEmpresa={meta.portesEmpresa}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contato{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {deletingContact?.lead_nome || deletingContact?.nome || deletingContact?.first_name}
              </span>
              ? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingContact(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isExportDialogOpen}
        onOpenChange={(open) => {
          if (!exporting) setIsExportDialogOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar</DialogTitle>
            <DialogDescription>
              Escolha o tipo de exportação desejada. O arquivo será gerado em formato Excel (.xlsx).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={handleExportVisible}
              disabled={exporting !== null}
            >
              {exporting === 'visible' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                'Apenas selecionados em tela'
              )}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={handleExportAll}
              disabled={exporting !== null}
            >
              {exporting === 'all' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                'Todos os registros'
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsExportDialogOpen(false)}
              disabled={exporting !== null}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AnexosModal
        isOpen={anexosModalOpen}
        onClose={() => {
          setAnexosModalOpen(false)
          setAnexosContatoId(null)
        }}
        contatoId={anexosContatoId || ''}
      />
    </div>
  )
}
