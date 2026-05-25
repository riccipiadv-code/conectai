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
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] overflow-hidden px-4 md:px-6 lg:px-8 pt-4 md:pt-6">
      <div className="flex flex-col gap-1 mb-6 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          CRM - Kanban
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Acompanhe e gerencie o fluxo de atendimento dos seus contatos.
        </p>
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
