import { useState, useMemo } from 'react'
import { useKanbanData } from '@/hooks/use-kanban-data'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { KanbanFilters } from '@/components/kanban/kanban-filters'
import { ContactModal } from '@/components/shared/contact-modal'
import { Contact } from '@/services/contacts'

export default function Index() {
  const { contacts, servicos, deptos, loading, moveContact } = useKanbanData()

  const [search, setSearch] = useState('')
  const [deptoId, setDeptoId] = useState('all')
  const [servicoId, setServicoId] = useState('all')
  const [slaStatus, setSlaStatus] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const handleView = (contact: Contact) => {
    setSelectedContact(contact)
    setModalMode('view')
    setModalOpen(true)
  }

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact)
    setModalMode('edit')
    setModalOpen(true)
  }

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (
        search &&
        !c.nome?.toLowerCase().includes(search.toLowerCase()) &&
        !c.lead_nome?.toLowerCase().includes(search.toLowerCase())
      )
        return false
      if (deptoId !== 'all' && String(c.depto_id) !== deptoId) return false
      if (servicoId !== 'all' && c.servico_id !== servicoId) return false
      if (slaStatus !== 'all' && c.sla_status !== slaStatus) return false
      return true
    })
  }, [contacts, search, deptoId, servicoId, slaStatus])

  return (
    <div className="p-6 w-full max-w-[100vw] overflow-hidden flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-zinc-950/50">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Kanban</h1>
      </div>

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

      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white dark:bg-zinc-950 rounded-xl border shadow-sm">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Carregando kanban...</p>
          </div>
        ) : (
          <KanbanBoard
            contacts={filteredContacts}
            deptos={deptos}
            onMoveContact={moveContact}
            onEdit={handleEdit}
            onView={handleView}
          />
        )}
      </div>

      <ContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contact={selectedContact}
        mode={modalMode}
      />
    </div>
  )
}
