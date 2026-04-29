import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Eye, Copy, Check, TerminalSquare } from 'lucide-react'
import { format } from 'date-fns'

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('integration_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setLogs(data || [])
      setLoading(false)
    }
    fetchLogs()
  }, [])

  const handleCopy = () => {
    if (!selectedLog?.payload) return
    navigator.clipboard.writeText(JSON.stringify(selectedLog.payload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'processed' || status === 'success') {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium"
        >
          Sucesso
        </Badge>
      )
    }
    if (status === 'error') {
      return (
        <Badge
          variant="outline"
          className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 font-medium"
        >
          Erro
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 font-medium"
      >
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Logs de Integração
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Monitoramento em tempo real dos webhooks recebidos do ManyChat.
          </p>
        </div>
      </div>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-zinc-800/50 bg-slate-50/30 dark:bg-zinc-900/20 pb-4">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-slate-400" />
            Histórico de Requisições
          </CardTitle>
          <CardDescription>Últimos 50 eventos processados pela Edge Function.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex py-20 items-center justify-center flex-col gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
              <p className="text-sm text-slate-500 font-medium">Carregando logs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-zinc-900/50">
                  <TableRow className="hover:bg-transparent border-slate-200/60 dark:border-zinc-800">
                    <TableHead className="font-semibold text-slate-600 py-4 px-6 w-[180px]">
                      Data e Hora
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4">Evento</TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4">ID ManyChat</TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4 text-right px-6">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 border-slate-100 dark:border-zinc-800/50 transition-colors"
                    >
                      <TableCell className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-400">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-500/10">
                          {log.event_type}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 font-mono text-sm text-slate-700 dark:text-slate-300">
                        {log.subscriber_id || '-'}
                      </TableCell>
                      <TableCell className="py-4">
                        {getStatusBadge(log.status)}
                        {log.error_message && (
                          <div
                            className="text-xs text-rose-500 mt-1 max-w-[200px] truncate"
                            title={log.error_message}
                          >
                            {log.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-slate-500">
                        Nenhum log de integração encontrado no momento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader className="flex flex-row items-center justify-between pr-6">
            <DialogTitle className="text-lg flex items-center gap-2">
              <TerminalSquare className="h-5 w-5 text-slate-400" />
              Detalhes do Payload
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5">
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? 'Copiado!' : 'Copiar JSON'}
            </Button>
          </DialogHeader>
          <div className="mt-4 bg-slate-950 rounded-lg p-4 overflow-x-auto max-h-[500px] shadow-inner border border-slate-800">
            <pre className="text-emerald-400 text-xs font-mono leading-relaxed">
              <code>{selectedLog ? JSON.stringify(selectedLog.payload, null, 2) : ''}</code>
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
