import { format, parseISO } from 'date-fns'
import { exportToExcel, type ExcelCell, type CellValue, type ExcelSheet } from '@/lib/excel'
import {
  getDashboardStageLabel,
  isFechado,
  isCancelado,
  type DashboardContact,
} from '@/components/dashboard/utils'
import { buildControladoriaSheet } from '@/services/export-controladoria'

const CURRENCY_FMT = '"R$" #,##0.00'
const PERCENT_FMT = '0.00%'
const DATE_TIME_FMT = 'dd/mm/yyyy hh:mm'

function currency(value: number): ExcelCell {
  return { value, type: 'n', fmt: CURRENCY_FMT }
}

function percent(ratio: number): ExcelCell {
  return { value: ratio, type: 'n', fmt: PERCENT_FMT }
}

function dateCell(dateStr: string): ExcelCell {
  return { value: parseISO(dateStr), type: 'd', fmt: DATE_TIME_FMT }
}

export function exportDashboardExcel(
  data: DashboardContact[],
  controladoriaData: DashboardContact[] = data,
) {
  const total = data.length
  const approved = data.filter((c) => isFechado(c)).length
  const cancelled = data.filter((c) => c.current_stage === 'cancelado').length
  const approvalRate = total > 0 ? approved / total : 0
  const totalValue = data.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

  const resumoSheet: ExcelSheet = {
    name: 'Resumo',
    colWidths: [30, 22],
    data: [
      ['Métrica', 'Valor'],
      ['Total de Solicitações', total],
      ['Aprovados', approved],
      ['Cancelados', cancelled],
      ['Taxa de Aprovação', percent(approvalRate)],
      ['Valor Total', currency(totalValue)],
    ],
  }

  const monthMap = new Map<string, { requested: number; approved: number; cancelled: number }>()
  data.forEach((c) => {
    const m = format(parseISO(c.created_at), 'MM/yyyy')
    if (!monthMap.has(m)) monthMap.set(m, { requested: 0, approved: 0, cancelled: 0 })
    const item = monthMap.get(m)!
    item.requested++
    if (isFechado(c)) item.approved++
    if (isCancelado(c)) item.cancelled++
  })
  const monthSheet: ExcelSheet = {
    name: 'Por mês',
    colWidths: [12, 14, 12, 14, 14],
    data: [
      ['Mês', 'Solicitações', 'Aprovados', 'Cancelados', '% Aprovação'],
      ...Array.from(monthMap.entries()).map(([m, v]): CellValue[] => [
        m,
        v.requested,
        v.approved,
        v.cancelled,
        v.requested ? percent(v.approved / v.requested) : percent(0),
      ]),
    ],
  }

  const originMap = new Map<string, { requested: number; approved: number; cancelled: number }>()
  data.forEach((c) => {
    const o = c.manychat_origens?.nome || c.origem || 'Não informada'
    if (!originMap.has(o)) originMap.set(o, { requested: 0, approved: 0, cancelled: 0 })
    const item = originMap.get(o)!
    item.requested++
    if (isFechado(c)) item.approved++
    if (isCancelado(c)) item.cancelled++
  })
  const originSheet: ExcelSheet = {
    name: 'Por origem',
    colWidths: [25, 14, 12, 14, 14],
    data: [
      ['Origem', 'Solicitações', 'Aprovados', 'Cancelados', '% Aprovação'],
      ...Array.from(originMap.entries()).map(([o, v]): CellValue[] => [
        o,
        v.requested,
        v.approved,
        v.cancelled,
        v.requested ? percent(v.approved / v.requested) : percent(0),
      ]),
    ],
  }

  const serviceMap = new Map<string, { count: number; value: number }>()
  data.forEach((c) => {
    const s = c.manychat_servicos?.descricao || 'Sem serviço'
    if (!serviceMap.has(s)) serviceMap.set(s, { count: 0, value: 0 })
    const item = serviceMap.get(s)!
    item.count++
    item.value += Number(c.valor) || 0
  })
  const serviceSheet: ExcelSheet = {
    name: 'Por serviço',
    colWidths: [30, 14, 22],
    data: [
      ['Serviço', 'Solicitações', 'Valor Total'],
      ...Array.from(serviceMap.entries()).map(([s, v]): CellValue[] => [
        s,
        v.count,
        currency(v.value),
      ]),
    ],
  }

  const agentMap = new Map<string, { count: number; approved: number }>()
  data.forEach((c) => {
    const a = c.legaldesk_usuarios?.nome || c.responsavel_id || 'Não Atribuído'
    if (!agentMap.has(a)) agentMap.set(a, { count: 0, approved: 0 })
    const item = agentMap.get(a)!
    item.count++
    if (isFechado(c)) item.approved++
  })
  const agentSheet: ExcelSheet = {
    name: 'Por responsável',
    colWidths: [25, 14, 12],
    data: [
      ['Responsável', 'Solicitações', 'Aprovados'],
      ...Array.from(agentMap.entries()).map(([a, v]): CellValue[] => [a, v.count, v.approved]),
    ],
  }

  const cancelMap = new Map<string, number>()
  data
    .filter((c) => c.current_stage === 'cancelado')
    .forEach((c) => {
      const r = c.manychat_cancel_reasons?.motivo || 'Não informado'
      cancelMap.set(r, (cancelMap.get(r) || 0) + 1)
    })
  const cancelSheet: ExcelSheet = {
    name: 'Motivos de cancelamento',
    colWidths: [40, 14],
    data: [
      ['Motivo', 'Quantidade'],
      ...Array.from(cancelMap.entries()).map(([r, count]): CellValue[] => [r, count]),
    ],
  }

  const baseSheet: ExcelSheet = {
    name: 'Base Filtrada',
    colWidths: [20, 30, 20, 35, 16, 30],
    data: [
      ['Data Criação', 'Nome', 'Origem', 'Estágio', 'Valor', 'Motivo Cancelamento'],
      ...data.map((c): CellValue[] => [
        dateCell(c.created_at),
        c.lead_nome || c.nome || '',
        c.manychat_origens?.nome || c.origem || '',
        getDashboardStageLabel(c.current_stage),
        currency(Number(c.valor) || 0),
        c.manychat_cancel_reasons?.motivo || '',
      ]),
    ],
  }

  const controladoriaSheet = buildControladoriaSheet(controladoriaData)

  exportToExcel(
    [
      controladoriaSheet,
      resumoSheet,
      monthSheet,
      originSheet,
      serviceSheet,
      agentSheet,
      cancelSheet,
      baseSheet,
    ],
    `dashboard-conectai-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
  )
}
