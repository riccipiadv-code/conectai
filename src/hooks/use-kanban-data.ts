import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  getContacts,
  getServicos,
  getDeptos,
  getCancelReasons,
  getResponsaveis,
  getOrigens,
  updateContactStage,
  notifyReabertura,
  Contact,
  Servico,
  Depto,
  CancelReason,
  Responsavel,
  Origem,
} from '@/services/contacts'
import { useToast } from '@/hooks/use-toast'

export function useKanbanData() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [deptos, setDeptos] = useState<Depto[]>([])
  const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([])
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [origens, setOrigens] = useState<Origem[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const contactsRef = useRef<Contact[]>([])

  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  const fetchData = useCallback(async () => {
    try {
      const [c, s, d, r, resp, o] = await Promise.all([
        getContacts({ limit: 1000 }),
        getServicos(),
        getDeptos(),
        getCancelReasons(),
        getResponsaveis(),
        getOrigens(),
      ])
      setContacts(c)
      setServicos(s)
      setDeptos(d)
      setCancelReasons(r)
      setResponsaveis(resp)
      setOrigens(o)
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
      const contact = currentContacts.find((c: any) => c.id === id)

      if (!contact || contact.current_stage === newStage) return

      // Obter perfil autenticado atual para validação
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('perfil, legaldesk_usuario_id, ativo')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (profile && profile.ativo === false) {
          toast({
            title: 'Acesso Negado',
            description: 'Seu usuário está desativado.',
            variant: 'destructive',
          })
          return
        }

        if (profile?.perfil === 'operacional') {
          const userLdId = profile.legaldesk_usuario_id
          const currentResp = contact.responsavel_id
          if (!userLdId || !currentResp || String(currentResp) !== String(userLdId)) {
            toast({
              title: 'Aviso',
              description: 'Operacional só pode alterar o status de seus próprios atendimentos.',
              variant: 'destructive',
            })
            return
          }
        }
      }

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
        toast({ title: 'Sucesso', description: 'Status atualizado.' })

        if (
          previousStage === 'cancelado' &&
          newStage !== 'cancelado' &&
          newStage !== 'orcamento_aprovado' &&
          contact.responsavel_id
        ) {
          notifyReabertura(id, previousStage, newStage, contact.responsavel_id).catch(
            (notifyError) => {
              console.error('Erro ao enviar notificação de reabertura de atendimento:', notifyError)
              toast({
                title: 'Aviso',
                description:
                  'O atendimento foi reaberto, mas a notificação por e-mail não pôde ser enviada.',
                variant: 'default',
              })
            },
          )
        }
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
    origens,
    loading,
    moveContact,
    setContacts,
  }
}
