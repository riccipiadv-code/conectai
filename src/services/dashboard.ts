import { supabase } from '@/lib/supabase/client'
import { startOfMonth, subMonths, startOfYear, endOfMonth } from 'date-fns'

export interface DashboardFilters {
  period: string
  dateFrom: Date | null
  dateTo: Date | null
  origem: string
  servico_id: string
  depto_id: string
  responsavel_id: string
  current_stage: string
  orcamento: string
  sla_status: string
}

export async function getDashboardData(filters: DashboardFilters) {
  const allData: any[] = []
  let from = 0
  const limit = 1000

  while (true) {
    let query = supabase
      .from('manychat_contatos')
      .select(`
        id, created_at, origem, current_stage, valor, data_follow_up, sla_status, 
        orcamento, servico_id, depto_id, responsavel_id, cancel_reason_id, lead_nome, nome,
        manychat_servicos(descricao),
        manychat_cancel_reasons(motivo),
        legaldesk_usuarios(nome)
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
      query = query
        .gte('created_at', filters.dateFrom.toISOString())
        .lte('created_at', filters.dateTo.toISOString())
    }

    if (filters.origem) query = query.eq('origem', filters.origem)
    if (filters.servico_id) query = query.eq('servico_id', filters.servico_id)
    if (filters.depto_id) query = query.eq('depto_id', filters.depto_id)
    if (filters.responsavel_id) query = query.eq('responsavel_id', filters.responsavel_id)
    if (filters.current_stage) query = query.eq('current_stage', filters.current_stage)
    if (filters.orcamento) query = query.eq('orcamento', filters.orcamento)
    if (filters.sla_status) query = query.eq('sla_status', filters.sla_status)

    query = query.range(from, from + limit - 1)

    const { data, error } = await query
    if (error) throw error

    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < limit) break
    from += limit
  }

  return allData
}
