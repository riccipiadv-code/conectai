import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  CheckCircle,
  XCircle,
  Percent,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react'

export function DashboardKPIs({ data }: { data: any[] }) {
  const total = data.length
  const withBudget = data.filter((c) => c.orcamento || Number(c.valor) > 0).length

  // Consider 'orcamento_aprovado' and 'concluido' as approved
  const approved = data.filter(
    (c) => c.current_stage === 'orcamento_aprovado' || c.current_stage === 'concluido',
  ).length
  const cancelled = data.filter((c) => c.current_stage === 'cancelado').length

  const approvalRate = total > 0 ? (approved / total) * 100 : 0
  const declineRate = total > 0 ? (cancelled / total) * 100 : 0

  const totalValue = data.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

  // Valor Faturado corresponds to total value of approved/billed
  const billedValue = data
    .filter((c) => c.current_stage === 'orcamento_aprovado' || c.current_stage === 'concluido')
    .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

  const valueContacts = data.filter((c) => Number(c.valor) > 0).length
  const ticketAvg = valueContacts > 0 ? totalValue / valueContacts : 0

  const pendingFollowUp = data.filter(
    (c) =>
      c.data_follow_up &&
      new Date(c.data_follow_up) <= new Date() &&
      c.current_stage !== 'orcamento_aprovado' &&
      c.current_stage !== 'cancelado',
  ).length
  const overdueSla = data.filter((c) => c.sla_status === 'red' || c.sla_status === 'yellow').length

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
      <KPICard title="Total Contatos" value={total} icon={FileText} />
      <KPICard title="Com Orçamento" value={withBudget} icon={FileText} />
      <KPICard
        title="Aprovados"
        value={approved}
        icon={CheckCircle}
        valueClass="text-green-600 dark:text-green-500"
      />
      <KPICard
        title="Cancelados"
        value={cancelled}
        icon={XCircle}
        valueClass="text-red-600 dark:text-red-500"
      />
      <KPICard title="Taxa Aprovação" value={`${approvalRate.toFixed(1)}%`} icon={Percent} />
      <KPICard title="Taxa Cancelamento" value={`${declineRate.toFixed(1)}%`} icon={TrendingDown} />
      <KPICard title="Valor Total (Todos)" value={formatCurrency(totalValue)} icon={DollarSign} />
      <KPICard
        title="Valor Faturado"
        value={formatCurrency(billedValue)}
        icon={DollarSign}
        valueClass="text-green-600 dark:text-green-500"
      />
      <KPICard title="Ticket Médio" value={formatCurrency(ticketAvg)} icon={DollarSign} />
      <KPICard
        title="SLA Atraso/Alerta"
        value={overdueSla}
        icon={AlertTriangle}
        valueClass={overdueSla > 0 ? 'text-red-600 dark:text-red-500' : ''}
      />
    </div>
  )
}

function KPICard({ title, value, icon: Icon, valueClass = '' }: any) {
  return (
    <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm transition-all duration-200 hover:shadow-md bg-white dark:bg-zinc-950">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-5 pt-5">
        <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div
          className={`text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 ${valueClass}`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  )
}
