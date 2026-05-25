import { useState } from 'react'
import { useKanbanData } from '@/hooks/use-kanban-data'
import { KanbanFilters } from '@/components/kanban/kanban-filters'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { ContactModal } from '@/components/shared/contact-modal'
import { Contact, updateContact } from '@/services/contacts'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function KanbanPage() {
  const { contacts, servicos, deptos, cancelReasons, loading, moveContact, setContacts } =
    useKanbanData()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [deptoId, setDeptoId] = useState('all')
  const [servicoId, setServicoId] = useState('all')
  const [slaStatus, setSlaStatus] = useState('all')

  const [modalContact, setModalContact] = useState<Contact | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view')

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </div>
    )
  }

  const filteredContacts = contacts.filter((c) => {
    const matchSearch =
      !search ||
      (c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.lead_nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.telefone || '').includes(search) ||
      (c.whatsapp_phone || '').includes(search)

    const matchDepto = deptoId === 'all' || String(c.depto_id) === deptoId
    const matchServico = servicoId === 'all' || c.servico_id === servicoId
    const matchSla = slaStatus === 'all' || c.sla_status === slaStatus

    return matchSearch && matchDepto && matchServico && matchSla
  })

  const handleSaveContact = async (id: string, payload: Partial<Contact>, prevStage: string) => {
    await updateContact(id, payload, prevStage)
    toast({ title: 'Sucesso', description: 'Contato atualizado com sucesso.' })
    setContacts(contacts.map((c) => (c.id === id ? { ...c, ...payload } : c)))
    setModalContact(null)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <KanbanFilters
        search={search}
        onSearchChange={setSearch}
        deptoId={deptoId}
        onDeptoChange={setDeptoId}
        servicoId={servicoId}
        onServicoChange={setServicoId}
        slaStatus={slaStatus}
        onSlaChange={setSlaStatus}
        deptos={deptos}
        servicos={servicos}
        totalContacts={filteredContacts.length}
      />
      <KanbanBoard
        contacts={filteredContacts}
        deptos={deptos}
        onMoveContact={moveContact}
        onEdit={(c) => {
          setModalContact(c)
          setModalMode('edit')
        }}
        onView={(c) => {
          setModalContact(c)
          setModalMode('view')
        }}
      />
      <ContactModal
        contact={modalContact}
        mode={modalMode}
        isOpen={!!modalContact}
        onClose={() => setModalContact(null)}
        onSave={handleSaveContact}
        servicos={servicos}
        deptos={deptos}
        cancelReasons={cancelReasons}
      />
    </div>
  )
}
