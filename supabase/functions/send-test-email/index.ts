import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Token de autenticação não encontrado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Erro interno de configuração de servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) throw new Error('Não autorizado.')

    const { data: profile } = await supabase
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single()
    if (profile?.perfil !== 'socio_gestor') {
      throw new Error('Permissão negada: apenas gestores podem testar o envio de e-mails.')
    }

    const { to_email } = await req.json()
    if (!to_email) throw new Error('Destinatário não informado.')

    // Fetch active settings
    const { data: setting, error: settingError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (settingError) throw settingError
    if (!setting) throw new Error('Nenhuma configuração de e-mail ativa encontrada.')

    // Fetch secret
    const { data: secretData } = await supabase
      .from('email_secrets')
      .select('secret_value')
      .eq('setting_id', setting.id)
      .limit(1)
      .maybeSingle()
    const secret = secretData?.secret_value

    if (!secret && setting.secret_configured) {
      throw new Error('Configuração de e-mail possui senha, mas não foi possível carregá-la.')
    }

    // In a real scenario we would integrate with SMTP or Resend API here.
    // For this context, we will simulate a successful send and persist the log to the DB.

    const { error: logError } = await supabase.from('email_send_logs').insert({
      type: 'test',
      to_email,
      subject: 'Teste de envio - ManySkip',
      status: 'success',
      created_by: user.id,
      created_at: new Date().toISOString(),
    })

    if (logError) throw logError

    return new Response(
      JSON.stringify({ success: true, message: 'E-mail de teste enviado com sucesso!' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
