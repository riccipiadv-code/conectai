export const OFFICIAL_STAGES = [
  { id: 'nivel_1_novo', label: 'Novo Lead' },
  { id: 'nivel_2_especialista', label: 'Em Atendimento' },
  { id: 'nivel_3_especial', label: 'Nível 3 - Especial' },
  { id: 'reuniao_consulta_agendada', label: 'Reunião Agendada' },
  { id: 'aguardando_documentos', label: 'Aguardando Documentos' },
  { id: 'enviado_orcamento_ag_retorno', label: 'Enviado Orçamento / Aguardando Retorno' },
  { id: 'orcamento_aprovado', label: 'Orçamento Aprovado' },
  { id: 'cancelado', label: 'Cancelado' },
]

export const DEFAULT_STAGES = [
  'nivel_1_novo',
  'nivel_2_especialista',
  'nivel_3_especial',
  'reuniao_consulta_agendada',
  'aguardando_documentos',
  'enviado_orcamento_ag_retorno',
]

export const isValidStage = (stage: string | null | undefined): boolean => {
  if (!stage) return true
  return OFFICIAL_STAGES.some((s) => s.id === stage)
}

export const getStageLabel = (stageId: string | null | undefined): string => {
  if (!stageId) return 'Sem Estágio'
  const found = OFFICIAL_STAGES.find((s) => s.id === stageId)
  return found ? found.label : stageId
}
