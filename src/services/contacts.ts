import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Contact = Database['public']['Tables']['manychat_contatos']['Row']

export async function getContacts() {
  const { data, error } = await supabase
    .from('manychat_contatos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data
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
