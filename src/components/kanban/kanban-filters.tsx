import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Depto, Servico } from '@/services/contacts'

interface KanbanFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  deptoId: string
  onDeptoChange: (v: string) => void
  servicoId: string
  onServicoChange: (v: string) => void
  slaStatus: string
  onSlaChange: (v: string) => void
  deptos: Depto[]
  servicos: Servico[]
  totalContacts: number
}

export function KanbanFilters({
  search,
  onSearchChange,
  deptoId,
  onDeptoChange,
  servicoId,
  onServicoChange,
  slaStatus,
  onSlaChange,
  deptos,
  servicos,
  totalContacts,
}: KanbanFiltersProps) {
  return (
    <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center mb-6 bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-sm animate-fade-in-up">
      <div className="flex items-center gap-3 w-full xl:w-auto">
        <div className="bg-primary/10 text-primary p-2 rounded-lg hidden sm:block shrink-0">
          <Filter className="w-4 h-4" />
        </div>
        <div className="relative flex-1 xl:w-[300px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar contatos..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 w-full"
          />
        </div>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full xl:w-auto">
        <Select value={deptoId} onValueChange={onDeptoChange}>
          <SelectTrigger className="h-10 w-full sm:w-[160px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Deptos</SelectItem>
            {deptos.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={servicoId} onValueChange={onServicoChange}>
          <SelectTrigger className="h-10 w-full sm:w-[160px]">
            <SelectValue placeholder="Serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Serviços</SelectItem>
            {servicos.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={slaStatus} onValueChange={onSlaChange}>
          <SelectTrigger className="h-10 w-full sm:w-[140px]">
            <SelectValue placeholder="Status SLA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos SLAs</SelectItem>
            <SelectItem value="green">No prazo</SelectItem>
            <SelectItem value="yellow">Atenção</SelectItem>
            <SelectItem value="red">Atrasado</SelectItem>
            <SelectItem value="paused">Pausado</SelectItem>
            <SelectItem value="done">Finalizado</SelectItem>
          </SelectContent>
        </Select>

        <div className="pl-3 border-l border-slate-200 dark:border-zinc-800 flex flex-col items-end shrink-0 hidden sm:flex">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Exibindo
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200 leading-none">
            {totalContacts}
          </span>
        </div>
      </div>
    </div>
  )
}
