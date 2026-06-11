import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getDashboardStageLabel, DASHBOARD_ALLOWED_STAGES } from './utils'

export function DashboardCharts({ data }: { data: any[] }) {
  const monthlyData = useMemo(() => {
    const map = new Map()
    data.forEach((c) => {
      const month = format(parseISO(c.created_at), 'MMM/yy', { locale: ptBR })
      if (!map.has(month)) map.set(month, { month, requested: 0, approved: 0, cancelled: 0 })
      const item = map.get(month)
      item.requested++
      if (c.current_stage === 'orcamento_aprovado') item.approved++
      if (c.current_stage === 'cancelado') item.cancelled++
    })
    return Array.from(map.values()).reverse()
  }, [data])

  const originData = useMemo(() => {
    const map = new Map()
    data.forEach((c) => {
      const o = c.manychat_origens?.nome || c.origem || 'Não informada'
      map.set(o, (map.get(o) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [data])

  const funnelData = useMemo(() => {
    const map = new Map()
    data.forEach((c) => {
      if (!c.current_stage || !DASHBOARD_ALLOWED_STAGES.includes(c.current_stage)) return
      const stage = getDashboardStageLabel(c.current_stage)
      map.set(stage, (map.get(stage) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([stage, count]) => ({ stage, count }))
      .sort((a, b) => b.count - a.count)
  }, [data])

  const COLORS = [
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#d97706',
    '#9333ea',
    '#0891b2',
    '#0284c7',
    '#4f46e5',
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Tendência de Solicitações (Mensal)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ requested: { label: 'Solicitações', color: '#2563eb' } }}
            className="h-[300px] w-full"
          >
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="requested"
                stroke="var(--color-requested)"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Comparativo de Status (Mensal)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              approved: { label: 'Aprovados', color: '#16a34a' },
              cancelled: { label: 'Cancelados', color: '#dc2626' },
            }}
            className="h-[300px] w-full"
          >
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="approved"
                stackId="a"
                fill="var(--color-approved)"
                radius={[0, 0, 4, 4]}
              />
              <Bar
                dataKey="cancelled"
                stackId="a"
                fill="var(--color-cancelled)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Origem</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={originData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true}
                >
                  {originData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Volume por Estágio (Kanban)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ count: { label: 'Quantidade', color: '#8b5cf6' } }}
            className="h-[300px] w-full"
          >
            <BarChart data={funnelData} layout="vertical" margin={{ left: 50, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="stage"
                type="category"
                width={120}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
