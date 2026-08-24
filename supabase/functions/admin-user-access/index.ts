import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Token não encontrado' }), {
      status: 401,
      headers: corsHeaders,
    })
  }

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

    const body = await req.json()
    const { action, legaldesk_id, email, name, perfil } = body

    if (!action) {
      throw new Error('Parâmetro obrigatório ausente: action.')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (action === 'list_users') {
      if (!profile || !profile.ativo) {
        throw new Error('Permissão negada. Usuário sem perfil ativo.')
      }
      // 1. Consultar todos os legaldesk_usuarios onde exibir_gestao_usuarios = true ordenados por nome
      const { data: ldUsers, error: ldError } = await supabase
        .from('legaldesk_usuarios')
        .select('*')
        .eq('exibir_gestao_usuarios', true)
        .order('nome')

      if (ldError) throw ldError

      // 2. Consultar todos os profiles
      const { data: profiles, error: profError } = await supabase.from('profiles').select('*')

      if (profError) throw profError

      // 3. Consultar todos os usuários de auth.users via listUsers (uma única chamada)
      const {
        data: { users: authUsers },
        error: authListError,
      } = await supabase.auth.admin.listUsers({ perPage: 1000 })

      if (authListError) throw authListError

      // Criar Set dos IDs de auth existentes
      const authUserIdsSet = new Set((authUsers || []).map((u) => u.id))

      // 4. Cruzar dados para cada legaldesk_usuario
      const usersList = (ldUsers || []).map((ld) => {
        // Vínculo principal: legaldesk_usuario_id; Fallback: e-mail
        const prof =
          profiles?.find((p) => p.legaldesk_usuario_id === ld.id) ||
          (ld.email
            ? profiles?.find((p) => p.email?.toLowerCase() === ld.email?.toLowerCase())
            : undefined)

        const profileId = prof?.id || null
        const perfilVal = prof?.perfil || null
        const ativoSys = prof?.ativo ?? false
        const authUserExists = profileId ? authUserIdsSet.has(profileId) : false

        let status: 'sem_acesso' | 'ativo' | 'bloqueado' | 'inconsistente'

        if (!prof && !authUserExists) {
          status = 'sem_acesso'
        } else if (prof && authUserExists && ativoSys) {
          status = 'ativo'
        } else if (prof && authUserExists && !ativoSys) {
          status = 'bloqueado'
        } else if (prof && !authUserExists) {
          status = 'inconsistente'
        } else {
          // Caso de fallback seguro (ex: sem profile mas authUserExists, trata como sem_acesso ou inconsistente)
          status = 'sem_acesso'
        }

        return {
          legaldesk_id: ld.id,
          nome: ld.nome,
          sigla: ld.sigla || '',
          email: ld.email || prof?.email || '',
          ativo_ld: ld.ativo ?? false,
          profile_id: profileId,
          perfil: perfilVal,
          ativo_sys: ativoSys,
          auth_user_exists: authUserExists,
          status,
        }
      })

      return new Response(JSON.stringify({ users: usersList }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list_hidden_users') {
      if (!profile || !profile.ativo) {
        throw new Error('Permissão negada. Usuário sem perfil ativo.')
      }

      const { data: hiddenUsers, error: hiddenError } = await supabase
        .from('legaldesk_usuarios')
        .select('id, nome, sigla, email')
        .eq('exibir_gestao_usuarios', false)
        .order('nome')

      if (hiddenError) throw hiddenError

      return new Response(JSON.stringify({ users: hiddenUsers || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Para as demais ações administrativas (grant_access, revoke_access, change_perfil, hide_from_management):
    if (!profile || !profile.ativo) {
      throw new Error('Permissão negada. Usuário sem perfil ativo.')
    }

    if (!legaldesk_id) {
      throw new Error('Parâmetros obrigatórios ausentes: legaldesk_id.')
    }

    // 1. Localizar o profile existente: PRIMEIRO por legaldesk_usuario_id, DEPOIS fallback por email
    let { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, legaldesk_usuario_id, perfil, ativo, name')
      .eq('legaldesk_usuario_id', legaldesk_id)
      .maybeSingle()

    if (!existingProfile && email) {
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('id, email, legaldesk_usuario_id, perfil, ativo, name')
        .eq('email', email)
        .maybeSingle()
      existingProfile = profileByEmail
    }

    if (action === 'grant_access') {
      const targetPerfil = perfil || 'administrador'

      // Consultar perfis válidos ativos no banco
      const { data: validPerfisData, error: perfisError } = await supabase
        .from('perfis_acesso')
        .select('codigo')
        .eq('ativo', true)

      if (perfisError) throw perfisError

      const validPerfis = (validPerfisData || []).map((p: { codigo: string }) => p.codigo)
      if (!validPerfis.includes(targetPerfil)) {
        throw new Error(`Perfil inválido: ${targetPerfil}`)
      }

      let profileId = existingProfile?.id

      if (!profileId) {
        if (!email) {
          throw new Error('E-mail é obrigatório para conceder acesso a um novo usuário.')
        }

        // Tentar convidar usuário pelo Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
          email,
          {
            data: { name: name || '' },
          },
        )

        if (authError) {
          if (
            authError.message.includes('already exists') ||
            authError.message.includes('already registered')
          ) {
            // Localizar usuário existente no Auth
            const {
              data: { users },
            } = await supabase.auth.admin.listUsers()
            const u = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
            if (u) {
              profileId = u.id
            } else {
              throw new Error(
                `Usuário já existe no Auth mas não foi localizado: ${authError.message}`,
              )
            }
          } else {
            throw authError
          }
        } else {
          profileId = authData.user?.id
        }
      }

      if (!profileId) {
        throw new Error('Não foi possível obter o ID do usuário Auth.')
      }

      // Upsert no profile vinculando legaldesk_usuario_id, perfil e ativo=true
      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: profileId,
          email: email || existingProfile?.email,
          name: name || existingProfile?.name || email,
          legaldesk_usuario_id: legaldesk_id,
          perfil: targetPerfil,
          ativo: true,
        },
        { onConflict: 'id' },
      )

      if (upsertError) throw upsertError

      // Após criar/upsertar o profile com sucesso, atualizar legaldesk_usuarios
      // Se a atualização do legaldesk_usuarios falhar, NÃO reverter o profile — apenas logar e continuar
      const { error: ldUpdateError } = await supabase
        .from('legaldesk_usuarios')
        .update({ exibir_gestao_usuarios: true })
        .eq('id', legaldesk_id)

      if (ldUpdateError) {
        console.error(
          'Erro ao atualizar exibir_gestao_usuarios em legaldesk_usuarios:',
          ldUpdateError,
        )
      }

      return new Response(JSON.stringify({ success: true, profile_id: profileId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'revoke_access') {
      if (!existingProfile) {
        throw new Error('Usuário não possui perfil ativo para revogar acesso.')
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ ativo: false })
        .eq('id', existingProfile.id)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'change_perfil') {
      if (!existingProfile) {
        throw new Error('Usuário não possui perfil para alterar permissão.')
      }
      if (!perfil) {
        throw new Error('Perfil inválido.')
      }

      // Consultar perfis válidos ativos no banco
      const { data: validPerfisData, error: perfisError } = await supabase
        .from('perfis_acesso')
        .select('codigo')
        .eq('ativo', true)

      if (perfisError) throw perfisError

      const validPerfis = (validPerfisData || []).map((p: { codigo: string }) => p.codigo)
      if (!validPerfis.includes(perfil)) {
        throw new Error(`Perfil inválido: ${perfil}`)
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ perfil })
        .eq('id', existingProfile.id)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'hide_from_management') {
      // Proteção contra autoexclusão
      if (existingProfile?.id && existingProfile.id === user.id) {
        throw new Error('Você não pode ocultar sua própria conta.')
      }

      // Passo 1: UPDATE legaldesk_usuarios SET exibir_gestao_usuarios = false WHERE id = legaldesk_id
      // Se falhar -> ABORTAR (throw error)
      const { error: ldHideError } = await supabase
        .from('legaldesk_usuarios')
        .update({ exibir_gestao_usuarios: false })
        .eq('id', legaldesk_id)

      if (ldHideError) {
        throw new Error(`Falha ao inativar usuário no LegalDesk: ${ldHideError.message}`)
      }

      // Passo 2: Se existir profile, UPDATE profiles SET ativo = false WHERE id = existingProfile.id
      // Se falhar -> logar mas NÃO reverter o passo 1 (o usuário já foi inativado da gestão)
      // Se NÃO existir profile -> não faz nada em profiles, nunca cria profile e nunca faz DELETE
      let deactivated = false
      if (existingProfile?.id) {
        const { error: profDeactivateError } = await supabase
          .from('profiles')
          .update({ ativo: false })
          .eq('id', existingProfile.id)

        if (profDeactivateError) {
          console.error('Erro ao desativar perfil do usuário:', profDeactivateError)
        } else {
          deactivated = true
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          hidden: true,
          deactivated,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    throw new Error(`Ação desconhecida: ${action}`)
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
