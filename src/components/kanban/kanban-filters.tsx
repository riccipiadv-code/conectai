import { Search } from 'lucide-react'
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
  deptos,
  servicos,
  totalContacts,
}: KanbanFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 shrink-0 animate-fade-in-up w-full justify-start">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-[300px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar contatos..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 w-full bg-white dark:bg-zinc-950 border-slate-200/60 dark:border-zinc-800 shadow-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
        <Select value={deptoId} onValueChange={onDeptoChange}>
          <SelectTrigger className="h-10 w-full sm:w-[180px] bg-white dark:bg-zinc-950 border-slate-200/60 dark:border-zinc-800 shadow-sm">
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
          <SelectTrigger className="h-10 w-full sm:w-[180px] bg-white dark:bg-zinc-950 border-slate-200/60 dark:border-zinc-800 shadow-sm">
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
      </div>

      <div className="ml-auto hidden xl:flex items-center">
        <div className="flex flex-col items-end">
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
