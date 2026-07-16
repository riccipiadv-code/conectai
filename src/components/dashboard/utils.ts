export const DASHBOARD_ALLOWED_STAGES = [
  'nivel_1_novo',
  'nivel_2_especialista',
  'nivel_3_especial',
  'reuniao_consulta_agendada',
  'enviado_orcamento_ag_retorno',
  'orcamento_aprovado',
  'cancelado',
]

export const DASHBOARD_STAGE_LABELS: Record<string, string> = {
  nivel_1_novo: 'Nível 1 - Novo',
  nivel_2_especialista: 'Nível 2 - Especialista',
  nivel_3_especial: 'Nível 3 - Especial',
  reuniao_consulta_agendada: 'Reunião/Consulta Agendada',
  enviado_orcamento_ag_retorno: 'Enviado Orçamento / Aguardando Retorno',
  orcamento_aprovado: 'Orçamento Aprovado',
  cancelado: 'Cancelado',
}

export interface DashboardContact {
  id: string
  created_at: string
  origem: string
  origem_id: number | null
  current_stage: string | null
  valor: number | null
  data_follow_up: string | null
  sla_status: string | null
  orcamento: string | null
  servico_id: string | null
  depto_id: number | null
  responsavel_id: string | null
  lead_nome: string | null
  nome: string | null
  first_name: string | null
  telefone: string | null
  lead_email: string | null
  lead_empresa_pf: string | null
  porte_empresa: string | null
  controle: number | null
  lead_resumo: string | null
  numero_cliente: number | null
  data_entrada: string
  responsavel_nome: string
  lead_nome_exibicao: string
  email: string
  empresa_pf: string
  servico_selecionado: string
  departamento: string
  current_stage_label: string
  cancel_reason: string
  manychat_origens?: { nome: string } | null
  manychat_servicos?: { descricao: string } | null
  manychat_deptos?: { nome: string } | null
  manychat_cancel_reasons?: { motivo: string } | null
  legaldesk_usuarios?: { nome: string } | null
}

export interface AggregatedRow {
  name: string
  requested: number
  approved: number
  cancelled: number
  valor: number
}

export const getDashboardStageLabel = (stageId: string | null | undefined): string => {
  if (!stageId) return 'Sem Estágio'
  return DASHBOARD_STAGE_LABELS[stageId] || stageId
}

export const isFechado = (contact: DashboardContact | any): boolean => {
  return Number(contact?.valor) > 0
}

export const isCancelado = (contact: DashboardContact | any): boolean => {
  return contact?.current_stage === 'cancelado'
}

export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export function aggregateByKey(
  data: DashboardContact[],
  key: keyof DashboardContact,
): AggregatedRow[] {
  const map = new Map<string, AggregatedRow>()
  data.forEach((c) => {
    const k = (c[key] as string) || 'Não informado'
    if (!map.has(k)) map.set(k, { name: k, requested: 0, approved: 0, cancelled: 0, valor: 0 })
    const item = map.get(k)!
    item.requested++
    if (isFechado(c)) item.approved++
    if (isCancelado(c)) item.cancelled++
    item.valor += Number(c.valor) || 0
  })
  return Array.from(map.values()).sort((a, b) => b.requested - a.requested)
}
