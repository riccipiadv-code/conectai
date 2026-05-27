import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function DashboardTables({ data }: { data: any[] }) {
  const monthlyData = useMemo(() => {
    const map = new Map()
    data.forEach((c) => {
      const m = format(parseISO(c.created_at), 'MMM/yyyy', { locale: ptBR })
      if (!map.has(m)) map.set(m, { month: m, requested: 0, approved: 0, cancelled: 0 })
      const item = map.get(m)
      item.requested++
      if (c.current_stage === 'orcamento_aprovado') item.approved++
      if (c.current_stage === 'cancelado') item.cancelled++
    })
    return Array.from(map.values()).reverse()
  }, [data])

  const originData = useMemo(() => {
    const map = new Map()
    data.forEach((c) => {
      const o = c.origem || 'Não informada'
      if (!map.has(o)) map.set(o, { origin: o, requested: 0, approved: 0, cancelled: 0 })
      const item = map.get(o)
      item.requested++
      if (c.current_stage === 'orcamento_aprovado') item.approved++
      if (c.current_stage === 'cancelado') item.cancelled++
    })
    return Array.from(map.values()).sort((a: any, b: any) => b.requested - a.requested)
  }, [data])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Resumo Mensal</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[350px] overflow-auto px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-zinc-900/50">
                <TableHead className="pl-6">Mês</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Aprovados</TableHead>
                <TableHead className="text-right">Cancelados</TableHead>
                <TableHead className="text-right pr-6">% Aprov</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((d: any) => (
                <TableRow key={d.month}>
                  <TableCell className="pl-6 font-medium">{d.month}</TableCell>
                  <TableCell className="text-right">{d.requested}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-500">
                    {d.approved}
                  </TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-500">
                    {d.cancelled}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-semibold">
                    {d.requested ? ((d.approved / d.requested) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              ))}
              {monthlyData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    Sem dados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Resumo por Origem</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[350px] overflow-auto px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-zinc-900/50">
                <TableHead className="pl-6">Origem</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Aprovados</TableHead>
                <TableHead className="text-right">Cancelados</TableHead>
                <TableHead className="text-right pr-6">% Aprov</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {originData.map((d: any) => (
                <TableRow key={d.origin}>
                  <TableCell className="pl-6 font-medium">{d.origin}</TableCell>
                  <TableCell className="text-right">{d.requested}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-500">
                    {d.approved}
                  </TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-500">
                    {d.cancelled}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-semibold">
                    {d.requested ? ((d.approved / d.requested) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              ))}
              {originData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    Sem dados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
