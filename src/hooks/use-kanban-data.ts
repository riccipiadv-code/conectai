import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getContacts,
  getServicos,
  getDeptos,
  getCancelReasons,
  getResponsaveis,
  updateContactStage,
  Contact,
  Servico,
  Depto,
  CancelReason,
  Responsavel,
} from '@/services/contacts'
import { useToast } from '@/hooks/use-toast'

export function useKanbanData() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [deptos, setDeptos] = useState<Depto[]>([])
  const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([])
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const contactsRef = useRef<Contact[]>([])

  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  const fetchData = useCallback(async () => {
    try {
      const [c, s, d, r, resp] = await Promise.all([
        getContacts({ limit: 1000 }),
        getServicos(),
        getDeptos(),
        getCancelReasons(),
        getResponsaveis(),
      ])
      setContacts(c)
      setServicos(s)
      setDeptos(d)
      setCancelReasons(r)
      setResponsaveis(resp)
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

  const moveContact = useCallback(
    async (id: string, newStage: string) => {
      const currentContacts = contactsRef.current
      const contact = currentContacts.find((c) => c.id === id)

      if (!contact || contact.current_stage === newStage) return

      const previousStage = contact.current_stage
      const previousCancelReasonId = contact.cancel_reason_id
      const previousCancelObs = contact.cancel_obs
      const previousLastStageChangeAt = contact.last_stage_change_at
      const previousUpdatedAt = contact.updated_at

      const now = new Date().toISOString()

      setContacts((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            const updated = {
              ...c,
              current_stage: newStage,
              last_stage_change_at: now,
              updated_at: now,
            }
            if (newStage !== 'cancelado') {
              updated.cancel_reason_id = null
              updated.cancel_obs = null
            }
            return updated
          }
          return c
        }),
      )

      try {
        await updateContactStage(id, newStage)
        toast({ title: 'Sucesso', description: 'Estágio atualizado.' })
      } catch (error: any) {
        setContacts((prev) =>
          prev.map((c) => {
            if (c.id === id) {
              return {
                ...c,
                current_stage: previousStage,
                last_stage_change_at: previousLastStageChangeAt,
                cancel_reason_id: previousCancelReasonId,
                cancel_obs: previousCancelObs,
                updated_at: previousUpdatedAt,
              }
            }
            return c
          }),
        )
        toast({
          title: 'Erro',
          description: 'Não foi possível mover o contato.',
          variant: 'destructive',
        })
      }
    },
    [toast],
  )

  return {
    contacts,
    servicos,
    deptos,
    cancelReasons,
    responsaveis,
    loading,
    moveContact,
    setContacts,
  }
}
