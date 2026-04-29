import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardStats } from '@/services/contacts'
import {
  Users,
  Activity,
  MessageSquare,
  Loader2,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from 'lucide-react'

export default function Index() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    successfulSyncs: 0,
    totalMessages: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch stats', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Dashboard
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Visão geral do desempenho e integrações do CRM.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Total de Contatos
            </CardTitle>
            <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              {stats.totalContacts.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-slate-500 mt-2 font-medium">
              <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
              <span className="text-emerald-600">Sincronizados ativos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Sincronizações Realizadas
            </CardTitle>
            <div className="h-8 w-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              {stats.successfulSyncs.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-slate-500 mt-2 font-medium">
              <span>Execuções concluídas via webhook</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Total de Mensagens
            </CardTitle>
            <div className="h-8 w-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              {stats.totalMessages.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-slate-500 mt-2 font-medium">
              <span>Mensagens no histórico do chat</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm mt-6">
        <CardHeader className="border-b border-slate-100 dark:border-zinc-800/50 bg-slate-50/30 dark:bg-zinc-900/20">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-950 shadow-sm">
              <div className="h-4 w-4 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Sistemas Operacionais
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                As integrações com o ManyChat estão ativas e monitorando novos eventos em tempo
                real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
