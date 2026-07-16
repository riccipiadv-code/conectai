import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { DashboardFilters as FiltersType, DEFAULT_ORIGIN_NAMES } from '@/services/dashboard'
import { OFFICIAL_STAGES } from '@/constants/stages'
import { Search } from 'lucide-react'
import { parse, startOfDay, endOfDay } from 'date-fns'
import { getDashboardStageLabel } from './utils'

interface Props {
  filters: FiltersType
  setFilters: (f: FiltersType) => void
  meta: any
}

export function DashboardFilters({ filters, setFilters, meta }: Props) {
  const update = (key: keyof FiltersType, value: any) => setFilters({ ...filters, [key]: value })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-8 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-sm">
      <div className="space-y-1.5 md:col-span-4">
        <Label className="text-xs font-semibold uppercase text-slate-500">Busca Global</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por Nome, Telefone, Email, Empresa, ou Controle..."
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className="pl-9 h-10 bg-slate-50 dark:bg-zinc-900/50"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-slate-500">Período</Label>
        <Select value={filters.period} onValueChange={(v) => update('period', v)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">Mês Atual</SelectItem>
            <SelectItem value="prev_month">Mês Anterior</SelectItem>
            <SelectItem value="current_year">Ano Atual</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filters.period === 'custom' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-slate-500">Data Inicial</Label>
            <Input
              type="date"
              className="h-9"
              onChange={(e) =>
                update(
                  'dateFrom',
                  e.target.value
                    ? startOfDay(parse(e.target.value, 'yyyy-MM-dd', new Date()))
                    : null,
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-slate-500">Data Final</Label>
            <Input
              type="date"
              className="h-9"
              onChange={(e) =>
                update(
                  'dateTo',
                  e.target.value ? endOfDay(parse(e.target.value, 'yyyy-MM-dd', new Date())) : null,
                )
              }
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-slate-500">Origem</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-full justify-start text-left font-normal px-3 bg-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Origens ({filters.origens?.length || 0})
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Origens</h4>
            </div>
            <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                onClick={() => update('origens', meta.origens?.map((o: any) => o.id) || [])}
              >
                Selecionar todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                onClick={() => update('origens', [])}
              >
                Limpar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 hover:bg-slate-200 dark:hover:bg-zinc-800"
                onClick={() => {
                  const defaults =
                    meta.origens
                      ?.filter((o: any) =>
                        DEFAULT_ORIGIN_NAMES.some((name) =>
                          o.nome?.toLowerCase().includes(name.toLowerCase()),
                        ),
                      )
                      .map((o: any) => o.id) || []
                  update('origens', defaults)
                }}
              >
                Padrão
              </Button>
            </div>
            <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
              {meta.origens?.map((o: any) => (
                <div key={o.id} className="flex items-center space-x-3 px-1">
                  <Checkbox
                    id={`origem-${o.id}`}
                    checked={filters.origens?.includes(o.id)}
                    onCheckedChange={(checked) => {
                      const current = filters.origens || []
                      if (checked) {
                        update('origens', [...current, o.id])
                      } else {
                        update(
                          'origens',
                          current.filter((id: number) => id !== o.id),
                        )
                      }
                    }}
                  />
                  <label
                    htmlFor={`origem-${o.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-slate-700 dark:text-slate-300"
                  >
                    {o.nome}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-slate-500">Serviço</Label>
        <Select
          value={filters.servico_id || 'all'}
          onValueChange={(v) => update('servico_id', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os Serviços" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Serviços</SelectItem>
            {meta.servicos?.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {s.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-slate-500">Departamento</Label>
        <Select
          value={filters.depto_id || 'all'}
          onValueChange={(v) => update('depto_id', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os Deptos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Departamentos</SelectItem>
            {meta.deptos?.map((d: any) => (
              <SelectItem key={d.id} value={d.id.toString()}>
                {d.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-slate-500">Responsável</Label>
        <Select
          value={filters.responsavel_id || 'all'}
          onValueChange={(v) => update('responsavel_id', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os Resp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Responsáveis</SelectItem>
            {meta.responsaveis?.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-slate-500">Estágio</Label>
        <Select
          value={filters.current_stage || 'all'}
          onValueChange={(v) => update('current_stage', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os Estágios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Estágios</SelectItem>
            {OFFICIAL_STAGES.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {getDashboardStageLabel(stage.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-slate-500">SLA Status</Label>
        <Select
          value={filters.sla_status || 'all'}
          onValueChange={(v) => update('sla_status', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os SLAs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os SLAs</SelectItem>
            <SelectItem value="green">No Prazo</SelectItem>
            <SelectItem value="yellow">Alerta</SelectItem>
            <SelectItem value="red">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-slate-500">Follow-up</Label>
        <Select
          value={filters.follow_up || 'all'}
          onValueChange={(v) => update('follow_up', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="overdue">Atrasado</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="future">No Futuro</SelectItem>
            <SelectItem value="none">Sem Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
