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

export const getEmailSettings = async () => {
  const { data, error } = await supabase
    .from('email_settings' as any)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as EmailSetting[]
}

export const saveEmailSetting = async (setting: EmailSetting, secret?: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not found')

  let savedSetting
  const payload = {
    provider: setting.provider,
    sender_name: setting.sender_name,
    sender_email: setting.sender_email,
    reply_to: setting.reply_to || null,
    smtp_host: setting.smtp_host || null,
    smtp_port: setting.smtp_port || null,
    smtp_user: setting.smtp_user || null,
    smtp_secure: setting.smtp_secure,
    active: setting.active,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (setting.id) {
    const { data, error } = await supabase
      .from('email_settings' as any)
      .update(payload)
      .eq('id', setting.id)
      .select()
      .single()
    if (error) throw error
    savedSetting = data
  } else {
    const { data, error } = await supabase
      .from('email_settings' as any)
      .insert([{ ...payload, created_at: new Date().toISOString() }])
      .select()
      .single()
    if (error) throw error
    savedSetting = data
  }

  if (secret) {
    const { error: secretError } = await supabase
      .from('email_secrets' as any)
      .upsert(
        { setting_id: savedSetting.id, secret_value: secret, updated_at: new Date().toISOString() },
        { onConflict: 'setting_id' },
      )
    if (secretError) throw secretError

    await supabase
      .from('email_settings' as any)
      .update({ secret_configured: true })
      .eq('id', savedSetting.id)
  }

  return savedSetting
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
  return data
}
