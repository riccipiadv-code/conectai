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
  Subservico,
  getContatoSubservicos,
  PorteEmpresa,
} from '@/services/contacts'
import { Checkbox } from '@/components/ui/checkbox'
import { OFFICIAL_STAGES } from '@/constants/stages'
import { useAuth } from '@/hooks/use-auth'
import { canEditContact } from '@/services/contacts'
import { useToast } from '@/hooks/use-toast'

export interface ContactModalProps {
  contact: Contact | null
  mode: 'view' | 'edit' | 'create'
  isOpen: boolean
  onClose: () => void
  onSave: (
    payload: Partial<Contact>,
    id?: string,
    prevStage?: string,
    subservicoIds?: number[],
  ) => Promise<void>
  servicos: Servico[]
  deptos: Depto[]
  cancelReasons: CancelReason[]
  origens?: Origem[]
  subservicos?: Subservico[]
  portesEmpresa?: PorteEmpresa[]
  responsaveis?: Responsavel[]
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
  subservicos = [],
  portesEmpresa = [],
  responsaveis: initialResponsaveis,
}: ContactModalProps) {
  const { profile, managedCoreUserIds, managedUserIds } = useAuth()
  const { toast } = useToast()
  const activeTeamIds =
    managedCoreUserIds && managedCoreUserIds.length > 0 ? managedCoreUserIds : managedUserIds
  const [formData, setFormData] = useState<Partial<Contact>>({})
  const [selectedSubservicos, setSelectedSubservicos] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>(initialResponsaveis || [])
  const [validationErrors, setValidationErrors] = useState<{
    lead_nome?: boolean
    origem_id?: boolean
    servico_id?: boolean
    depto_id?: boolean
    current_stage?: boolean
  }>({})

  useEffect(() => {
    if (!initialResponsaveis || initialResponsaveis.length === 0) {
      getResponsaveis().then(setResponsaveis).catch(console.error)
    } else {
      setResponsaveis(initialResponsaveis)
    }
  }, [initialResponsaveis])

  useEffect(() => {
    if (isOpen) {
      setValidationErrors({})
      if (contact && mode !== 'create') {
        setFormData({
          ...contact,
          lead_nome: contact.lead_nome || contact.nome || contact.first_name || '',
          telefone: contact.telefone || contact.whatsapp_phone || '',
        })
        getContatoSubservicos(contact.id)
          .then((ids) => {
            setSelectedSubservicos(ids)
          })
          .catch(console.error)
      } else {
        setSelectedSubservicos([])
        const whatsappOrigem = origens?.find((o) => o.nome === 'Whatsapp')
        setFormData({
          origem_id: whatsappOrigem ? whatsappOrigem.id : null,
          current_stage: 'nivel_1_novo',
          lead_nome: '',
          responsavel_id: null,
          responsavel_core_usuario_id: null,
          servico_id: null,
          depto_id: null,
          data_follow_up: null,
          cancel_reason_id: null,
          cancel_obs: null,
          valor: null,
          orcamento: null,
          porte_empresa_id: null,
          porte_empresa: null,
          lead_empresa_pf: '',
          lead_email: '',
          telefone: '',
          lead_resumo: '',
          observacoes: '',
          created_at: new Date().toISOString(),
        })
      }
    }
  }, [isOpen, contact, mode, origens])

  const handleChange = (field: keyof Contact, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors((prev) => ({ ...prev, [field]: false }))
    }
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
    if (mode === 'edit' && contact) {
      if (!canEditContact(contact, profile, activeTeamIds)) {
        return
      }
    }

    if (mode === 'create') {
      const errors: {
        lead_nome?: boolean
        origem_id?: boolean
        servico_id?: boolean
        depto_id?: boolean
        current_stage?: boolean
      } = {}

      const cleanNome = (formData.lead_nome || '').trim()
      if (!cleanNome) {
        errors.lead_nome = true
      }

      const rawOrigem = formData.origem_id as any
      if (
        rawOrigem == null ||
        rawOrigem === '' ||
        rawOrigem === 'none' ||
        isNaN(Number(rawOrigem)) ||
        Number(rawOrigem) <= 0
      ) {
        errors.origem_id = true
      }

      const rawServico = formData.servico_id as any
      if (
        !rawServico ||
        rawServico === 'none' ||
        typeof rawServico !== 'string' ||
        !rawServico.trim()
      ) {
        errors.servico_id = true
      }

      const rawDepto = formData.depto_id as any
      if (
        rawDepto == null ||
        rawDepto === '' ||
        rawDepto === 'none' ||
        isNaN(Number(rawDepto)) ||
        Number(rawDepto) <= 0
      ) {
        errors.depto_id = true
      }

      const rawStage = (formData.current_stage || '').trim()
      const isStageValid = OFFICIAL_STAGES.some((s) => s.id === rawStage)
      if (!rawStage || !isStageValid) {
        errors.current_stage = true
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        toast({
          title: 'Campos obrigatórios ausentes',
          description: 'Preencha os campos obrigatórios antes de salvar.',
          variant: 'destructive',
        })
        return
      }
    }

    setLoading(true)
    try {
      const payload = { ...formData }
      if (mode === 'create') {
        payload.lead_nome = (payload.lead_nome || '').trim()
        payload.nome = payload.lead_nome
      }
      if (payload.current_stage !== 'cancelado') {
        payload.cancel_reason_id = null
        payload.cancel_obs = null
      }
      if (payload.responsavel_id === '') payload.responsavel_id = null
      if (payload.responsavel_core_usuario_id === '') payload.responsavel_core_usuario_id = null
      if ((payload.origem_id as any) === '') payload.origem_id = null
      if ((payload.origem_id as any) === 'none') payload.origem_id = null
      if (payload.origem_id != null) payload.origem_id = Number(payload.origem_id)
      if (payload.orcamento === '') payload.orcamento = null
      if (payload.orcamento === 'none') payload.orcamento = null
      if (payload.servico_id === '') payload.servico_id = null
      if (payload.servico_id === 'none') payload.servico_id = null
      if ((payload.depto_id as any) === '') payload.depto_id = null
      if ((payload.depto_id as any) === 'none') payload.depto_id = null
      if (!payload.created_at) delete payload.created_at
      delete payload.sla_status
      await onSave(
        payload,
        mode === 'create' ? undefined : contact?.id,
        contact?.current_stage,
        selectedSubservicos,
      )
    } finally {
      setLoading(false)
    }
  }

  const isView = mode === 'view'
  const isCancelado = formData.current_stage === 'cancelado'
  const isOperacional = profile?.perfil === 'operacional'
  const isGestor = profile?.perfil === 'gestor'
  const isResponsavelDisabled = isView || isOperacional || isGestor

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
          {/* Row 1: Origem, Nº Cliente, Data Entrada, Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label className={cn(validationErrors.origem_id && 'text-destructive')}>
                Origem {mode === 'create' && <span className="text-destructive">*</span>}
              </Label>
              <Select
                disabled={isView}
                value={formData.origem_id != null ? String(formData.origem_id) : 'none'}
                onValueChange={(val) =>
                  handleChange('origem_id', val === 'none' ? null : Number(val))
                }
              >
                <SelectTrigger
                  className={cn(
                    validationErrors.origem_id &&
                      'border-destructive ring-1 ring-destructive focus:ring-destructive',
                  )}
                >
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
              {validationErrors.origem_id && (
                <span className="text-xs text-destructive">Selecione uma origem válida.</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Nº Cliente</Label>
              <Input
                type="number"
                value={formData.numero_cliente != null ? String(formData.numero_cliente) : ''}
                onChange={(e) => {
                  const val = e.target.value
                  handleChange('numero_cliente', val === '' ? null : Number(val))
                }}
                disabled={isView}
                placeholder="Nº do cliente"
              />
            </div>
            <div className="grid gap-2">
              <Label>Data Entrada</Label>
              <Input
                type="datetime-local"
                value={
                  formData.created_at
                    ? format(new Date(formData.created_at), "yyyy-MM-dd'T'HH:mm")
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value
                  handleChange('created_at', val ? new Date(val).toISOString() : null)
                }}
                disabled={isView}
                className={cn(isView && 'bg-slate-50 dark:bg-zinc-900')}
              />
            </div>
            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select
                disabled={isResponsavelDisabled}
                value={
                  formData.responsavel_core_usuario_id ||
                  formData.responsavel_id ||
                  formData.responsible_user_id ||
                  'none'
                }
                onValueChange={(val) => {
                  if (val === 'none') {
                    setFormData((prev) => ({
                      ...prev,
                      responsavel_core_usuario_id: null,
                      responsavel_id: null,
                    }))
                  } else {
                    const selectedResp = responsaveis?.find(
                      (r) =>
                        r.id === val || r.core_usuario_id === val || r.legaldesk_usuario_id === val,
                    )
                    const centralId = selectedResp?.core_usuario_id || selectedResp?.id || val
                    const legacyId =
                      selectedResp?.legaldesk_usuario_id ||
                      (selectedResp?.id !== centralId ? selectedResp?.id : null)

                    setFormData((prev) => ({
                      ...prev,
                      responsavel_core_usuario_id: centralId,
                      // Preserva responsavel_id em paralelo se mapeado
                      ...(legacyId ? { responsavel_id: legacyId } : {}),
                    }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {responsaveis?.map((r) => {
                    const selectKey = r.core_usuario_id || r.id
                    return (
                      <SelectItem key={selectKey} value={selectKey}>
                        {r.nome}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Nome, Empresa / PF, E-mail, Telefone */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label className={cn(validationErrors.lead_nome && 'text-destructive')}>
                Nome do Contato {mode === 'create' && <span className="text-destructive">*</span>}
              </Label>
              <Input
                value={formData.lead_nome || ''}
                onChange={(e) => handleChange('lead_nome', e.target.value)}
                disabled={isView}
                placeholder="Nome completo do contato"
                className={cn(
                  validationErrors.lead_nome &&
                    'border-destructive ring-1 ring-destructive focus-visible:ring-destructive',
                )}
              />
              {validationErrors.lead_nome && (
                <span className="text-xs text-destructive">O nome do contato é obrigatório.</span>
              )}
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
              <Label className={cn(validationErrors.servico_id && 'text-destructive')}>
                Serviço Selecionado{' '}
                {mode === 'create' && <span className="text-destructive">*</span>}
              </Label>
              <Select
                disabled={isView}
                value={formData.servico_id || 'none'}
                onValueChange={(val) => {
                  const newServicoId = val === 'none' ? null : val
                  setFormData((prev) => {
                    const next = { ...prev, servico_id: newServicoId }
                    if (newServicoId) {
                      const selectedService = servicos?.find((s) => s.id === newServicoId)
                      if (selectedService && selectedService.depto_id != null) {
                        next.depto_id = selectedService.depto_id
                      }
                    }
                    return next
                  })
                  if (newServicoId) {
                    setValidationErrors((prev) => {
                      const selectedService = servicos?.find((s) => s.id === newServicoId)
                      return {
                        ...prev,
                        servico_id: false,
                        ...(selectedService && selectedService.depto_id != null
                          ? { depto_id: false }
                          : {}),
                      }
                    })
                  }
                }}
              >
                <SelectTrigger
                  className={cn(
                    validationErrors.servico_id &&
                      'border-destructive ring-1 ring-destructive focus:ring-destructive',
                  )}
                >
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
              {validationErrors.servico_id && (
                <span className="text-xs text-destructive">Selecione um serviço.</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label className={cn(validationErrors.depto_id && 'text-destructive')}>
                Departamento {mode === 'create' && <span className="text-destructive">*</span>}
              </Label>
              <Select
                disabled={isView}
                value={formData.depto_id != null ? String(formData.depto_id) : 'none'}
                onValueChange={(val) =>
                  handleChange('depto_id', val === 'none' ? null : Number(val))
                }
              >
                <SelectTrigger
                  className={cn(
                    validationErrors.depto_id &&
                      'border-destructive ring-1 ring-destructive focus:ring-destructive',
                  )}
                >
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
              {validationErrors.depto_id && (
                <span className="text-xs text-destructive">Selecione um departamento.</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Porte Empresa</Label>
              <Select
                disabled={isView}
                value={
                  formData.porte_empresa_id != null ? String(formData.porte_empresa_id) : 'none'
                }
                onValueChange={(val) => {
                  if (val === 'none') {
                    handleChange('porte_empresa_id', null)
                    handleChange('porte_empresa', null)
                  } else {
                    const selected = portesEmpresa?.find((p) => p.id === Number(val))
                    handleChange('porte_empresa_id', Number(val))
                    handleChange('porte_empresa', selected?.nome || null)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {portesEmpresa?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {profile?.perfil === 'administrador' && (
              <div className="grid gap-2">
                <Label>Valor Faturado</Label>
                <Input
                  value={formatCurrency(formData.valor)}
                  onChange={handleValorChange}
                  disabled={isView}
                  placeholder="R$ 0,00"
                />
              </div>
            )}
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

          {/* Row 5: Status, Data Follow Up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className={cn(validationErrors.current_stage && 'text-destructive')}>
                Status {mode === 'create' && <span className="text-destructive">*</span>}
              </Label>
              <Select
                disabled={isView}
                value={formData.current_stage || 'none'}
                onValueChange={(val) => handleChange('current_stage', val === 'none' ? null : val)}
              >
                <SelectTrigger
                  className={cn(
                    validationErrors.current_stage &&
                      'border-destructive ring-1 ring-destructive focus:ring-destructive',
                  )}
                >
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
              {validationErrors.current_stage && (
                <span className="text-xs text-destructive">Selecione um status válido.</span>
              )}
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
                <Label className="text-rose-600 dark:text-rose-400">Motivo do Encerramento</Label>
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
                  Observação do Encerramento
                </Label>
                <Textarea
                  className="min-h-[80px] border-rose-200 dark:border-rose-900"
                  value={formData.cancel_obs || ''}
                  onChange={(e) => handleChange('cancel_obs', e.target.value)}
                  disabled={isView}
                  placeholder="Detalhes e justificativas do encerramento..."
                />
              </div>
            </div>
          )}

          {/* Row 6 / Final: Serviços Contratados */}
          <div className="grid grid-cols-1 gap-4">
            <div className="grid gap-2">
              <Label>Serviços Contratados</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 border rounded-md p-4 bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800">
                {subservicos?.length > 0 ? (
                  subservicos.map((sub) => (
                    <div key={sub.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`sub-${sub.id}`}
                        disabled={isView}
                        checked={selectedSubservicos.includes(sub.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSubservicos((prev) => [...prev, sub.id])
                          } else {
                            setSelectedSubservicos((prev) => prev.filter((id) => id !== sub.id))
                          }
                        }}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={`sub-${sub.id}`}
                        className={cn(
                          'text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 dark:text-slate-300',
                          isView && 'cursor-default',
                        )}
                      >
                        {sub.nome}
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground col-span-full">
                    Nenhum serviço contratado disponível.
                  </div>
                )}
              </div>
            </div>
          </div>
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
