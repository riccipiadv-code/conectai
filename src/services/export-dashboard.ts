import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { exportToExcel } from '@/lib/excel'
import { getDashboardStageLabel } from '@/components/dashboard/utils'

export function exportDashboardExcel(data: any[]) {
  const total = data.length
  const approved = data.filter((c) => c.current_stage === 'orcamento_aprovado').length
  const cancelled = data.filter((c) => c.current_stage === 'cancelado').length
  const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(2) + '%' : '0%'
  const totalValue = data.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

  const resumoSheet = {
    name: 'Resumo',
    data: [
      ['Métrica', 'Valor'],
      ['Total de Solicitações', total],
      ['Aprovados', approved],
      ['Cancelados', cancelled],
      ['Taxa de Aprovação', approvalRate],
      ['Valor Total', totalValue],
    ],
  }

  const monthMap = new Map()
  data.forEach((c) => {
    const m = format(parseISO(c.created_at), 'MM/yyyy')
    if (!monthMap.has(m)) monthMap.set(m, { requested: 0, approved: 0, cancelled: 0 })
    const item = monthMap.get(m)
    item.requested++
    if (c.current_stage === 'orcamento_aprovado') item.approved++
    if (c.current_stage === 'cancelado') item.cancelled++
  })
  const monthSheet = {
    name: 'Por mês',
    data: [
      ['Mês', 'Solicitações', 'Aprovados', 'Cancelados', '% Aprovação'],
      ...Array.from(monthMap.entries()).map(([m, v]: any) => [
        m,
        v.requested,
        v.approved,
        v.cancelled,
        v.requested ? ((v.approved / v.requested) * 100).toFixed(2) + '%' : '0%',
      ]),
    ],
  }

  const originMap = new Map()
  data.forEach((c) => {
    const o = c.manychat_origens?.nome || c.origem || 'Não informada'
    if (!originMap.has(o)) originMap.set(o, { requested: 0, approved: 0, cancelled: 0 })
    const item = originMap.get(o)
    item.requested++
    if (c.current_stage === 'orcamento_aprovado') item.approved++
    if (c.current_stage === 'cancelado') item.cancelled++
  })
  const originSheet = {
    name: 'Por origem',
    data: [
      ['Origem', 'Solicitações', 'Aprovados', 'Cancelados', '% Aprovação'],
      ...Array.from(originMap.entries()).map(([o, v]: any) => [
        o,
        v.requested,
        v.approved,
        v.cancelled,
        v.requested ? ((v.approved / v.requested) * 100).toFixed(2) + '%' : '0%',
      ]),
    ],
  }

  const serviceMap = new Map()
  data.forEach((c) => {
    const s = c.manychat_servicos?.descricao || 'Sem serviço'
    if (!serviceMap.has(s)) serviceMap.set(s, { count: 0, value: 0 })
    const item = serviceMap.get(s)
    item.count++
    item.value += Number(c.valor) || 0
  })
  const serviceSheet = {
    name: 'Por serviço',
    data: [
      ['Serviço', 'Solicitações', 'Valor Total'],
      ...Array.from(serviceMap.entries()).map(([s, v]: any) => [s, v.count, v.value]),
    ],
  }

  const agentMap = new Map()
  data.forEach((c) => {
    const a = c.legaldesk_usuarios?.nome || c.responsavel_id || 'Não Atribuído'
    if (!agentMap.has(a)) agentMap.set(a, { count: 0, approved: 0 })
    const item = agentMap.get(a)
    item.count++
    if (c.current_stage === 'orcamento_aprovado') item.approved++
  })
  const agentSheet = {
    name: 'Por responsável',
    data: [
      ['Responsável', 'Solicitações', 'Aprovados'],
      ...Array.from(agentMap.entries()).map(([a, v]: any) => [a, v.count, v.approved]),
    ],
  }

  const cancelMap = new Map()
  data
    .filter((c) => c.current_stage === 'cancelado')
    .forEach((c) => {
      const r = c.manychat_cancel_reasons?.motivo || 'Não informado'
      cancelMap.set(r, (cancelMap.get(r) || 0) + 1)
    })
  const cancelSheet = {
    name: 'Motivos de cancelamento',
    data: [
      ['Motivo', 'Quantidade'],
      ...Array.from(cancelMap.entries()).map(([r, count]: any) => [r, count]),
    ],
  }

  const baseSheet = {
    name: 'Base Filtrada',
    data: [
      ['Data Criação', 'Nome', 'Origem', 'Estágio', 'Valor', 'SLA', 'Motivo Cancelamento'],
      ...data.map((c) => [
        format(parseISO(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        c.lead_nome || c.nome || '',
        c.manychat_origens?.nome || c.origem || '',
        getDashboardStageLabel(c.current_stage),
        c.valor || 0,
        c.sla_status || '',
        c.manychat_cancel_reasons?.motivo || '',
      ]),
    ],
  }

  exportToExcel(
    [resumoSheet, monthSheet, originSheet, serviceSheet, agentSheet, cancelSheet, baseSheet],
    `dashboard-manyskip-${format(new Date(), 'yyyy-MM-dd')}.xls`,
  )
}
