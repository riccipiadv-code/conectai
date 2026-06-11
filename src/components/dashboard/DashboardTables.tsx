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
import { getStageLabel } from '@/constants/stages'

export function DashboardTables({ data }: { data: any[] }) {
  const isApproved = (stage: string) => stage === 'orcamento_aprovado' || stage === 'concluido'
  const isCancelled = (stage: string) => stage === 'cancelado'

  const aggregateBy = (key: string, label: string) => {
    const map = new Map()
    data.forEach((c) => {
      const k = c[key] || 'Não informado'
      if (!map.has(k)) map.set(k, { name: k, requested: 0, approved: 0, cancelled: 0, valor: 0 })
      const item = map.get(k)
      item.requested++
      if (isApproved(c.current_stage)) item.approved++
      if (isCancelled(c.current_stage)) item.cancelled++
      item.valor += Number(c.valor) || 0
    })
    return Array.from(map.values()).sort((a: any, b: any) => b.requested - a.requested)
  }

  const responsaveis = useMemo(
    () => aggregateBy('responsavel_nome', 'Responsável').filter((r: any) => r.valor > 0),
    [data],
  )
  const servicos = useMemo(() => aggregateBy('servico_selecionado', 'Serviço'), [data])
  const departamentos = useMemo(() => aggregateBy('departamento', 'Departamento'), [data])
  const origens = useMemo(() => aggregateBy('origem', 'Origem'), [data])

  const estagios = useMemo(() => {
    const map = new Map()
    data.forEach((c) => {
      const k = getStageLabel(c.current_stage)
      if (!map.has(k)) map.set(k, { name: k, count: 0 })
      map.get(k).count++
    })
    return Array.from(map.values()).sort((a: any, b: any) => b.count - a.count)
  }, [data])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

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
                    {data.length ? ((d.count / data.length) * 100).toFixed(1) : 0}%
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
