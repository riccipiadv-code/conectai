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
import {
  getDashboardStageLabel,
  DASHBOARD_ALLOWED_STAGES,
  aggregateByKey,
  formatCurrency,
  type DashboardContact,
} from './utils'

export function DashboardTables({ data }: { data: DashboardContact[] }) {
  const responsaveis = useMemo(
    () => aggregateByKey(data, 'responsavel_nome').filter((r) => r.valor > 0),
    [data],
  )
  const servicos = useMemo(() => aggregateByKey(data, 'servico_selecionado'), [data])
  const departamentos = useMemo(() => aggregateByKey(data, 'departamento'), [data])
  const origens = useMemo(() => aggregateByKey(data, 'origem'), [data])

  const estagios = useMemo(() => {
    const map = new Map()
    data.forEach((c) => {
      if (!c.current_stage || !DASHBOARD_ALLOWED_STAGES.includes(c.current_stage)) return
      const k = getDashboardStageLabel(c.current_stage)
      if (!map.has(k)) map.set(k, { name: k, count: 0 })
      map.get(k).count++
    })
    return Array.from(map.values()).sort((a: any, b: any) => b.count - a.count)
  }, [data])

  const totalEstagiosExibidos = useMemo(
    () => estagios.reduce((acc: number, s: any) => acc + s.count, 0),
    [estagios],
  )

  const renderTable = (title: string, items: any[], colName: string) => (
    <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm col-span-1">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[350px] overflow-auto px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-zinc-900/50">
              <TableHead className="pl-6">{colName}</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Aprovados</TableHead>
              <TableHead className="text-right">Cancelados</TableHead>
              <TableHead className="text-right pr-6">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((d: any) => (
              <TableRow key={d.name}>
                <TableCell className="pl-6 font-medium">{d.name}</TableCell>
                <TableCell className="text-right">{d.requested}</TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-500">
                  {d.approved}
                </TableCell>
                <TableCell className="text-right text-red-600 dark:text-red-500">
                  {d.cancelled}
                </TableCell>
                <TableCell className="text-right pr-6">{formatCurrency(d.valor)}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
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
  )

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
      {renderTable('Por Responsável', responsaveis, 'Responsável')}
      {renderTable('Por Serviço', servicos, 'Serviço')}
      {renderTable('Por Departamento', departamentos, 'Departamento')}
      {renderTable('Por Origem', origens, 'Origem')}

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Resumo por Estágio</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[350px] overflow-auto px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-zinc-900/50">
                <TableHead className="pl-6">Estágio</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right pr-6">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estagios.map((d: any) => (
                <TableRow key={d.name}>
                  <TableCell className="pl-6 font-medium">{d.name}</TableCell>
                  <TableCell className="text-right">{d.count}</TableCell>
                  <TableCell className="text-right pr-6 font-semibold">
                    {totalEstagiosExibidos
                      ? ((d.count / totalEstagiosExibidos) * 100).toFixed(1)
                      : '0'}
                    %
                  </TableCell>
                </TableRow>
              ))}
              {estagios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
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
