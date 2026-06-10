export const OFFICIAL_STAGES = [
  { id: 'nivel_1_novo', label: 'Nível 1 - Novo' },
  { id: 'nivel_2_especialista', label: 'Nível 2 - Especialista' },
  { id: 'nivel_3_especial', label: 'Nível 3 - Especial' },
  { id: 'reuniao_consulta_agendada', label: 'Reunião/Consulta Agendada' },
  { id: 'enviado_orcamento_ag_retorno', label: 'Enviado Orçamento / Aguardando Retorno' },
  { id: 'orcamento_aprovado', label: 'Orçamento Aprovado' },
  { id: 'cancelado', label: 'Cancelado' },
]

export const DEFAULT_STAGES = [
  'nivel_1_novo',
  'nivel_2_especialista',
  'nivel_3_especial',
  'reuniao_consulta_agendada',
  'enviado_orcamento_ag_retorno',
]

export const isValidStage = (stage: string | null | undefined): boolean => {
  if (!stage) return true
  return OFFICIAL_STAGES.some((s) => s.id === stage)
}
