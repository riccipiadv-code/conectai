import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  Contact,
  Servico,
  Depto,
  CancelReason,
  getResponsaveis,
  Responsavel,
  Origem,
} from '@/services/contacts'
import { OFFICIAL_STAGES } from '@/constants/stages'

export interface ContactModalProps {
  contact: Contact | null
  mode: 'view' | 'edit' | 'create'
  isOpen: boolean
  onClose: () => void
  onSave: (payload: Partial<Contact>, id?: string, prevStage?: string) => Promise<void>
  servicos: Servico[]
  deptos: Depto[]
  cancelReasons: CancelReason[]
  origens: Origem[]
}

export function ContactModal({
  contact,
  mode,
  isOpen,
  onClose,
  onSave,
  servicos = [],
  deptos = [],
  cancelReasons = [],
  origens = [],
}: ContactModalProps) {
  const [formData, setFormData] = useState<Partial<Contact>>({})
  const [loading, setLoading] = useState(false)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])

  useEffect(() => {
    getResponsaveis().then(setResponsaveis).catch(console.error)
  }, [])

  useEffect(() => {
    if (isOpen) {
      if (contact && mode !== 'create') {
        setFormData({
          ...contact,
          nome: contact.nome || contact.lead_nome || contact.first_name || '',
          lead_nome: contact.lead_nome || contact.nome || contact.first_name || '',
          telefone: contact.telefone || contact.whatsapp_phone || '',
        })
      } else {
        const whatsappOrigem = origens?.find((o) => o.nome === 'Whatsapp')
        setFormData({
          origem_id: whatsappOrigem ? whatsappOrigem.id : null,
          current_stage: 'nivel_1_novo',
          sla_status: 'green',
          nome: '',
          responsavel_id: null,
          servico_id: null,
          depto_id: null,
          data_follow_up: null,
          cancel_reason_id: null,
          cancel_obs: null,
          valor: null,
          orcamento: null,
          lead_empresa_pf: '',
          lead_email: '',
          telefone: '',
          lead_resumo: '',
          observacoes: '',
        })
      }
    }
  }, [isOpen, contact, mode])

  const handleChange = (field: keyof Contact, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return ''
    const num = typeof value === 'string' ? Number(value) : value
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const numbers = value.replace(/\D/g, '')
    if (!numbers) {
      handleChange('valor', null)
      return
    }
    const numericValue = parseInt(numbers, 10) / 100
    handleChange('valor', numericValue)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = { ...formData }
      if (payload.current_stage !== 'cancelado') {
        payload.cancel_reason_id = null
        payload.cancel_obs = null
      }
      if (payload.responsavel_id === '') payload.responsavel_id = null
      if ((payload.origem_id as any) === '') payload.origem_id = null
      if ((payload.origem_id as any) === 'none') payload.origem_id = null
      if (payload.origem_id != null) payload.origem_id = Number(payload.origem_id)
      if (payload.orcamento === '') payload.orcamento = null
      if (payload.orcamento === 'none') payload.orcamento = null
      if (payload.servico_id === '') payload.servico_id = null
      if (payload.servico_id === 'none') payload.servico_id = null
      if ((payload.depto_id as any) === '') payload.depto_id = null
      if ((payload.depto_id as any) === 'none') payload.depto_id = null
      await onSave(payload, mode === 'create' ? undefined : contact?.id, contact?.current_stage)
    } finally {
      setLoading(false)
    }
  }

  const isView = mode === 'view'
  const isCancelado = formData.current_stage === 'cancelado'

  const title =
    mode === 'create'
      ? 'Criar Novo Contato'
      : mode === 'edit'
        ? 'Atualizar Contato'
        : 'Visualizar Contato'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[980px] w-full">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4 max-h-[78vh] overflow-y-auto px-1 custom-scrollbar">
          {/* Row 1: Origem, Data Entrada, Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Origem</Label>
              <Select
                disabled={isView}
                value={formData.origem_id != null ? String(formData.origem_id) : 'none'}
                onValueChange={(val) =>
                  handleChange('origem_id', val === 'none' ? null : Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {origens?.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Data Entrada</Label>
              <Input
                value={
                  formData.created_at
                    ? format(new Date(formData.created_at), 'dd/MM/yyyy HH:mm')
                    : ''
                }
                disabled
                className="bg-slate-50 dark:bg-zinc-900"
                placeholder={mode === 'create' ? 'Gerada automaticamente' : ''}
              />
            </div>
            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select
                disabled={isView}
                value={formData.responsavel_id || formData.responsible_user_id || 'none'}
                onValueChange={(val) => handleChange('responsavel_id', val === 'none' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {responsaveis?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Nome, Empresa / PF, E-mail, Telefone */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label>Nome do Contato</Label>
              <Input
                value={formData.nome || formData.lead_nome || formData.first_name || ''}
                onChange={(e) => handleChange('nome', e.target.value)}
                disabled={isView}
              />
            </div>
            <div className="grid gap-2">
              <Label>Empresa / PF</Label>
              <Input
                value={formData.lead_empresa_pf || ''}
                onChange={(e) => handleChange('lead_empresa_pf', e.target.value)}
                disabled={isView}
              />
            </div>
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={formData.lead_email || ''}
                onChange={(e) => handleChange('lead_email', e.target.value)}
                disabled={isView}
              />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input
                value={formData.telefone || formData.whatsapp_phone || ''}
                onChange={(e) => handleChange('telefone', e.target.value)}
                disabled={isView}
              />
            </div>
          </div>

          {/* Row 3: Serviço Selecionado, Departamento, Orçamento, Valor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label>Serviço Selecionado</Label>
              <Select
                disabled={isView}
                value={formData.servico_id || 'none'}
                onValueChange={(val) => handleChange('servico_id', val === 'none' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {servicos?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Departamento</Label>
              <Select
                disabled={isView}
                value={formData.depto_id != null ? String(formData.depto_id) : 'none'}
                onValueChange={(val) =>
                  handleChange('depto_id', val === 'none' ? null : Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {deptos?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Orçamento</Label>
              <Select
                disabled={isView}
                value={formData.orcamento || 'none'}
                onValueChange={(val) => handleChange('orcamento', val === 'none' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="Tabela">Tabela</SelectItem>
                  <SelectItem value="Personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Valor</Label>
              <Input
                value={formatCurrency(formData.valor)}
                onChange={handleValorChange}
                disabled={isView}
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          {/* Row 4: Resumo da Solicitação, Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Resumo da Solicitação</Label>
              <Textarea
                className="min-h-[120px] w-full"
                value={formData.lead_resumo || ''}
                onChange={(e) => handleChange('lead_resumo', e.target.value)}
                disabled={isView}
                placeholder="Detalhes da solicitação..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea
                className="min-h-[120px] w-full"
                value={formData.observacoes || ''}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                disabled={isView}
                placeholder="Anotações internas sobre o atendimento..."
              />
            </div>
          </div>

          <div className="h-px w-full bg-slate-200 dark:bg-zinc-800 my-2" />

          {/* Row 5: Estágio, SLA Status, Data Follow Up */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Estágio</Label>
              <Select
                disabled={isView}
                value={formData.current_stage || 'nivel_1_novo'}
                onValueChange={(val) => handleChange('current_stage', val === 'none' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {OFFICIAL_STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>SLA Status</Label>
              <Select
                disabled={isView}
                value={formData.sla_status || 'green'}
                onValueChange={(val) => handleChange('sla_status', val === 'none' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="green">No Prazo</SelectItem>
                  <SelectItem value="yellow">Atenção</SelectItem>
                  <SelectItem value="red">Atrasado</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="done">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Data Follow Up</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isView}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.data_follow_up && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_follow_up ? (
                      format(new Date(formData.data_follow_up), 'PPP', { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.data_follow_up ? new Date(formData.data_follow_up) : undefined
                    }
                    onSelect={(date) =>
                      handleChange('data_follow_up', date ? date.toISOString() : null)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Cancellation Section */}
          {isCancelado && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50">
              <div className="grid gap-2">
                <Label className="text-rose-600 dark:text-rose-400">Motivo do Cancelamento</Label>
                <Select
                  disabled={isView}
                  value={formData.cancel_reason_id || 'none'}
                  onValueChange={(val) =>
                    handleChange('cancel_reason_id', val === 'none' ? null : val)
                  }
                >
                  <SelectTrigger className="border-rose-200 dark:border-rose-900">
                    <SelectValue placeholder="Selecione o motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {cancelReasons?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.motivo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-rose-600 dark:text-rose-400">
                  Observação do Cancelamento
                </Label>
                <Textarea
                  className="min-h-[80px] border-rose-200 dark:border-rose-900"
                  value={formData.cancel_obs || ''}
                  onChange={(e) => handleChange('cancel_obs', e.target.value)}
                  disabled={isView}
                  placeholder="Detalhes e justificativas do cancelamento..."
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isView ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isView && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : mode === 'create' ? 'Criar Contato' : 'Salvar Alterações'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
