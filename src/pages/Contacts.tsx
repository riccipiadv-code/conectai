import { useEffect, useState } from 'react'
import {
  getContacts,
  getResponsaveis,
  getServicos,
  getDeptos,
  ContactsFilters,
} from '@/services/contacts'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { format, isBefore, parseISO, startOfDay } from 'date-fns'
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Contacts() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ responsaveis: [], servicos: [], deptos: [] })

  const [filters, setFilters] = useState<ContactsFilters>({
    stage: 'all',
    responsavel_id: 'all',
    servico_id: 'all',
    depto_id: 'all',
    sla: 'all',
    follow_up: 'all',
    origem: 'all',
  })

  const [sort, setSort] = useState<{ column: string; ascending: boolean }>({
    column: 'data_follow_up',
    ascending: true,
  })

  useEffect(() => {
    Promise.all([getResponsaveis(), getServicos(), getDeptos()]).then(([r, s, d]: any) => {
      setMeta({ responsaveis: r, servicos: s, deptos: d })
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    getContacts(filters, sort)
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [filters, sort])

  const toggleSort = (col: string) => {
    setSort((prev) => ({
      column: col,
      ascending: prev.column === col ? !prev.ascending : true,
    }))
  }

  const updateFilter = (key: keyof ContactsFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const renderSortIcon = (col: string) => {
    if (sort.column !== col) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
    return sort.ascending ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    )
  }

  const formatPhone = (p: string) => {
    if (!p) return '-'
    return p
  }

  return (
    <div className="space-y-4 animate-fade-in p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Atendimentos
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie os registros e acompanhe os follow-ups.
        </p>
      </div>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Estágio</Label>
              <Select value={filters.stage} onValueChange={(v) => updateFilter('stage', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
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
              <Label className="text-xs font-semibold uppercase text-slate-500">Responsável</Label>
              <Select
                value={filters.responsavel_id}
                onValueChange={(v) => updateFilter('responsavel_id', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
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
              <Label className="text-xs font-semibold uppercase text-slate-500">Serviço</Label>
              <Select
                value={filters.servico_id}
                onValueChange={(v) => updateFilter('servico_id', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
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
              <Select value={filters.depto_id} onValueChange={(v) => updateFilter('depto_id', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
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
              <Label className="text-xs font-semibold uppercase text-slate-500">SLA</Label>
              <Select value={filters.sla} onValueChange={(v) => updateFilter('sla', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="green">No Prazo</SelectItem>
                  <SelectItem value="yellow">Vencendo Hoje</SelectItem>
                  <SelectItem value="red">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Follow Up</Label>
              <Select value={filters.follow_up} onValueChange={(v) => updateFilter('follow_up', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="next_7_days">Próximos 7 dias</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                  <SelectItem value="none">Sem Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Origem</Label>
              <Select value={filters.origem} onValueChange={(v) => updateFilter('origem', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Origens</SelectItem>
                  <SelectItem value="Agente">Agente</SelectItem>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Whatsapp">Whatsapp</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div className="overflow-x-auto w-full">
          <Table className="table-fixed w-full min-w-[950px]">
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                <TableHead className="w-[180px] sm:w-[200px] pl-6 font-semibold">Contato</TableHead>
                <TableHead className="w-[150px] sm:w-[170px] font-semibold">
                  Serviço / Empresa
                </TableHead>
                <TableHead className="font-semibold">Consulta</TableHead>
                <TableHead className="w-[120px] font-semibold">Estágio</TableHead>
                <TableHead
                  className="w-[110px] cursor-pointer font-semibold select-none hover:text-primary transition-colors"
                  onClick={() => toggleSort('data_follow_up')}
                >
                  <div className="flex items-center">
                    Dt. FUP
                    {renderSortIcon('data_follow_up')}
                  </div>
                </TableHead>
                <TableHead className="w-[80px] font-semibold text-center">Ações</TableHead>
                <TableHead className="w-[80px] font-semibold pr-6 text-center">SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-8 w-8 text-slate-300" />
                      <span>Nenhum atendimento encontrado para os filtros selecionados.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((c: any) => {
                  const fupDate = c.data_follow_up ? parseISO(c.data_follow_up) : null
                  const isOverdue = fupDate && isBefore(startOfDay(fupDate), startOfDay(new Date()))

                  const contactName =
                    c.nome || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Desconhecido'
                  const phone = formatPhone(c.whatsapp_phone || c.telefone)

                  let stageLabel = c.current_stage || '-'
                  if (stageLabel === 'nivel_1_novo') stageLabel = 'Novo'
                  else if (stageLabel === 'orcamento_aprovado') stageLabel = 'Aprovado'
                  else if (stageLabel === 'cancelado') stageLabel = 'Cancelado'
                  else
                    stageLabel = stageLabel
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l: any) => l.toUpperCase())

                  return (
                    <TableRow
                      key={c.id}
                      className="group hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <TableCell className="pl-6 w-[180px] sm:w-[200px] align-top py-3">
                        <div className="flex flex-col space-y-1">
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-100 break-words whitespace-normal leading-tight">
                            {contactName}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">{phone}</span>
                        </div>
                      </TableCell>

                      <TableCell className="w-[150px] sm:w-[170px] align-top py-3 overflow-hidden">
                        <div className="flex flex-col space-y-1">
                          <span className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate">
                            {c.lead_servico || c.manychat_servicos?.descricao || '-'}
                          </span>
                          <span className="text-xs text-muted-foreground break-words whitespace-normal leading-tight line-clamp-2">
                            {c.lead_empresa_pf || '-'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="align-top py-3">
                        <div className="line-clamp-3 text-xs text-slate-600 dark:text-slate-400 break-words whitespace-normal leading-relaxed">
                          {c.lead_resumo || c.observacoes || '-'}
                        </div>
                      </TableCell>

                      <TableCell className="w-[120px] align-top py-3">
                        <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-full">
                          {stageLabel}
                        </div>
                      </TableCell>

                      <TableCell className="w-[110px] align-top py-3">
                        {fupDate ? (
                          <div
                            className={cn(
                              'text-sm font-medium',
                              isOverdue
                                ? 'text-red-600 dark:text-red-500'
                                : 'text-slate-700 dark:text-slate-300',
                            )}
                          >
                            {format(fupDate, 'dd/MM/yyyy')}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>

                      <TableCell className="w-[80px] align-top py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                            <DropdownMenuItem>Atualizar Estágio</DropdownMenuItem>
                            <DropdownMenuItem>Agendar FUP</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      <TableCell className="w-[80px] pr-6 align-top py-3 text-center">
                        <div className="flex justify-center items-center h-full pt-1">
                          <div
                            className={cn(
                              'h-3 w-3 rounded-full shadow-sm',
                              c.sla_status === 'red'
                                ? 'bg-red-500 ring-2 ring-red-500/20'
                                : c.sla_status === 'yellow'
                                  ? 'bg-amber-400 ring-2 ring-amber-400/20'
                                  : 'bg-emerald-500 ring-2 ring-emerald-500/20',
                            )}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
