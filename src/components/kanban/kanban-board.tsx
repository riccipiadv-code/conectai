import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
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
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const contactId = String(active.id)
    const targetStageId = String(over.id)
    const currentStageId = String(active.data.current?.stageId)

    if (currentStageId === targetStageId) return

    onMoveContact(contactId, targetStageId)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-6 pt-2 items-start custom-scrollbar flex-1 w-full h-full">
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
    </DndContext>
  )
}
