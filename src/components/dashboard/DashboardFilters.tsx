import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DashboardFilters as FiltersType } from '@/services/dashboard'

interface Props {
  filters: FiltersType
  setFilters: (f: FiltersType) => void
  meta: any
}

export function DashboardFilters({ filters, setFilters, meta }: Props) {
  const update = (key: keyof FiltersType, value: any) => setFilters({ ...filters, [key]: value })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-8 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-sm">
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
              onChange={(e) => update('dateFrom', e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-slate-500">Data Final</Label>
            <Input
              type="date"
              className="h-9"
              onChange={(e) => update('dateTo', e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-slate-500">Origem</Label>
        <Select
          value={filters.origem || 'all'}
          onValueChange={(v) => update('origem', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todas as Origens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Origens</SelectItem>
            <SelectItem value="Whatsapp">Whatsapp</SelectItem>
            <SelectItem value="Agente">Agente</SelectItem>
            <SelectItem value="E-mail">E-mail</SelectItem>
            <SelectItem value="Indicação">Indicação</SelectItem>
          </SelectContent>
        </Select>
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
            <SelectItem value="nivel_1_novo">Novo</SelectItem>
            <SelectItem value="orcamento_aprovado">Aprovado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
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
    </div>
  )
}
