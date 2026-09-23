import { useState, useMemo } from 'react'
import { useKanbanData } from '@/hooks/use-kanban-data'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { KanbanFilters } from '@/components/kanban/kanban-filters'
import { ContactModal } from '@/components/shared/contact-modal'
import {
  Contact,
  updateContact,
  createContact,
  notifyResponsavelTransfer,
  notifyReabertura,
  canEditContact,
} from '@/services/contacts'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getSafeErrorMessage } from '@/lib/safe-error'

export default function Index() {
  const { user, profile, managedUserIds } = useAuth()
  const {
    contacts,
    servicos,
    deptos,
    cancelReasons,
    responsaveis,
    origens,
    loading,
    moveContact,
    setContacts,
  } = useKanbanData(profile, managedUserIds)
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [deptoId, setDeptoId] = useState('all')
  const [servicoId, setServicoId] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const handleView = (contact: Contact) => {
    setSelectedContact(contact)
    setModalMode('view')
    setModalOpen(true)
  }

  const handleEdit = (contact: Contact) => {
    if (!canEditContact(contact, profile, managedUserIds)) {
      toast({
        title: 'Aviso',
        description:
          profile?.perfil === 'gestor'
            ? 'Gestor só pode editar atendimentos próprios ou da sua equipe.'
            : 'Você só pode editar seus próprios atendimentos.',
        variant: 'destructive',
      })
      return
    }
    setSelectedContact(contact)
    setModalMode('edit')
    setModalOpen(true)
  }

  const handleSaveContact = async (payload: Partial<Contact>, id?: string, prevStage?: string) => {
    try {
      if (profile?.perfil !== 'administrador') {
        delete payload.valor
      }

      if (id) {
        const previousContact = contacts.find((c) => c.id === id)
        if (!canEditContact(previousContact, profile, managedUserIds)) {
          toast({
            title: 'Aviso',
            description:
              profile?.perfil === 'gestor'
                ? 'Gestor só pode editar atendimentos próprios ou da sua equipe.'
                : 'Você só pode editar seus próprios atendimentos.',
            variant: 'destructive',
          })
          return
        }

        if (profile?.perfil === 'operacional') {
          // Operacional não pode transferir responsabilidade
          delete payload.responsavel_id
        }

        const previousResponsavelId = previousContact?.responsavel_id || null
        const newResponsavelId =
          payload.responsavel_id !== undefined ? payload.responsavel_id : previousResponsavelId
        const previousStage = prevStage || previousContact?.current_stage || null
        const newStage = payload.current_stage !== undefined ? payload.current_stage : previousStage

        const updated = await updateContact(id, payload, prevStage, user?.id)
        setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)))
        toast({ title: 'Sucesso', description: 'Contato atualizado.' })

        // 1. Notificação de Nova atribuição (se responsável mudou)
        if (newResponsavelId && newResponsavelId !== previousResponsavelId) {
          notifyResponsavelTransfer(id, previousResponsavelId, newResponsavelId).catch(
            (notifyError) => {
              console.error(
                'Erro ao enviar notificação de transferência de responsável:',
                notifyError,
              )
              toast({
                title: 'Aviso',
                description: 'O responsável foi alterado, mas a notificação não pôde ser enviada.',
                variant: 'default',
              })
            },
          )
        }

        // 2. Notificação de Reabertura (se cancelado -> outro estágio permitido)
        if (
          previousStage === 'cancelado' &&
          newStage &&
          newStage !== 'cancelado' &&
          newStage !== 'orcamento_aprovado' &&
          newResponsavelId
        ) {
          notifyReabertura(id, previousStage, newStage, newResponsavelId).catch((notifyError) => {
            console.error('Erro ao enviar notificação de reabertura de atendimento:', notifyError)
            toast({
              title: 'Aviso',
              description:
                'O atendimento foi reaberto, mas a notificação por e-mail não pôde ser enviada.',
              variant: 'default',
            })
          })
        }
      } else {
        const created = await createContact(payload)
        setContacts((prev) => [created, ...prev])
        toast({ title: 'Sucesso', description: 'Contato criado.' })
      }
      setModalOpen(false)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: getSafeErrorMessage(error, 'Falha ao salvar atendimento.'),
        variant: 'destructive',
      })
    }
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
      return true
    })
  }, [contacts, search, deptoId, servicoId])

  return (
    <div className="p-3 sm:p-4 w-full max-w-[100vw] overflow-hidden flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-zinc-950/50">
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
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        contact={selectedContact}
        mode={modalMode}
        onSave={handleSaveContact}
        servicos={servicos}
        deptos={deptos}
        cancelReasons={cancelReasons}
        origens={origens}
        responsaveis={responsaveis}
      />
    </div>
  )
}
