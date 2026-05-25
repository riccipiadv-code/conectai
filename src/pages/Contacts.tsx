import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getContacts,
  updateContact,
  deleteContact,
  Contact,
  getServicos,
  getDeptos,
  getCancelReasons,
  Servico,
  Depto,
  CancelReason,
} from '@/services/contacts'
import {
  Loader2,
  Search,
  Edit2,
  MessageCircle,
  Filter,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  Eye,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const getStageLabel = (stage: string) => {
  const map: Record<string, string> = {
    nivel_1_novo: 'Nível 1 - Novo',
    nivel_2_especialista: 'Nível 2 - Especialista',
    nivel_3_especial: 'Nível 3 - Especialista',
    reuniao_consulta_agendada: 'Reunião/Consulta Agendada',
    enviado_orcamento_ag_retorno: 'Enviado Orçamento / Aguardando Retorno',
    orcamento_aprovado: 'Orçamento Aprovado',
    cancelado: 'Cancelado',
  }
  return map[stage] || stage.replace('_', ' ')
}

const getStageColor = (stage: string) => {
  switch (stage) {
    case 'nivel_1_novo':
      return 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    case 'nivel_2_especialista':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800'
    case 'nivel_3_especial':
      return 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800'
    case 'reuniao_consulta_agendada':
      return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800'
    case 'enviado_orcamento_ag_retorno':
      return 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800'
    case 'orcamento_aprovado':
      return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800'
    case 'cancelado':
      return 'bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800'
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  }
}

const getSlaLabel = (sla: string) => {
  switch (sla) {
    case 'green':
      return 'No prazo'
    case 'yellow':
      return 'Atenção'
    case 'red':
      return 'Atrasado'
    case 'paused':
      return 'Pausado'
    case 'done':
      return 'Finalizado'
    default:
      return 'N/A'
  }
}

const getSlaColor = (sla: string) => {
  switch (sla) {
    case 'green':
      return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900'
    case 'yellow':
      return 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900'
    case 'red':
      return 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900'
    case 'paused':
      return 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800'
    case 'done':
      return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900'
    default:
      return 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 dark:bg-gray-900/50 dark:text-gray-400 dark:border-gray-800'
  }
}

const getSlaIcon = (sla: string) => {
  switch (sla) {
    case 'green':
      return <CheckCircle2 className="h-3.5 w-3.5" />
    case 'yellow':
      return <AlertTriangle className="h-3.5 w-3.5" />
    case 'red':
      return <AlertCircle className="h-3.5 w-3.5" />
    case 'paused':
      return <Clock className="h-3.5 w-3.5" />
    case 'done':
      return <CheckCircle className="h-3.5 w-3.5" />
    default:
      return null
  }
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [deptos, setDeptos] = useState<Depto[]>([])
  const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([])

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [updatingContact, setUpdatingContact] = useState<Contact | null>(null)
  const [updateForm, setUpdateForm] = useState<Partial<Contact>>({})
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('edit')

  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)

  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsData, servicosData, deptosData, reasonsData] = await Promise.all([
          getContacts(),
          getServicos(),
          getDeptos(),
          getCancelReasons(),
        ])
        setContacts(contactsData)
        setServicos(servicosData)
        setDeptos(deptosData)
        setCancelReasons(reasonsData)
      } catch (error) {
        console.error('Failed to fetch data', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredContacts = contacts.filter(
    (contact) =>
      (contact.lead_nome?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (contact.nome?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (contact.whatsapp_phone || '').includes(search) ||
      (contact.telefone || '').includes(search) ||
      (contact.lead_email?.toLowerCase() || '').includes(search.toLowerCase()),
  )

  const getInitials = (name?: string | null) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const handleOpenModal = (contact: Contact, mode: 'view' | 'edit') => {
    setModalMode(mode)
    setUpdatingContact(contact)
    setUpdateForm({
      nome: contact.nome || contact.lead_nome || '',
      lead_nome: contact.lead_nome || contact.nome || '',
      lead_empresa_pf: contact.lead_empresa_pf || '',
      lead_email: contact.lead_email || '',
      servico_id: contact.servico_id || '',
      depto_id: contact.depto_id ?? null,
      lead_servico: contact.lead_servico || '',
      lead_resumo: contact.lead_resumo || '',
      current_stage: contact.current_stage || 'nivel_1_novo',
      sla_status: contact.sla_status || 'green',
      cancel_reason_id: contact.cancel_reason_id || '',
      cancel_obs: contact.cancel_obs || '',
    })
  }

  const handleUpdate = async () => {
    if (!updatingContact) return

    if (updateForm.current_stage === 'cancelado' && !updateForm.cancel_reason_id) {
      toast({
        title: 'Atenção',
        description: 'Selecione um motivo para o cancelamento.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = { ...updateForm }
      if (payload.current_stage !== 'cancelado') {
        payload.cancel_reason_id = null
        payload.cancel_obs = null
      }

      await updateContact(
        updatingContact.id,
        payload,
        updatingContact.current_stage || 'nivel_1_novo',
      )
      toast({ title: 'Sucesso', description: 'Contato atualizado com sucesso.' })

      setContacts(contacts.map((c) => (c.id === updatingContact.id ? { ...c, ...payload } : c)))
      setUpdatingContact(null)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o contato.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingContact) return
    setSaving(true)
    try {
      const contatoId = deletingContact.id
      await deleteContact(contatoId)

      setDeletingContact(null)
      setContacts((prev) => prev.filter((c) => c.id !== contatoId))

      toast({ title: 'Sucesso', description: 'Contato excluído com sucesso' })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o contato.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const isView = modalMode === 'view'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            CRM - Atendimentos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os contatos sincronizados e seus respectivos SLAs.
          </p>
        </div>
      </div>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-start gap-6 border-b border-slate-100 dark:border-zinc-800/50 bg-slate-50/30 dark:bg-zinc-900/20 pb-4">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2 whitespace-nowrap">
            <Filter className="h-4 w-4 text-slate-400" />
            Filtros e Busca
          </CardTitle>
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="pl-9 bg-white dark:bg-zinc-950 border-slate-200 shadow-sm focus-visible:ring-primary/20 h-10 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex py-20 items-center justify-center flex-col gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
              <p className="text-sm text-slate-500 font-medium">Carregando contatos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-zinc-900/50">
                  <TableRow className="hover:bg-transparent border-slate-200/60 dark:border-zinc-800">
                    <TableHead className="font-semibold text-slate-600 py-4 px-6 min-w-[200px]">
                      Contato
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4 min-w-[180px]">
                      Serviço / Empresa
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4 min-w-[200px]">
                      Consulta
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4 w-[180px]">
                      Estágio
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4 w-[140px]">
                      Ações
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4 px-6 w-[140px]">
                      SLA
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="h-8 w-8 text-slate-300" />
                          <p>Nenhum contato encontrado para a busca atual.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContacts.map((contact) => (
                      <TableRow
                        key={contact.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/60 transition-colors border-slate-100 dark:border-zinc-800/50 group"
                      >
                        <TableCell className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 border border-slate-200/50 shadow-sm shrink-0">
                              <AvatarImage src={contact.foto || ''} alt={contact.nome || ''} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {getInitials(contact.lead_nome || contact.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate">
                                {contact.lead_nome || contact.nome || 'Sem nome'}
                              </span>
                              <span className="text-sm text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                                {contact.whatsapp_phone || contact.telefone || 'Sem telefone'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px] truncate">
                              {contact.manychat_servicos?.descricao ||
                                contact.lead_servico ||
                                'Não informado'}
                            </span>
                            <span className="text-sm text-slate-500 mt-0.5 truncate">
                              {contact.lead_empresa_pf || 'Pessoa Física'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          {contact.lead_resumo ? (
                            <div className="text-[14px] text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-relaxed max-w-full">
                              {contact.lead_resumo}
                            </div>
                          ) : (
                            <div className="text-[14px] text-slate-500">-</div>
                          )}
                        </TableCell>
                        <TableCell className="py-5">
                          <Badge
                            variant="outline"
                            className={`font-medium px-2.5 py-1 border shadow-sm whitespace-nowrap ${getStageColor(
                              contact.current_stage || 'nivel_1_novo',
                            )}`}
                          >
                            {getStageLabel(contact.current_stage || 'nivel_1_novo')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex items-center gap-1">
                            {contact.manychat_live_chat_url && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                                  >
                                    <a
                                      href={contact.manychat_live_chat_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Abrir conversa</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenModal(contact, 'view')}
                                  className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-zinc-800 transition-colors"
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
                                  onClick={() => handleOpenModal(contact, 'edit')}
                                  className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingContact(contact)}
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-900/30 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell className="py-5 px-6">
                          <Badge
                            variant="outline"
                            className={`font-medium px-2.5 py-1 border shadow-sm inline-flex items-center gap-1.5 w-fit whitespace-nowrap ${getSlaColor(
                              contact.sla_status || 'green',
                            )}`}
                          >
                            {getSlaIcon(contact.sla_status || 'green')}
                            {getSlaLabel(contact.sla_status || 'green')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View/Edit Modal */}
      <Dialog open={!!updatingContact} onOpenChange={(open) => !open && setUpdatingContact(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
            <DialogTitle className="text-xl">
              {isView ? 'Visualizar Contato' : 'Atualizar Contato'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-400">Nome</Label>
                <Input
                  value={updateForm.lead_nome || ''}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      lead_nome: e.target.value,
                      nome: e.target.value,
                    })
                  }
                  placeholder="Nome"
                  disabled={isView}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-400">Empresa / PF</Label>
                <Input
                  value={updateForm.lead_empresa_pf || ''}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, lead_empresa_pf: e.target.value })
                  }
                  placeholder="Nome da empresa ou PF"
                  disabled={isView}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">E-mail</Label>
              <Input
                type="email"
                value={updateForm.lead_email || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, lead_email: e.target.value })}
                placeholder="email@exemplo.com"
                disabled={isView}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-400">Serviço Selecionado</Label>
                <Select
                  value={updateForm.servico_id || ''}
                  onValueChange={(val) => {
                    const servico = servicos.find((s) => s.id === val)
                    setUpdateForm({
                      ...updateForm,
                      servico_id: val,
                      lead_servico: servico?.descricao || '',
                      depto_id: servico?.depto_id ?? null,
                    })
                  }}
                  disabled={isView}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-400">Departamento</Label>
                <Select
                  value={
                    updateForm.depto_id !== null && updateForm.depto_id !== undefined
                      ? String(updateForm.depto_id)
                      : ''
                  }
                  onValueChange={(val) =>
                    setUpdateForm({ ...updateForm, depto_id: val ? Number(val) : null })
                  }
                  disabled={isView}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {deptos.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Resumo da Solicitação</Label>
              <Textarea
                value={updateForm.lead_resumo || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, lead_resumo: e.target.value })}
                placeholder="Detalhes da consulta..."
                className="resize-none"
                rows={4}
                disabled={isView}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-400">Estágio</Label>
                <Select
                  value={updateForm.current_stage || 'nivel_1_novo'}
                  onValueChange={(v) => setUpdateForm({ ...updateForm, current_stage: v })}
                  disabled={isView}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nivel_1_novo">Nível 1 - Novo</SelectItem>
                    <SelectItem value="nivel_2_especialista">Nível 2 - Especialista</SelectItem>
                    <SelectItem value="nivel_3_especial">Nível 3 - Especialista</SelectItem>
                    <SelectItem value="reuniao_consulta_agendada">
                      Reunião/Consulta Agendada
                    </SelectItem>
                    <SelectItem value="enviado_orcamento_ag_retorno">
                      Enviado Orçamento / Aguardando Retorno
                    </SelectItem>
                    <SelectItem value="orcamento_aprovado">Orçamento Aprovado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-400">SLA</Label>
                <Select
                  value={updateForm.sla_status || 'green'}
                  onValueChange={(v) => setUpdateForm({ ...updateForm, sla_status: v })}
                  disabled={isView}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="SLA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">No prazo</SelectItem>
                    <SelectItem value="yellow">Atenção</SelectItem>
                    <SelectItem value="red">Atrasado</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="done">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {updateForm.current_stage === 'cancelado' && (
              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800 animate-fade-in-up duration-300">
                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400">
                    Motivo do Cancelamento <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={updateForm.cancel_reason_id || ''}
                    onValueChange={(v) => setUpdateForm({ ...updateForm, cancel_reason_id: v })}
                    disabled={isView}
                  >
                    <SelectTrigger className="h-10 border-rose-200 dark:border-rose-900/50 focus:ring-rose-500/20">
                      <SelectValue placeholder="Selecione um motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {cancelReasons.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.motivo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400">
                    Observação do Cancelamento
                  </Label>
                  <Textarea
                    value={updateForm.cancel_obs || ''}
                    onChange={(e) => setUpdateForm({ ...updateForm, cancel_obs: e.target.value })}
                    placeholder="Adicione observações adicionais..."
                    className="resize-none"
                    rows={3}
                    disabled={isView}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
            <Button variant="outline" onClick={() => setUpdatingContact(null)} className="h-10">
              {isView ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isView && (
              <Button onClick={handleUpdate} disabled={saving} className="h-10 px-8">
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={!!deletingContact}
        onOpenChange={(open) => !open && setDeletingContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente excluir esse contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover o contato permanentemente, incluindo todo o seu histórico e
              dados associados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
