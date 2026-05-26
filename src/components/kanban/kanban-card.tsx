import { useDraggable } from '@dnd-kit/core'
import { Contact, Depto } from '@/services/contacts'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit2, Clock } from 'lucide-react'

interface KanbanCardProps {
  contact: Contact
  deptos: Depto[]
  onEdit: (contact: Contact) => void
  onView: (contact: Contact) => void
}

export function KanbanCard({ contact, deptos, onEdit, onView }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact.id,
    data: {
      stageId: contact.current_stage || 'nivel_1_novo',
    },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const deptoName = deptos.find((d) => d.id === contact.depto_id)?.nome

  const slaColors: Record<string, string> = {
    green: 'border-l-emerald-500',
    yellow: 'border-l-amber-500',
    red: 'border-l-rose-500',
    paused: 'border-l-slate-400',
    done: 'border-l-blue-500',
  }

  const timeInStage = contact.last_stage_change_at
    ? formatDistanceToNow(new Date(contact.last_stage_change_at), {
        addSuffix: false,
        locale: ptBR,
      })
    : '-'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white dark:bg-zinc-950 p-3.5 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 border-l-4 hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2.5 relative',
        slaColors[contact.sla_status || 'green'] || slaColors.green,
        isDragging && 'opacity-80 z-50 shadow-xl',
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <div
          className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1"
          title={contact.lead_nome || contact.nome || 'Sem nome'}
        >
          {contact.lead_nome || contact.nome || 'Sem nome'}
        </div>
        <div className="flex gap-1 shrink-0 relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onView(contact)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors pointer-events-auto"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(contact)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-primary transition-colors pointer-events-auto"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 font-medium">
        {contact.manychat_servicos?.descricao || contact.lead_servico || 'Serviço não definido'}
      </div>

      <div className="flex flex-wrap gap-1 mt-1">
        {contact.current_stage === 'nivel_2_especialista' && (
          <Badge
            variant="default"
            className="text-[10px] px-1.5 py-0 font-semibold bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-400 border-none"
          >
            Nível 2
          </Badge>
        )}
        {contact.current_stage === 'nivel_3_especial' && (
          <Badge
            variant="default"
            className="text-[10px] px-1.5 py-0 font-semibold bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 dark:bg-fuchsia-500/20 dark:text-fuchsia-400 border-none"
          >
            Nível 3
          </Badge>
        )}
        {contact.lead_empresa_pf && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 font-normal truncate max-w-[120px]"
          >
            {contact.lead_empresa_pf}
          </Badge>
        )}
        {deptoName && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 font-normal bg-slate-50 dark:bg-zinc-900 truncate max-w-[120px]"
          >
            {deptoName}
          </Badge>
        )}
      </div>

      {contact.lead_resumo && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mt-1">
          {contact.lead_resumo}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/50">
        <div className="flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3" /> {timeInStage}
        </div>
        <div className="truncate pl-2">{contact.whatsapp_phone || contact.telefone || '-'}</div>
      </div>
    </div>
  )
}
