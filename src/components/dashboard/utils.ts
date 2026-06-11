export const DASHBOARD_STAGE_LABELS: Record<string, string> = {
  nivel_1_novo: 'Novo Lead',
  nivel_2_especialista: 'Em Atendimento',
  nivel_3_especial: 'Nível 3 - Especial',
  reuniao_consulta_agendada: 'Reunião Agendada',
  aguardando_documentos: 'Aguardando Documentos',
  enviado_orcamento_ag_retorno: 'Enviado Orçamento / Aguardando Retorno',
  orcamento_aprovado: 'Orçamento Aprovado',
  cancelado: 'Cancelado',
}

export const getDashboardStageLabel = (stageId: string | null | undefined): string => {
  if (!stageId) return 'Sem Estágio'
  return DASHBOARD_STAGE_LABELS[stageId] || stageId
}
