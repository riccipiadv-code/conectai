import { supabase } from '@/lib/supabase/client'

export interface EmailSetting {
  id?: string
  provider: string
  sender_name: string
  sender_email: string
  reply_to?: string
  smtp_host?: string
  smtp_port?: number | null
  smtp_user?: string
  smtp_secure?: boolean
  secret_configured?: boolean
  active?: boolean
}

export interface EmailReadingSetting {
  id: string
  email: string
  imap_host: string
  imap_port: number
  secret_configured: boolean
  active: boolean
}

export const getEmailSettings = async () => {
  const { data, error } = await supabase
    .from('email_settings' as any)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as EmailSetting[]
}

export const getEmailReadingSettings = async (): Promise<EmailReadingSetting | null> => {
  const { data, error } = await supabase
    .from('email_reading_settings')
    .select('id, email, imap_host, imap_port, secret_configured, active')
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as EmailReadingSetting | null
}

export const saveEmailSetting = async (setting: EmailSetting, secret?: string) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Unauthorized')

  const { data, error } = await supabase.functions.invoke('save-email-settings', {
    body: { setting, secret },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.setting
}

export const saveEmailReadingSetting = async (
  imapEmail: string,
  imapHost?: string,
  imapPort?: string | number | null,
  secret?: string,
) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Unauthorized')

  const { data, error } = await supabase.functions.invoke('save-email-reading-settings', {
    body: {
      email: imapEmail,
      imap_host: imapHost,
      imap_port: imapPort,
      secret,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.setting
}

export const sendTestEmail = async (toEmail: string) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Unauthorized')

  const { data, error } = await supabase.functions.invoke('send-test-email', {
    body: { to_email: toEmail },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export const testGmailConnection = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Unauthorized')

  const { data, error } = await supabase.functions.invoke('test-gmail-connection', {
    body: {},
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
