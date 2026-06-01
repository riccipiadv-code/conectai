import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader)
    return new Response(JSON.stringify({ error: 'Token não encontrado' }), {
      status: 401,
      headers: corsHeaders,
    })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor ausente.' }), {
      status: 500,
      headers: corsHeaders,
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
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()
    if (profile?.perfil !== 'socio_gestor' || !profile?.ativo) {
      throw new Error('Permissão negada. Apenas Sócios Gestores podem gerenciar usuários.')
    }

    const { actions } = await req.json()

    for (const action of actions) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('legaldesk_usuario_id', action.legaldesk_id)
        .maybeSingle()

      let profileId = existingProfile?.id

      if (!profileId) {
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', action.email)
          .maybeSingle()
        profileId = profileByEmail?.id
      }

      if (action.grant_access) {
        if (!profileId) {
          const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
            action.email,
            {
              data: { name: action.name },
            },
          )

          if (authError) {
            if (
              authError.message.includes('already exists') ||
              authError.message.includes('already registered')
            ) {
              const {
                data: { users },
              } = await supabase.auth.admin.listUsers()
              const u = users.find((u) => u.email === action.email)
              if (u) profileId = u.id
            } else {
              throw authError
            }
          } else {
            profileId = authData.user?.id
          }
        }

        if (profileId) {
          await supabase.from('profiles').upsert(
            {
              id: profileId,
              email: action.email,
              name: action.name,
              legaldesk_usuario_id: action.legaldesk_id,
              perfil: action.perfil || 'advogado',
              ativo: true,
            },
            { onConflict: 'id' },
          )
        }
      } else {
        if (profileId) {
          await supabase.from('profiles').update({ ativo: false }).eq('id', profileId)
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
