import { Contact, Depto } from '@/services/contacts'
import { KanbanCard } from './kanban-card'

interface Stage {
  id: string
  label: string
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
  const expiredCount = contacts.filter((c) => c.sla_status === 'red').length

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-slate-200/60', 'dark:bg-zinc-800/60')
    const contactId = e.dataTransfer.getData('text/plain')
    if (contactId) {
      onMoveContact(contactId, stage.id)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-slate-200/60', 'dark:bg-zinc-800/60')
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      e.currentTarget.classList.remove('bg-slate-200/60', 'dark:bg-zinc-800/60')
    }
  }

  return (
    <div
      className="flex flex-col min-w-[320px] w-[320px] bg-slate-100 dark:bg-zinc-900/40 rounded-xl p-3 border border-slate-200/60 dark:border-zinc-800 transition-colors"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-tight">
          {stage.label}
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          {expiredCount > 0 && (
            <span className="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 px-2 py-0.5 rounded-full font-semibold border border-rose-200 dark:border-rose-500/30">
              {expiredCount} exp
            </span>
          )}
          <span className="bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold">
            {contacts.length}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-220px)] pb-2 pr-1 custom-scrollbar">
        {contacts.map((c) => (
          <KanbanCard key={c.id} contact={c} deptos={deptos} onEdit={onEdit} onView={onView} />
        ))}
      </div>
    </div>
  )
}
