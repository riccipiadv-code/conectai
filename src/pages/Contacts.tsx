import { useEffect, useState, useCallback, useRef } from 'react'
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
  notifyReabertura,
  ContactsFilters,
  canEditContact,
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
  Mail,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContactModal } from '@/components/shared/contact-modal'
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
import { getSafeErrorMessage } from '@/lib/safe-error'

export default function Contacts() {
  const { user, profile, managedUserIds, managedCoreUserIds } = useAuth()
  const activeTeamIds =
    managedCoreUserIds && managedCoreUserIds.length > 0 ? managedCoreUserIds : managedUserIds
  const initialFiltersApplied = useRef(false)
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
    responsavel_ids: undefined,
    responsavel_core_usuario_ids: undefined,
    servico_ids: undefined,
    depto_ids: undefined,
    follow_ups: undefined,
    origem_ids: undefined,
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

  const [deletingContact, setDeletingContact] = useState<any | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [exporting, setExporting] = useState<null | 'visible' | 'all'>(null)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAuxiliaryData = useCallback(() => {
    return Promise.all([
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

  useEffect(() => {
    fetchAuxiliaryData()
  }, [fetchAuxiliaryData])

  useEffect(() => {
    if (initialFiltersApplied.current) return
    if (!profile) return
    if (
      !meta.responsaveis ||
      meta.responsaveis.length === 0 ||
      !meta.servicos ||
      meta.servicos.length === 0 ||
      !meta.deptos ||
      meta.deptos.length === 0 ||
      !meta.origens ||
      meta.origens.length === 0
    ) {
      return
    }

    let responsavel_ids: string[] = []
    if (profile.perfil === 'administrador') {
      responsavel_ids = [...meta.responsaveis.map((r: any) => String(r.id)), '__NULL__']
      initialFiltersApplied.current = true
    } else {
      const coreUserId = profile.core_usuario_id
      const legaldeskId = profile.legaldesk_usuario_id

      let foundResp: any = null
      if (coreUserId) {
        foundResp = meta.responsaveis.find(
          (r: any) =>
            String(r.id) === String(coreUserId) || String(r.core_usuario_id) === String(coreUserId),
        )
      }
      if (!foundResp && legaldeskId) {
        foundResp = meta.responsaveis.find(
          (r: any) =>
            String(r.legaldesk_usuario_id) === String(legaldeskId) ||
            String(r.id) === String(legaldeskId),
        )
      }

      if (!foundResp) {
        responsavel_ids = [...meta.responsaveis.map((r: any) => String(r.id)), '__NULL__']
      } else {
        responsavel_ids = [String(foundResp.id)]
      }
      initialFiltersApplied.current = true
    }

    setFilters((prev) => ({
      ...prev,
      servico_ids: meta.servicos.map((s: any) => String(s.id)),
      depto_ids: meta.deptos.map((d: any) => d.id),
      follow_ups: ['today', 'next_7_days', 'overdue', 'none'],
      origem_ids: meta.origens.map((o: any) => o.id),
      responsavel_ids,
      responsavel_core_usuario_ids: responsavel_ids,
    }))
  }, [meta.responsaveis, meta.servicos, meta.deptos, meta.origens, profile])

  const fetchData = useCallback(() => {
    setLoading(true)
    return getContacts(filters, sort)
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [filters, sort])

  const handleRefresh = async () => {
    if (refreshing || loading) return
    setRefreshing(true)
    try {
      await Promise.all([
        fetchData(),
        fetchAuxiliaryData().catch((err) => {
          console.error('Erro ao atualizar dados auxiliares:', err)
        }),
      ])
      toast({
        title: 'Atualizado',
        description: 'Os dados foram atualizados com sucesso.',
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os dados.',
        variant: 'destructive',
      })
    } finally {
      setRefreshing(false)
    }
  }

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
      c.lead_empresa_pf?.toLowerCase().includes(term) ||
      (c.controle != null && String(c.controle).toLowerCase().includes(term)) ||
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
        description: getSafeErrorMessage(error, 'Erro ao exportar atendimentos.'),
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
        description: getSafeErrorMessage(error, 'Erro ao exportar atendimentos.'),
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
    if (!canEditContact(c, profile, activeTeamIds)) {
      toast({
        title: 'Aviso',
        description:
          profile?.perfil === 'gestor'
            ? 'Gestor só pode editar atendimentos próprios ou da sua equipe.'
            : 'Você só pode editar seus próprios atendimentos.',
        variant: 'destructive',
      })
      return
    }
    setUpdatingContact(c)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDelete = (c: any) => {
    if (profile?.perfil !== 'administrador') {
      toast({
        title: 'Acesso Negado',
        description: 'Apenas administradores podem excluir atendimentos.',
        variant: 'destructive',
      })
      return
    }
    setDeletingContact(c)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (
      !profile ||
      profile.ativo === false ||
      profile.hasSystemAccess !== true ||
      profile.perfil !== 'administrador'
    ) {
      toast({
        title: 'Acesso Negado',
        description: 'Apenas administradores podem excluir atendimentos.',
        variant: 'destructive',
      })
      setIsDeleteDialogOpen(false)
      setDeletingContact(null)
      return
    }

    if (deletingContact) {
      try {
        await deleteContact(deletingContact.id, profile)
        toast({ title: 'Sucesso', description: 'Contato excluído.' })
        fetchData()
      } catch (error: any) {
        console.error(error)
        toast({
          title: 'Erro',
          description: getSafeErrorMessage(error, 'Erro ao excluir contato.'),
          variant: 'destructive',
        })
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
        if (!canEditContact(updatingContact, profile, activeTeamIds)) {
          toast({
            title: 'Aviso',
            description:
              profile?.perfil === 'gestor'
                ? 'Gestor só pode editar atendimentos próprios ou da sua equipe.'
                : 'Você só pode editar seus próprios atendimentos.',
            variant: 'destructive',
          })
          return
        }

        // Se perfil operacional, não permitir transferir responsabilidade
        if (profile?.perfil === 'operacional') {
          delete payload.responsavel_id
          delete payload.responsavel_core_usuario_id
        }

        // Sincronizar responsavel_core_usuario_id e responsavel_id para persistência dupla
        if (payload.responsavel_core_usuario_id) {
          const matchedResp = meta.responsaveis?.find(
            (r: any) =>
              r.core_usuario_id === payload.responsavel_core_usuario_id ||
              r.id === payload.responsavel_core_usuario_id,
          )
          if (matchedResp?.legaldesk_usuario_id && !payload.responsavel_id) {
            payload.responsavel_id = matchedResp.legaldesk_usuario_id
          }
        }

        const prevCentralId =
          updatingContact?.responsavel_core_usuario_id || updatingContact?.responsavel_id || null
        const newCentralId =
          payload.responsavel_core_usuario_id !== undefined
            ? payload.responsavel_core_usuario_id
            : payload.responsavel_id !== undefined
              ? payload.responsavel_id
              : prevCentralId

        const previousStage = prevStage || updatingContact?.current_stage || null
        const newStage = payload.current_stage !== undefined ? payload.current_stage : previousStage
        const effectiveResponsavelId = newCentralId || prevCentralId

        await updateContact(id, payload, prevStage, user?.id)
        if (subservicoIds) {
          await saveContatoSubservicos(id, subservicoIds)
        }
        toast({ title: 'Sucesso', description: 'Contato atualizado com sucesso.' })

        if (newCentralId && newCentralId !== prevCentralId) {
          notifyResponsavelTransfer(
            id,
            prevCentralId,
            newCentralId,
            updatingContact?.responsavel_id,
            payload.responsavel_id,
          ).catch((notifyError) => {
            console.error(
              'Erro ao enviar notificação de transferência de responsável:',
              notifyError,
            )
            toast({
              title: 'Aviso',
              description: 'O responsável foi alterado, mas a notificação não pôde ser enviada.',
              variant: 'default',
            })
          })
        }

        if (
          previousStage === 'cancelado' &&
          newStage &&
          newStage !== 'cancelado' &&
          newStage !== 'orcamento_aprovado' &&
          effectiveResponsavelId
        ) {
          notifyReabertura(id, previousStage, newStage, effectiveResponsavelId).catch(
            (notifyError) => {
              console.error('Erro ao enviar notificação de reabertura de atendimento:', notifyError)
              toast({
                title: 'Aviso',
                description:
                  'O atendimento foi reaberto, mas a notificação por e-mail não pôde ser enviada.',
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
        description: getSafeErrorMessage(error, 'Ocorreu um erro ao processar o atendimento.'),
        variant: 'destructive',
      })
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setUpdatingContact(null), 200)
  }

  return (
    <div className="space-y-4 animate-fade-in">
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
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            aria-label="Atualizar dados"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', (refreshing || loading) && 'animate-spin')} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Buscar</Label>
              <Input
                placeholder="Nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Status</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal px-3 bg-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    Status
                    {(filters.stages?.length ?? 0) < OFFICIAL_STAGES.length && (
                      <span className="text-slate-400 dark:text-slate-500 ml-0.5">•</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Status
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal px-3 bg-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    Responsável
                    {(() => {
                      const allIds = meta.responsaveis.map((r: any) => String(r.id))
                      const hasAll =
                        allIds.length > 0 &&
                        allIds.every((id) => filters.responsavel_ids?.includes(id))
                      return !hasAll ? (
                        <span className="text-slate-400 dark:text-slate-500 ml-0.5">•</span>
                      ) : null
                    })()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Responsável
                    </h4>
                  </div>
                  <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() =>
                        updateFilter('responsavel_ids', [
                          ...meta.responsaveis.map((r: any) => String(r.id)),
                          '__NULL__',
                        ])
                      }
                    >
                      Selecionar todos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() => updateFilter('responsavel_ids', [])}
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {meta.responsaveis?.map((r: any) => {
                      const idStr = String(r.id)
                      const isChecked = filters.responsavel_ids?.includes(idStr)
                      return (
                        <div key={r.id} className="flex items-center space-x-3 px-1">
                          <Checkbox
                            id={`resp-${r.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const allIds = meta.responsaveis.map((x: any) => String(x.id))
                              if (checked) {
                                const next = [
                                  ...(filters.responsavel_ids || []).filter(
                                    (id) => id !== '__NULL__',
                                  ),
                                  idStr,
                                ]
                                const isAllSelected = allIds.every((id) => next.includes(id))
                                if (isAllSelected) {
                                  updateFilter('responsavel_ids', [...allIds, '__NULL__'])
                                } else {
                                  updateFilter('responsavel_ids', next)
                                }
                              } else {
                                const next = (filters.responsavel_ids || []).filter(
                                  (id) => id !== idStr && id !== '__NULL__',
                                )
                                updateFilter('responsavel_ids', next)
                              }
                            }}
                          />
                          <label
                            htmlFor={`resp-${r.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-slate-700 dark:text-slate-300"
                          >
                            {r.nome}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Serviço</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal px-3 bg-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    Serviço
                    {(filters.servico_ids?.length ?? 0) !== meta.servicos.length && (
                      <span className="text-slate-400 dark:text-slate-500 ml-0.5">•</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Serviço
                    </h4>
                  </div>
                  <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() =>
                        updateFilter(
                          'servico_ids',
                          meta.servicos.map((s: any) => String(s.id)),
                        )
                      }
                    >
                      Selecionar todos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() => updateFilter('servico_ids', [])}
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {meta.servicos?.map((s: any) => {
                      const idStr = String(s.id)
                      const isChecked = filters.servico_ids?.includes(idStr)
                      return (
                        <div key={s.id} className="flex items-center space-x-3 px-1">
                          <Checkbox
                            id={`serv-${s.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateFilter('servico_ids', [...(filters.servico_ids || []), idStr])
                              } else {
                                updateFilter(
                                  'servico_ids',
                                  (filters.servico_ids || []).filter((id) => id !== idStr),
                                )
                              }
                            }}
                          />
                          <label
                            htmlFor={`serv-${s.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-slate-700 dark:text-slate-300"
                          >
                            {s.descricao}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Departamento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal px-3 bg-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    Departamento
                    {(filters.depto_ids?.length ?? 0) !== meta.deptos.length && (
                      <span className="text-slate-400 dark:text-slate-500 ml-0.5">•</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Departamento
                    </h4>
                  </div>
                  <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() =>
                        updateFilter(
                          'depto_ids',
                          meta.deptos.map((d: any) => d.id),
                        )
                      }
                    >
                      Selecionar todos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() => updateFilter('depto_ids', [])}
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {meta.deptos?.map((d: any) => {
                      const isChecked = filters.depto_ids?.some((id) => String(id) === String(d.id))
                      return (
                        <div key={d.id} className="flex items-center space-x-3 px-1">
                          <Checkbox
                            id={`depto-${d.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateFilter('depto_ids', [...(filters.depto_ids || []), d.id])
                              } else {
                                updateFilter(
                                  'depto_ids',
                                  (filters.depto_ids || []).filter(
                                    (id) => String(id) !== String(d.id),
                                  ),
                                )
                              }
                            }}
                          />
                          <label
                            htmlFor={`depto-${d.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-slate-700 dark:text-slate-300"
                          >
                            {d.nome}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Follow Up</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal px-3 bg-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    Follow Up
                    {(filters.follow_ups?.length ?? 0) !== 4 && (
                      <span className="text-slate-400 dark:text-slate-500 ml-0.5">•</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Follow Up
                    </h4>
                  </div>
                  <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() =>
                        updateFilter('follow_ups', ['today', 'next_7_days', 'overdue', 'none'])
                      }
                    >
                      Selecionar todos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() => updateFilter('follow_ups', [])}
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {[
                      { id: 'today', label: 'Hoje' },
                      { id: 'next_7_days', label: 'Próximos 7 dias' },
                      { id: 'overdue', label: 'Atrasados' },
                      { id: 'none', label: 'Sem Follow Up' },
                    ].map((fup) => {
                      const isChecked = filters.follow_ups?.includes(fup.id)
                      return (
                        <div key={fup.id} className="flex items-center space-x-3 px-1">
                          <Checkbox
                            id={`fup-${fup.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateFilter('follow_ups', [...(filters.follow_ups || []), fup.id])
                              } else {
                                updateFilter(
                                  'follow_ups',
                                  (filters.follow_ups || []).filter((id) => id !== fup.id),
                                )
                              }
                            }}
                          />
                          <label
                            htmlFor={`fup-${fup.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-slate-700 dark:text-slate-300"
                          >
                            {fup.label}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Origem</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal px-3 bg-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    Origem
                    {(filters.origem_ids?.length ?? 0) !== meta.origens.length && (
                      <span className="text-slate-400 dark:text-slate-500 ml-0.5">•</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Origem
                    </h4>
                  </div>
                  <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() =>
                        updateFilter(
                          'origem_ids',
                          meta.origens.map((o: any) => o.id),
                        )
                      }
                    >
                      Selecionar todas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      onClick={() => updateFilter('origem_ids', [])}
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {meta.origens?.map((o: any) => {
                      const isChecked = filters.origem_ids?.some(
                        (id) => String(id) === String(o.id),
                      )
                      return (
                        <div key={o.id} className="flex items-center space-x-3 px-1">
                          <Checkbox
                            id={`orig-${o.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateFilter('origem_ids', [...(filters.origem_ids || []), o.id])
                              } else {
                                updateFilter(
                                  'origem_ids',
                                  (filters.origem_ids || []).filter(
                                    (id) => String(id) !== String(o.id),
                                  ),
                                )
                              }
                            }}
                          />
                          <label
                            htmlFor={`orig-${o.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-slate-700 dark:text-slate-300"
                          >
                            {o.nome}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
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
                <TableHead className="w-[200px] max-w-[220px] pl-4 pr-3 py-3 font-semibold">
                  Contato
                </TableHead>
                <TableHead className="w-[170px] max-w-[190px] px-3 py-3 font-semibold">
                  Serviço / Empresa
                </TableHead>
                <TableHead className="w-[260px] max-w-[300px] px-3 py-3 font-semibold">
                  Consulta
                </TableHead>
                <TableHead className="w-[130px] px-3 py-3 font-semibold">Status</TableHead>
                <TableHead className="w-[140px] max-w-[160px] px-3 py-3 font-semibold">
                  Responsável
                </TableHead>
                <TableHead
                  className="w-[110px] px-3 py-3 cursor-pointer font-semibold select-none hover:text-primary transition-colors"
                  onClick={() => toggleSort('data_follow_up')}
                >
                  <div className="flex items-center">
                    Dt. FUP
                    {renderSortIcon('data_follow_up')}
                  </div>
                </TableHead>
                <TableHead className="w-[140px] pl-3 pr-4 py-3 font-semibold text-center">
                  Ações
                </TableHead>
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
                    c.lead_nome ||
                    c.nome ||
                    `${c.first_name || ''} ${c.last_name || ''}`.trim() ||
                    'Desconhecido'
                  const foundStage = OFFICIAL_STAGES.find((s) => s.id === c.current_stage)
                  let stageLabel = foundStage ? foundStage.label : c.current_stage || '-'
                  if (!foundStage && stageLabel !== '-') {
                    stageLabel = stageLabel
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l: any) => l.toUpperCase())
                  }

                  const responsavelNome =
                    c.core_usuarios?.nome || c.legaldesk_usuarios?.nome || c.profiles?.name || '-'

                  return (
                    <TableRow
                      key={c.id}
                      className="group hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <TableCell className="w-[200px] max-w-[220px] pl-4 pr-3 align-middle py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-slate-300">
                            {c.controle || '-'}
                          </div>
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 whitespace-normal break-words leading-tight">
                            {contactName}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="w-[170px] max-w-[190px] px-3 align-middle py-3">
                        <div className="flex flex-col whitespace-normal break-words leading-snug">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {c.lead_servico || c.manychat_servicos?.descricao || '-'}
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {c.lead_empresa_pf || '-'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="w-[260px] max-w-[300px] px-3 align-middle py-3">
                        <div
                          className="text-sm whitespace-normal break-words line-clamp-2 text-slate-600 dark:text-slate-400 leading-snug"
                          title={c.lead_resumo || c.observacoes || ''}
                        >
                          {c.lead_resumo || c.observacoes || '-'}
                        </div>
                      </TableCell>

                      <TableCell className="w-[130px] px-3 align-middle py-3">
                        <Badge
                          variant="outline"
                          className="whitespace-nowrap bg-background font-medium"
                        >
                          {stageLabel}
                        </Badge>
                      </TableCell>

                      <TableCell className="w-[140px] max-w-[160px] px-3 align-middle py-3">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                          {responsavelNome}
                        </span>
                      </TableCell>

                      <TableCell className="w-[110px] px-3 align-middle py-3">
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

                      <TableCell className="w-[140px] pl-3 pr-4 align-middle py-3 text-center">
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
                          {(() => {
                            const canEdit = canEditContact(c, profile, activeTeamIds)

                            if (!canEdit) return null

                            return (
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
                            )
                          })()}
                          {profile?.perfil === 'administrador' && (
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
                          )}
                        </div>
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
    </div>
  )
}
