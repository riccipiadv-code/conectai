import { useEffect, useState } from 'react'
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
import { Contact, Servico, Depto, CancelReason } from '@/services/contacts'

interface ContactModalProps {
  contact: Contact | null
  mode: 'view' | 'edit'
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, payload: Partial<Contact>, prevStage: string) => Promise<void>
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

  useEffect(() => {
    if (contact && isOpen) {
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
  }, [contact, isOpen])

  const handleSave = async () => {
    if (!contact) return
    setSaving(true)
    try {
      const payload = { ...updateForm }
      if (payload.current_stage !== 'cancelado') {
        payload.cancel_reason_id = null
        payload.cancel_obs = null
      }
      await onSave(contact.id, payload, contact.current_stage || 'nivel_1_novo')
    } finally {
      setSaving(false)
    }
  }

  const isView = mode === 'view'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
                  setUpdateForm({ ...updateForm, lead_nome: e.target.value, nome: e.target.value })
                }
                placeholder="Nome"
                disabled={isView}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-slate-400">Empresa / PF</Label>
              <Input
                value={updateForm.lead_empresa_pf || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, lead_empresa_pf: e.target.value })}
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
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
