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

export const getDashboardStageLabel = (stageId: string | null | undefined): string => {
  if (!stageId) return 'Sem Estágio'
  return DASHBOARD_STAGE_LABELS[stageId] || stageId
}

export const isFechado = (contact: any): boolean => {
  return Number(contact?.valor) > 0
}
