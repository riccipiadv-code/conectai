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

const UI_STAGES = [
  {
    id: 'nivel_1_novo',
    dropStageId: 'nivel_1_novo',
    label: 'Nível 1 - Novo',
    matches: (stage: string | null | undefined) => !stage || stage === 'nivel_1_novo',
  },
  {
    id: 'nivel_2_especialista',
    dropStageId: 'nivel_2_especialista',
    label: 'Nível 2/3 - Especialista/Especial',
    matches: (stage: string | null | undefined) =>
      stage === 'nivel_2_especialista' || stage === 'nivel_3_especial',
  },
  {
    id: 'reuniao_consulta_agendada',
    dropStageId: 'reuniao_consulta_agendada',
    label: 'Reunião/Consulta Agendada',
    matches: (stage: string | null | undefined) => stage === 'reuniao_consulta_agendada',
  },
  {
    id: 'enviado_orcamento_ag_retorno',
    dropStageId: 'enviado_orcamento_ag_retorno',
    label: 'Enviado Orçamento / Aguardando Retorno',
    matches: (stage: string | null | undefined) => stage === 'enviado_orcamento_ag_retorno',
  },
  {
    id: 'orcamento_aprovado',
    dropStageId: 'orcamento_aprovado',
    label: 'Orçamento Aprovado',
    matches: (stage: string | null | undefined) => stage === 'orcamento_aprovado',
  },
  {
    id: 'cancelado',
    dropStageId: 'cancelado',
    label: 'Cancelado',
    matches: (stage: string | null | undefined) => stage === 'cancelado',
  },
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

    const targetUIColumn = UI_STAGES.find((s) => s.id === targetStageId)
    if (!targetUIColumn) return

    if (targetUIColumn.matches(currentStageId)) {
      return
    }

    if (currentStageId === targetStageId) return

    onMoveContact(contactId, targetUIColumn.dropStageId)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto overflow-y-hidden w-full h-full custom-scrollbar pb-4 flex-1">
        <div className="flex gap-4 min-w-max h-full pt-2 px-1 items-start">
          {UI_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deptos={deptos}
              contacts={contacts.filter((c) => stage.matches(c.current_stage))}
              onMoveContact={onMoveContact}
              onEdit={onEdit}
              onView={onView}
            />
          ))}
        </div>
      </div>
    </DndContext>
  )
}
