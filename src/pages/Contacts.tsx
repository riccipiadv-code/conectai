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
import { Loader2, Search, Edit2, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

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
      (contact.manychat_id || '').includes(search),
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

  const getSlaColor = (status?: string) => {
    if (status === 'green') return 'bg-green-500 hover:bg-green-600 text-white'
    if (status === 'yellow') return 'bg-yellow-500 hover:bg-yellow-600 text-white'
    if (status === 'red') return 'bg-red-500 hover:bg-red-600 text-white'
    return 'bg-gray-500 hover:bg-gray-600 text-white'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>CRM - Atendimentos</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex py-10 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead>Serviço / Lead</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum contato encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={contact.foto || ''} alt={contact.nome || ''} />
                              <AvatarFallback>{getInitials(contact.nome)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {contact.lead_nome || contact.nome || 'Sem nome'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {contact.whatsapp_phone || contact.telefone || 'Sem telefone'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {contact.lead_servico || '-'}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {contact.lead_empresa_pf || contact.lead_email || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {contact.current_stage?.replace('_', ' ') || 'novo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSlaColor(contact.sla_status)}>
                            {contact.sla_status === 'green'
                              ? 'No prazo'
                              : contact.sla_status === 'yellow'
                                ? 'Atenção'
                                : contact.sla_status === 'red'
                                  ? 'Atrasado'
                                  : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(contact)}
                              title="Editar Estágio"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {contact.manychat_live_chat_url && (
                              <Button variant="ghost" size="icon" asChild title="Abrir no ManyChat">
                                <a
                                  href={contact.manychat_live_chat_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Estágio do Contato</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Contato</Label>
              <Input disabled value={editingContact?.lead_nome || editingContact?.nome || ''} />
            </div>
            <div className="space-y-2">
              <Label>Estágio Kanban</Label>
              <Select value={newStage} onValueChange={setNewStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estágio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
