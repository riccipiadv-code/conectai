import { supabase } from '@/lib/supabase/client'
import { startOfMonth, subMonths, startOfYear, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { OFFICIAL_STAGES } from '@/constants/stages'

export const DEFAULT_ORIGIN_NAMES = ['Whatsapp', 'E-mail', 'Telefone']

export function isDefaultOriginName(nome: string): boolean {
  const lower = nome.toLowerCase()
  return DEFAULT_ORIGIN_NAMES.some((name) => lower.includes(name.toLowerCase()))
}

export interface DashboardFilters {
  period: string
  dateFrom: Date | null
  dateTo: Date | null
  origens: number[]
  servico_id: string
  depto_id: string
  responsavel_id: string
  current_stage: string
  orcamento: string
  follow_up: string
  search: string
}

export async function getDashboardData(filters: DashboardFilters) {
  const allData: any[] = []
  let from = 0
  const limit = 1000

  while (true) {
    let query = supabase
      .from('manychat_contatos')
      .select(`
        id, created_at, origem, origem_id, current_stage, valor, data_follow_up, 
        orcamento, servico_id, depto_id, responsavel_id, responsavel_core_usuario_id, cancel_reason_id, lead_nome, nome, first_name,
        telefone, lead_email, lead_empresa_pf, porte_empresa, controle, lead_resumo, numero_cliente,
        manychat_origens(nome),
        manychat_servicos(descricao),
        manychat_deptos(nome),
        manychat_cancel_reasons(motivo),
        manychat_portes_empresa(nome),
        core_usuarios!manychat_contatos_responsavel_core_usuario_id_fkey(nome)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters.period === 'current_month') {
      const start = startOfMonth(new Date())
      query = query.gte('created_at', start.toISOString())
    } else if (filters.period === 'prev_month') {
      const start = startOfMonth(subMonths(new Date(), 1))
      const end = endOfMonth(subMonths(new Date(), 1))
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
    } else if (filters.period === 'current_year') {
      const start = startOfYear(new Date())
      query = query.gte('created_at', start.toISOString())
    } else if (filters.period === 'custom' && filters.dateFrom && filters.dateTo) {
      const from = startOfDay(filters.dateFrom)
      const to = endOfDay(filters.dateTo)
      query = query.gte('created_at', from.toISOString()).lte('created_at', to.toISOString())
    }

    if (filters.origens && filters.origens.length > 0)
      query = query.in('origem_id', filters.origens)
    if (filters.servico_id) query = query.eq('servico_id', filters.servico_id)
    if (filters.depto_id) query = query.eq('depto_id', Number(filters.depto_id))
    // O filtro recebe o ID central (core_usuarios.id) vindo de getResponsaveis()
    if (filters.responsavel_id)
      query = query.eq('responsavel_core_usuario_id', filters.responsavel_id)
    if (filters.current_stage) query = query.eq('current_stage', filters.current_stage)
    if (filters.orcamento) query = query.eq('orcamento', filters.orcamento)

    if (filters.follow_up) {
      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()

      if (filters.follow_up === 'overdue') {
        query = query.lt('data_follow_up', todayStart).not('data_follow_up', 'is', null)
      } else if (filters.follow_up === 'today') {
        query = query.gte('data_follow_up', todayStart).lte('data_follow_up', todayEnd)
      } else if (filters.follow_up === 'future') {
        query = query.gt('data_follow_up', todayEnd)
      } else if (filters.follow_up === 'none') {
        query = query.is('data_follow_up', null)
      }
    }

    query = query.range(from, from + limit - 1)

    const { data, error } = await query
    if (error) throw error

    if (!data || data.length === 0) break

    const mapped = data.map((c: any) => {
      const stageObj = OFFICIAL_STAGES.find((s) => s.id === c.current_stage)
      return {
        ...c,
        origem: c.manychat_origens?.nome || c.origem || 'Não informada',
        data_entrada: c.created_at,
        responsavel_nome: c.core_usuarios?.nome || 'Sem responsável',
        lead_nome_exibicao: c.lead_nome || c.nome || c.first_name || 'Sem nome',
        email: c.lead_email || '',
        empresa_pf: c.lead_empresa_pf || '',
        servico_selecionado: c.manychat_servicos?.descricao || 'Sem serviço',
        departamento: c.manychat_deptos?.nome || 'Sem departamento',
        current_stage_label: stageObj ? stageObj.label : c.current_stage,
        cancel_reason: c.manychat_cancel_reasons?.motivo || c.cancel_reason || '',
      }
    })

    allData.push(...mapped)
    if (data.length < limit) break
    from += limit
  }

  return allData
}
