import { useState, useEffect, useCallback } from 'react'
import {
  getContacts,
  getServicos,
  getDeptos,
  getCancelReasons,
  updateContactStage,
  Contact,
  Servico,
  Depto,
  CancelReason,
} from '@/services/contacts'
import { useToast } from '@/hooks/use-toast'

export function useKanbanData() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [deptos, setDeptos] = useState<Depto[]>([])
  const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [c, s, d, r] = await Promise.all([
        getContacts(),
        getServicos(),
        getDeptos(),
        getCancelReasons(),
      ])
      setContacts(c)
      setServicos(s)
      setDeptos(d)
      setCancelReasons(r)
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro', description: 'Falha ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const moveContact = async (id: string, newStage: string) => {
    const contact = contacts.find((c) => c.id === id)
    if (!contact || contact.current_stage === newStage) return

    const previousStage = contact.current_stage
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, current_stage: newStage } : c)))

    try {
      await updateContactStage(id, newStage)
      toast({ title: 'Sucesso', description: 'Estágio atualizado' })
    } catch (error: any) {
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, current_stage: previousStage } : c)),
      )
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  return { contacts, servicos, deptos, cancelReasons, loading, moveContact, setContacts }
}
