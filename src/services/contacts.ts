import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Contact = Database['public']['Tables']['manychat_contatos']['Row'] & {
  current_stage?: string
  sla_status?: string
}

export async function getContacts() {
  const { data, error } = await supabase
    .from('manychat_contatos')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data as Contact[]
}

export async function updateContact(id: string, updates: Partial<Contact>, previousStage?: string) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id || null
  const now = new Date().toISOString()

  if (updates.current_stage && previousStage && updates.current_stage !== previousStage) {
    const newStage = updates.current_stage
    const validTransitions: Record<string, string[]> = {
      novo: ['triagem_n1'],
      triagem_n1: ['nivel_2'],
      nivel_2: ['aguardando_cliente'],
      aguardando_cliente: ['aprovado', 'cancelado'],
      aprovado: [],
      cancelado: [],
    }
    const allowed = validTransitions[previousStage] || []
    if (!allowed.includes(newStage)) {
      throw new Error(
        `Transição de estágio não permitida: de '${previousStage}' para '${newStage}'`,
      )
    }
    updates.last_stage_change_at = now
  }

  const { error } = await supabase
    .from('manychat_contatos')
    .update({
      ...updates,
      manual_updated_at: now,
      manual_updated_by: userId,
    })
    .eq('id', id)

  if (error) throw error

  if (updates.current_stage && previousStage && updates.current_stage !== previousStage) {
    const { data: contact } = await supabase
      .from('manychat_contatos')
      .select('manychat_id')
      .eq('id', id)
      .single()
    if (contact) {
      await supabase.from('mc_kanban_history').insert({
        contato_id: id,
        manychat_id: contact.manychat_id,
        previous_stage: previousStage,
        new_stage: updates.current_stage,
        changed_by: userId,
        created_at: now,
      })
    }
  }
}

export async function deleteContact(id: string) {
  const { data: userData } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('manychat_contatos')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userData?.user?.id ?? null,
    })
    .eq('id', id)

  if (error) throw error
}

export async function updateContactStage(id: string, newStage: string) {
  // 1. Obter contato atual
  const { data: contact, error: fetchError } = await supabase
    .from('manychat_contatos')
    .select('id, manychat_id, current_stage')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError
  if (!contact) throw new Error('Contato não encontrado')

  const currentStage = contact.current_stage || 'novo'

  if (currentStage === newStage) return

  // 2. Validar transição de estágio
  const validTransitions: Record<string, string[]> = {
    novo: ['triagem_n1'],
    triagem_n1: ['nivel_2'],
    nivel_2: ['aguardando_cliente'],
    aguardando_cliente: ['aprovado', 'cancelado'],
    aprovado: [],
    cancelado: [],
  }

  const allowed = validTransitions[currentStage] || []
  if (!allowed.includes(newStage)) {
    throw new Error(`Transição de estágio não permitida: de '${currentStage}' para '${newStage}'`)
  }

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id || null

  const now = new Date().toISOString()

  // 3. Atualizar o contato
  const { error: updateError } = await supabase
    .from('manychat_contatos')
    .update({
      current_stage: newStage,
      last_stage_change_at: now,
      updated_at: now,
    })
    .eq('id', id)

  if (updateError) throw updateError

  // 4. Registrar histórico
  const { error: historyError } = await supabase.from('mc_kanban_history').insert({
    contato_id: contact.id,
    manychat_id: contact.manychat_id,
    previous_stage: currentStage,
    new_stage: newStage,
    changed_by: userId,
    created_at: now,
  })

  if (historyError) {
    console.error('Erro ao salvar histórico do kanban:', historyError)
    throw historyError
  }
}

export async function getDashboardStats() {
  const { count: totalContacts, error: contactsError } = await supabase
    .from('manychat_contatos')
    .select('*', { count: 'exact', head: true })

  if (contactsError) throw contactsError

  const { count: activeSyncs, error: syncsError } = await supabase
    .from('manychat_sync_control')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success')

  if (syncsError) throw syncsError

  const { count: recentMessages, error: msgsError } = await supabase
    .from('mc_messages')
    .select('*', { count: 'exact', head: true })

  if (msgsError) throw msgsError

  return {
    totalContacts: totalContacts || 0,
    successfulSyncs: activeSyncs || 0,
    totalMessages: recentMessages || 0,
  }
}
