import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2, MessageSquare } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function Index() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Modals state mock for preserving actions
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<any>(null)

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('manychat_contatos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manychat_contatos' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: contacts, error } = await supabase
        .from('manychat_contatos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setData(contacts || [])
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar atendimentos',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleComments = (contact: any) => {
    setSelectedContact(contact)
    setCommentsOpen(true)
  }

  const handleView = (contact: any) => {
    setSelectedContact(contact)
    setViewOpen(true)
  }

  const handleEdit = (contact: any) => {
    setSelectedContact(contact)
    setEditOpen(true)
  }

  const handleDelete = (contact: any) => {
    setSelectedContact(contact)
    setDeleteOpen(true)
  }

  const formatStage = (stage: string | null) => {
    if (!stage) return 'Novo'
    return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const getSlaVariant = (sla: string | null) => {
    if (sla === 'red') return 'destructive'
    if (sla === 'yellow') return 'default'
    return 'secondary'
  }

  return (
    <div className="p-6 w-full max-w-[100vw] overflow-hidden flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Atendimentos</h1>
        <Button onClick={fetchData} variant="outline" size="sm">
          Atualizar
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table className="w-full">
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[220px] min-w-[220px] max-w-[220px]">Contato</TableHead>
                <TableHead className="w-[180px] min-w-[180px] max-w-[180px]">
                  Serviço / Empresa
                </TableHead>
                <TableHead className="w-[350px] min-w-[350px] max-w-[350px]">Consulta</TableHead>
                <TableHead className="whitespace-nowrap">Estágio</TableHead>
                <TableHead className="w-[110px] min-w-[110px] max-w-[110px]">Dt. FUP</TableHead>
                <TableHead className="whitespace-nowrap">Ações</TableHead>
                <TableHead className="text-right whitespace-nowrap pr-4">SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando atendimentos...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum atendimento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((contato) => (
                  <TableRow key={contato.id} className="hover:bg-muted/30">
                    {/* 1. Contato */}
                    <TableCell className="w-[220px] min-w-[220px] max-w-[220px] align-top py-3">
                      <div className="flex flex-col whitespace-normal break-words">
                        <span className="font-semibold text-sm text-foreground">
                          {contato.nome || contato.first_name || 'Sem nome'}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1 font-medium">
                          {contato.whatsapp_phone || contato.telefone || 'Sem telefone'}
                        </span>
                      </div>
                    </TableCell>

                    {/* 2. Serviço / Empresa */}
                    <TableCell className="w-[180px] min-w-[180px] max-w-[180px] align-top py-3">
                      <div className="flex flex-col whitespace-normal break-words">
                        <span className="text-sm font-medium text-foreground">
                          {contato.lead_servico || '-'}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {contato.lead_empresa_pf || '-'}
                        </span>
                      </div>
                    </TableCell>

                    {/* 3. Consulta */}
                    <TableCell className="w-[350px] min-w-[350px] max-w-[350px] align-top py-3">
                      <div
                        className="text-sm whitespace-normal break-words line-clamp-3 text-muted-foreground leading-relaxed"
                        title={contato.lead_resumo || ''}
                      >
                        {contato.lead_resumo || '-'}
                      </div>
                    </TableCell>

                    {/* 4. Estágio */}
                    <TableCell className="align-top py-3">
                      <Badge
                        variant="outline"
                        className="whitespace-nowrap bg-background font-medium"
                      >
                        {formatStage(contato.current_stage)}
                      </Badge>
                    </TableCell>

                    {/* 5. Dt. FUP */}
                    <TableCell className="w-[110px] min-w-[110px] max-w-[110px] align-top py-3">
                      <span className="text-sm whitespace-nowrap font-medium text-muted-foreground">
                        {contato.data_follow_up
                          ? format(parseISO(contato.data_follow_up), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </span>
                    </TableCell>

                    {/* 6. Ações */}
                    <TableCell className="align-top py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                          onClick={() => handleComments(contato)}
                          title="Comentários"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                          onClick={() => handleView(contato)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50"
                          onClick={() => handleEdit(contato)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                          onClick={() => handleDelete(contato)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>

                    {/* 7. SLA */}
                    <TableCell className="text-right align-top py-3 pr-4">
                      <Badge variant={getSlaVariant(contato.sla_status)}>
                        {contato.sla_status?.toUpperCase() || 'OK'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Preservation of Original Modals logic */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visualizar Contato</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Visualizando dados de {selectedContact?.nome || selectedContact?.first_name}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Editando dados de {selectedContact?.nome || selectedContact?.first_name}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Contato</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Tem certeza que deseja excluir o contato{' '}
            {selectedContact?.nome || selectedContact?.first_name}?
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(false)}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Gerenciar comentários de {selectedContact?.nome || selectedContact?.first_name}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
