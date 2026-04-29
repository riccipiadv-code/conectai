import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getContacts, updateContactStage, Contact } from '@/services/contacts'
import { Loader2, Search, Edit2, MessageCircle, Filter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const getStageLabel = (stage: string) => {
  const map: Record<string, string> = {
    novo: 'Novo',
    triagem_n1: 'Triagem N1',
    nivel_2: 'Nível 2',
    aguardando_cliente: 'Aguardando Cliente',
    aprovado: 'Aprovado',
    cancelado: 'Cancelado',
  }
  return map[stage] || stage.replace('_', ' ')
}

const getStageColor = (stage: string) => {
  switch (stage) {
    case 'novo':
      return 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    case 'triagem_n1':
      return 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800'
    case 'nivel_2':
      return 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800'
    case 'aguardando_cliente':
      return 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800'
    case 'aprovado':
      return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800'
    case 'cancelado':
      return 'bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800'
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  }
}

const getSlaLabel = (sla: string) => {
  switch (sla) {
    case 'green':
      return 'No prazo'
    case 'yellow':
      return 'Atenção'
    case 'red':
      return 'Atrasado'
    case 'paused':
      return 'Pausado'
    case 'done':
      return 'Finalizado'
    default:
      return 'N/A'
  }
}

const getSlaColor = (sla: string) => {
  switch (sla) {
    case 'green':
      return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900'
    case 'yellow':
      return 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900'
    case 'red':
      return 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900'
    case 'paused':
      return 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800'
    case 'done':
      return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900'
    default:
      return 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 dark:bg-gray-900/50 dark:text-gray-400 dark:border-gray-800'
  }
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [newStage, setNewStage] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await getContacts()
        setContacts(data)
      } catch (error) {
        console.error('Failed to fetch contacts', error)
      } finally {
        setLoading(false)
      }
    }
    fetchContacts()
  }, [])

  const filteredContacts = contacts.filter(
    (contact) =>
      (contact.nome?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (contact.telefone || '').includes(search) ||
      (contact.manychat_id || '').includes(search) ||
      (contact.lead_email?.toLowerCase() || '').includes(search.toLowerCase()),
  )

  const getInitials = (name?: string | null) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setNewStage(contact.current_stage || 'novo')
  }

  const handleSave = async () => {
    if (!editingContact) return
    setSaving(true)
    try {
      await updateContactStage(editingContact.id, newStage)
      toast({ title: 'Sucesso', description: 'Estágio atualizado com sucesso.' })
      setContacts(
        contacts.map((c) => (c.id === editingContact.id ? { ...c, current_stage: newStage } : c)),
      )
      setEditingContact(null)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o estágio.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            CRM - Atendimentos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os contatos sincronizados e seus respectivos SLAs.
          </p>
        </div>
      </div>

      <Card className="border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800/50 bg-slate-50/30 dark:bg-zinc-900/20 pb-4">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            Filtros e Busca
          </CardTitle>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="pl-9 bg-white dark:bg-zinc-950 border-slate-200 shadow-sm focus-visible:ring-primary/20 h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex py-20 items-center justify-center flex-col gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
              <p className="text-sm text-slate-500 font-medium">Carregando contatos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-zinc-900/50">
                  <TableRow className="hover:bg-transparent border-slate-200/60 dark:border-zinc-800">
                    <TableHead className="font-semibold text-slate-600 py-4 px-6">
                      Contato
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4">
                      Serviço / Lead
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4">Estágio</TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4">SLA</TableHead>
                    <TableHead className="font-semibold text-slate-600 py-4 text-right px-6">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="h-8 w-8 text-slate-300" />
                          <p>Nenhum contato encontrado para a busca atual.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContacts.map((contact) => (
                      <TableRow
                        key={contact.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors border-slate-100 dark:border-zinc-800/50"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 border border-slate-200/50 shadow-sm">
                              <AvatarImage src={contact.foto || ''} alt={contact.nome || ''} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {getInitials(contact.lead_nome || contact.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
                                {contact.lead_nome || contact.nome || 'Sem nome'}
                              </span>
                              <span className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
                                {contact.whatsapp_phone || contact.telefone || 'Sem telefone'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {contact.lead_servico || '-'}
                            </span>
                            <span className="text-sm text-slate-500 truncate max-w-[220px] mt-0.5">
                              {contact.lead_empresa_pf ||
                                contact.lead_email ||
                                'Sem dados adicionais'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`font-medium px-2.5 py-1 border shadow-sm ${getStageColor(
                              contact.current_stage || 'novo',
                            )}`}
                          >
                            {getStageLabel(contact.current_stage || 'novo')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`font-semibold px-2.5 py-1 border shadow-sm flex inline-flex items-center gap-1.5 w-fit ${getSlaColor(
                              contact.sla_status || 'green',
                            )}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                contact.sla_status === 'green'
                                  ? 'bg-emerald-500'
                                  : contact.sla_status === 'yellow'
                                    ? 'bg-amber-500'
                                    : contact.sla_status === 'red'
                                      ? 'bg-rose-500'
                                      : 'bg-slate-400'
                              }`}
                            ></span>
                            {getSlaLabel(contact.sla_status || 'green')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {contact.manychat_live_chat_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                title="Abrir no ManyChat"
                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <a
                                  href={contact.manychat_live_chat_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(contact)}
                              title="Editar Estágio"
                              className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Atualizar Estágio</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-500 font-medium">Contato Atual</Label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={editingContact?.foto || ''} />
                  <AvatarFallback>
                    {getInitials(editingContact?.lead_nome || editingContact?.nome)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {editingContact?.lead_nome || editingContact?.nome || ''}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500 font-medium">Novo Estágio Kanban</Label>
              <Select value={newStage} onValueChange={setNewStage}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione um estágio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="triagem_n1">Triagem N1</SelectItem>
                  <SelectItem value="nivel_2">Nível 2</SelectItem>
                  <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)} className="h-10">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="h-10 px-8">
              {saving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
