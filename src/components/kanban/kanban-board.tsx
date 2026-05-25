import { Contact, Depto } from '@/services/contacts'
import { KanbanColumn } from './kanban-column'

const STAGES = [
  { id: 'nivel_1_novo', label: 'Nível 1 - Novo' },
  { id: 'nivel_2_especialista', label: 'Nível 2 - Especialista' },
  { id: 'nivel_3_especial', label: 'Nível 3 - Especial' },
  { id: 'reuniao_consulta_agendada', label: 'Reunião/Consulta Agendada' },
  { id: 'enviado_orcamento_ag_retorno', label: 'Enviado Orçamento / Aguardando Retorno' },
  { id: 'orcamento_aprovado', label: 'Orçamento Aprovado' },
  { id: 'cancelado', label: 'Cancelado' },
]

interface KanbanBoardProps {
  contacts: Contact[]
  deptos: Depto[]
  onMoveContact: (id: string, stageId: string) => void
  onEdit: (contact: Contact) => void
  onView: (contact: Contact) => void
}

export function KanbanBoard({ contacts, deptos, onMoveContact, onEdit, onView }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 items-start custom-scrollbar flex-1 w-full h-full">
      {STAGES.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          deptos={deptos}
          contacts={contacts.filter(
            (c) =>
              c.current_stage === stage.id || (!c.current_stage && stage.id === 'nivel_1_novo'),
          )}
          onMoveContact={onMoveContact}
          onEdit={onEdit}
          onView={onView}
        />
      ))}
    </div>
  )
}
