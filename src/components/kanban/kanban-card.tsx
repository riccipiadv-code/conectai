import { useState } from 'react'
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
  const [isDragging, setIsDragging] = useState(false)
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
      draggable
      onDragStart={(e) => {
        console.log('Drag Start:', contact.id)
        e.dataTransfer.setData('text/plain', contact.id)
        e.dataTransfer.effectAllowed = 'move'
        setIsDragging(true)
      }}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        'bg-white dark:bg-zinc-950 p-3.5 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 border-l-4 hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2.5',
        slaColors[contact.sla_status || 'green'] || slaColors.green,
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <div
          className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1"
          title={contact.lead_nome || contact.nome || 'Sem nome'}
        >
          {contact.lead_nome || contact.nome || 'Sem nome'}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onView(contact)
            }}
            onDragStart={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(contact)
            }}
            onDragStart={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-primary transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 font-medium">
        {contact.manychat_servicos?.descricao || contact.lead_servico || 'Serviço não definido'}
      </div>

      <div className="flex flex-wrap gap-1 mt-1">
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
