import { useState, useEffect, useMemo } from 'react'
import {
  getDashboardData,
  DashboardFilters as FiltersType,
  isDefaultOriginName,
} from '@/services/dashboard'
import { getResponsaveis, getServicos, getDeptos, getOrigens } from '@/services/contacts'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { DashboardTables } from '@/components/dashboard/DashboardTables'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileText } from 'lucide-react'
import { exportDashboardExcel } from '@/services/export-dashboard'
import { DashboardContact } from '@/components/dashboard/utils'

export default function Dashboard() {
  const [data, setData] = useState<DashboardContact[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ responsaveis: [], servicos: [], deptos: [], origens: [] })
  const [metaLoaded, setMetaLoaded] = useState(false)

  const [filters, setFilters] = useState<FiltersType>({
    period: 'current_year',
    dateFrom: null,
    dateTo: null,
    origens: [],
    servico_id: '',
    depto_id: '',
    responsavel_id: '',
    current_stage: '',
    orcamento: '',
    sla_status: '',
    follow_up: '',
    search: '',
  })

  const filteredData = useMemo(() => {
    if (!filters.search) return data
    const s = filters.search.toLowerCase()
    return data.filter(
      (c: any) =>
        c.lead_nome_exibicao?.toLowerCase().includes(s) ||
        c.lead_nome?.toLowerCase().includes(s) ||
        c.nome?.toLowerCase().includes(s) ||
        c.first_name?.toLowerCase().includes(s) ||
        c.telefone?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.empresa_pf?.toLowerCase().includes(s) ||
        c.responsavel_nome?.toLowerCase().includes(s) ||
        c.servico_selecionado?.toLowerCase().includes(s) ||
        c.departamento?.toLowerCase().includes(s) ||
        c.origem?.toLowerCase().includes(s) ||
        String(c.controle || '').includes(s) ||
        String(c.numero_cliente || '').includes(s),
    )
  }, [data, filters.search])

  useEffect(() => {
    Promise.all([getResponsaveis(), getServicos(), getDeptos(), getOrigens()]).then(
      ([r, s, d, o]: any) => {
        setMeta({ responsaveis: r, servicos: s, deptos: d, origens: o })
        const defaultOriginIds = (o || [])
          .filter((orig: any) => isDefaultOriginName(orig.nome))
          .map((orig: any) => orig.id)
        setFilters((prev) => ({ ...prev, origens: defaultOriginIds }))
        setMetaLoaded(true)
      },
    )
  }, [])

  useEffect(() => {
    if (!metaLoaded) return
    setLoading(true)
    getDashboardData(filters)
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [filters, metaLoaded])

  const handleExport = () => {
    exportDashboardExcel(filteredData)
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Dashboard ({filteredData.length})
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Análise de atendimentos, conversões e performance da equipe
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={loading || filteredData.length === 0}
          className="shadow-sm"
        >
          <Download className="mr-2 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <DashboardFilters filters={filters} setFilters={setFilters} meta={meta} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary/80" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Carregando dados do dashboard...
          </p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800">
          <div className="h-16 w-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Nenhum dado encontrado
          </h3>
          <p className="text-muted-foreground mt-1 text-center max-w-sm">
            Não existem contatos correspondentes aos filtros selecionados. Tente ajustar a busca ou
            as opções.
          </p>
        </div>
      ) : (
        <div className="animate-fade-in-up">
          <DashboardKPIs data={filteredData} />
          <DashboardCharts data={filteredData} />
          <DashboardTables data={filteredData} />
        </div>
      )}
    </div>
  )
}
