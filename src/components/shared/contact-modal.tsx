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
import { Contact, Servico, Depto, CancelReason, Responsavel } from '@/services/contacts'

export interface ContactModalProps {
  contact: Contact | null
  mode: 'view' | 'edit' | 'create'
  isOpen: boolean
  onClose: () => void
  onSave: (payload: Partial<Contact>, id?: string, prevStage?: string) => Promise<void>
  servicos: Servico[]
  deptos: Depto[]
  cancelReasons: CancelReason[]
  responsaveis: Responsavel[]
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
  responsaveis = [],
}: ContactModalProps) {
  const [formData, setFormData] = useState<Partial<Contact>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (contact && mode !== 'create') {
        setFormData({ ...contact })
      } else {
        setFormData({
          nome: '',
          responsavel_id: '',
          servico_id: '',
          depto_id: null,
          data_follow_up: '',
          cancel_reason_id: '',
          cancel_obs: '',
          valor: null,
          orcamento: '',
        })
      }
    }
  }, [isOpen, contact, mode])

  const handleChange = (field: keyof Contact, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onSave(formData, mode === 'create' ? undefined : contact?.id, contact?.current_stage)
    } finally {
      setLoading(false)
    }
  }

  const isView = mode === 'view'
  const isCancelado = formData.current_stage === 'cancelado'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' ? 'Visualizar' : mode === 'edit' ? 'Editar' : 'Novo'} Contato
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Nome do Contato</Label>
              <Input
                value={formData.nome || formData.lead_nome || formData.first_name || ''}
                onChange={(e) => handleChange('nome', e.target.value)}
                disabled={isView}
              />
            </div>
            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select
                disabled={isView}
                value={formData.responsavel_id || 'none'}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Serviço</Label>
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
                value={formData.depto_id ? String(formData.depto_id) : 'none'}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data de Follow-up</Label>
              <Input
                type="date"
                value={formData.data_follow_up ? formData.data_follow_up.split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value).toISOString() : null
                  handleChange('data_follow_up', date)
                }}
                disabled={isView}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valor / Orçamento</Label>
              <Input
                type="number"
                value={formData.valor || ''}
                onChange={(e) =>
                  handleChange('valor', e.target.value ? Number(e.target.value) : null)
                }
                disabled={isView}
              />
            </div>
          </div>

          {isCancelado && (
            <div className="grid gap-4 p-4 border rounded-md bg-red-50/50 dark:bg-red-950/20">
              <div className="grid gap-2">
                <Label className="text-red-600 dark:text-red-400">Motivo do Cancelamento</Label>
                <Select
                  disabled={isView}
                  value={formData.cancel_reason_id || 'none'}
                  onValueChange={(val) =>
                    handleChange('cancel_reason_id', val === 'none' ? null : val)
                  }
                >
                  <SelectTrigger>
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
                <Label className="text-red-600 dark:text-red-400">
                  Observações de Cancelamento
                </Label>
                <Textarea
                  value={formData.cancel_obs || ''}
                  onChange={(e) => handleChange('cancel_obs', e.target.value)}
                  disabled={isView}
                  placeholder="Detalhes..."
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
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
