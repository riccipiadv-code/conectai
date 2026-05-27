import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import {
  Contact,
  Servico,
  Depto,
  CancelReason,
  getResponsaveis,
  Responsavel,
} from '@/services/contacts'

interface ContactModalProps {
  contact: Contact | null
  mode: 'view' | 'edit' | 'create'
  isOpen: boolean
  onClose: () => void
  onSave: (payload: Partial<Contact>, id?: string, prevStage?: string) => Promise<void>
  servicos: Servico[]
  deptos: Depto[]
  cancelReasons: CancelReason[]
}

export function ContactModal({
  contact,
  mode,
  isOpen,
  onClose,
  onSave,
  servicos,
  deptos,
  cancelReasons,
}: ContactModalProps) {
  const [updateForm, setUpdateForm] = useState<Partial<Contact>>({})
  const [saving, setSaving] = useState(false)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const { toast } = useToast()

  const isView = mode === 'view'
  const isCreate = mode === 'create'

  useEffect(() => {
    getResponsaveis().then(setResponsaveis).catch(console.error)
  }, [])

  useEffect(() => {
    if (isOpen) {
      if (isCreate) {
        setUpdateForm({
          nome: '',
          lead_nome: '',
          telefone: '',
          lead_empresa_pf: '',
          lead_email: '',
          servico_id: '',
          depto_id: null,
          lead_servico: '',
          lead_resumo: '',
          current_stage: 'nivel_1_novo',
          sla_status: 'green',
          cancel_reason_id: '',
          cancel_obs: '',
          origem: 'Whatsapp',
          responsavel_id: '',
          orcamento: '',
          valor: null,
          observacoes: '',
          data_follow_up: null,
        })
      } else if (contact) {
        setUpdateForm({
          nome: contact.nome || contact.lead_nome || '',
          lead_nome: contact.lead_nome || contact.nome || '',
          telefone: contact.telefone || contact.whatsapp_phone || '',
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
          origem: contact.origem || '',
          responsavel_id: contact.responsavel_id || '',
          orcamento: contact.orcamento || '',
          valor: contact.valor ?? null,
          observacoes: contact.observacoes || '',
          data_follow_up: contact.data_follow_up || null,
        })
      }
    }
  }, [contact, isOpen, isCreate])

  useEffect(() => {
    if (isOpen && isCreate && responsaveis.length > 0 && !updateForm.responsavel_id) {
      const anaEdith = responsaveis.find((r) => r.nome.toLowerCase().includes('ana edith'))
      if (anaEdith) {
        setUpdateForm((prev) => ({ ...prev, responsavel_id: anaEdith.id }))
      } else {
        console.warn('Usuário "Ana Edith" não encontrado para seleção padrão.')
      }
    }
  }, [isOpen, isCreate, responsaveis])

  const handleSave = async () => {
    if (!updateForm.lead_nome?.trim()) {
      toast({
        title: 'Atenção',
        description: 'O campo Nome é obrigatório.',
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

      if (payload.responsavel_id === '') payload.responsavel_id = null
      if (payload.origem === '') payload.origem = null
      if (payload.orcamento === '') payload.orcamento = null
      if (payload.servico_id === '') payload.servico_id = null

      await onSave(payload, contact?.id, contact?.current_stage)
    } finally {
      setSaving(false)
    }
  }

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    if (!rawValue) {
      setUpdateForm({ ...updateForm, valor: null })
      return
    }
    const floatValue = parseInt(rawValue, 10) / 100
    setUpdateForm({ ...updateForm, valor: floatValue })
  }

  const formatDateSafe = (dateString?: string | null) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm')
    } catch (e) {
      return '-'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <DialogTitle className="text-xl">
            {isCreate ? 'Criar Novo Contato' : isView ? 'Visualizar Contato' : 'Atualizar Contato'}
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Origem</Label>
              <Select
                value={updateForm.origem || ''}
                onValueChange={(val) => setUpdateForm({ ...updateForm, origem: val })}
                disabled={isView}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agente">Agente</SelectItem>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Whatsapp">Whatsapp</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Data Entrada</Label>
              <Input
                value={isCreate ? 'Agora' : formatDateSafe(contact?.created_at)}
                disabled
                className="bg-slate-50 dark:bg-zinc-800"
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Responsável</Label>
              <Select
                value={updateForm.responsavel_id || ''}
                onValueChange={(val) => setUpdateForm({ ...updateForm, responsavel_id: val })}
                disabled={isView}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">
                Nome <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={updateForm.lead_nome || ''}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, lead_nome: e.target.value, nome: e.target.value })
                }
                placeholder="Nome completo"
                disabled={isView}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Empresa / PF</Label>
              <Input
                value={updateForm.lead_empresa_pf || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, lead_empresa_pf: e.target.value })}
                placeholder="Empresa ou PF"
                disabled={isView}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">E-mail</Label>
              <Input
                type="email"
                value={updateForm.lead_email || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, lead_email: e.target.value })}
                placeholder="email@exemplo.com"
                disabled={isView}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Telefone</Label>
              <Input
                value={updateForm.telefone || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                disabled={isView}
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3 space-y-2">
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
                  <SelectValue placeholder="Serviço..." />
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
            <div className="md:col-span-3 space-y-2">
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
                  <SelectValue placeholder="Depto..." />
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
            <div className="md:col-span-3 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Orçamento</Label>
              <Select
                value={updateForm.orcamento || ''}
                onValueChange={(val) => setUpdateForm({ ...updateForm, orcamento: val })}
                disabled={isView}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tabela">Tabela</SelectItem>
                  <SelectItem value="Personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Valor</Label>
              <Input
                value={
                  updateForm.valor != null
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        updateForm.valor,
                      )
                    : ''
                }
                onChange={handleValorChange}
                disabled={isView}
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 space-y-2">
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
            <div className="md:col-span-6 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Observações</Label>
              <Textarea
                value={updateForm.observacoes || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, observacoes: e.target.value })}
                placeholder="Anotações adicionais..."
                className="resize-none"
                rows={4}
                disabled={isView}
              />
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div className="md:col-span-4 space-y-2">
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
            <div className="md:col-span-4 space-y-2">
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
            <div className="md:col-span-4 space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Data Follow Up</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'h-10 w-full justify-start text-left font-normal',
                      !updateForm.data_follow_up && 'text-slate-500',
                      isView && 'opacity-50 cursor-not-allowed',
                    )}
                    disabled={isView}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {updateForm.data_follow_up ? (
                      format(new Date(updateForm.data_follow_up), 'dd/MM/yyyy')
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      updateForm.data_follow_up ? new Date(updateForm.data_follow_up) : undefined
                    }
                    onSelect={(date) =>
                      setUpdateForm({
                        ...updateForm,
                        data_follow_up: date ? date.toISOString() : null,
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                  <SelectTrigger className="h-10 border-rose-200 focus:ring-rose-500/20">
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
                  placeholder="Observações..."
                  className="resize-none"
                  rows={3}
                  disabled={isView}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="p-6 pt-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
          <Button variant="outline" onClick={onClose} className="h-10">
            {isView ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isView && (
            <Button onClick={handleSave} disabled={saving} className="h-10 px-8">
              {saving ? 'Salvando...' : isCreate ? 'Criar Contato' : 'Salvar Alterações'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
