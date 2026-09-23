import { useDroppable } from '@dnd-kit/core'
import { Contact, Depto } from '@/services/contacts'
import { KanbanCard } from './kanban-card'

interface Stage {
  id: string
  label: string
  matches?: (stage: string | null | undefined) => boolean
}

interface KanbanColumnProps {
  stage: Stage
  contacts: Contact[]
  deptos: Depto[]
  onMoveContact: (contactId: string, targetStageId: string) => void
  onEdit: (contact: Contact) => void
  onView: (contact: Contact) => void
}

export function KanbanColumn({
  stage,
  contacts,
  deptos,
  onMoveContact,
  onEdit,
  onView,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] w-[280px] md:min-w-[300px] md:w-[300px] max-h-full bg-slate-100 dark:bg-zinc-900/40 rounded-xl p-3 border transition-colors ${isOver ? 'bg-slate-200/60 dark:bg-zinc-800/60 border-primary/50' : 'border-slate-200/60 dark:border-zinc-800'}`}
    >
      <div className="flex justify-between items-center mb-3 px-1 shrink-0">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-tight">
          {stage.label}
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold">
            {contacts.length}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto flex-1 pb-2 pr-1 custom-scrollbar">
        {contacts.map((c) => (
          <KanbanCard key={c.id} contact={c} deptos={deptos} onEdit={onEdit} onView={onView} />
        ))}
      </div>
    </div>
  )
}
