import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Contact } from '@/services/contacts'

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact | null
  mode: 'view' | 'edit'
}

export function ContactModal({ open, onOpenChange, contact, mode }: ContactModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'view' ? 'Visualizar' : 'Editar'} Contato</DialogTitle>
        </DialogHeader>
        <div className="py-6 flex flex-col gap-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {mode === 'view' ? 'Visualizando' : 'Editando'} dados de{' '}
            <strong className="text-foreground">
              {contact?.nome || contact?.lead_nome || contact?.first_name || 'Contato Sem Nome'}
            </strong>
          </div>

          <div className="grid gap-3 border rounded-lg p-4 bg-slate-50 dark:bg-zinc-900/50">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Telefone
              </span>
              <p className="text-sm font-medium">
                {contact?.whatsapp_phone || contact?.telefone || 'Não informado'}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Serviço</span>
              <p className="text-sm font-medium">{contact?.lead_servico || 'Não informado'}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Empresa / PF
              </span>
              <p className="text-sm font-medium">{contact?.lead_empresa_pf || 'Não informado'}</p>
            </div>
            {contact?.lead_resumo && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Resumo
                </span>
                <p className="text-sm mt-1 text-slate-700 dark:text-slate-300">
                  {contact.lead_resumo}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
