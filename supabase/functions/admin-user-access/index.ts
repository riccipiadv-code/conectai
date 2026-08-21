import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_PERFIS = [
  'socio_gestor',
  'gestor_area',
  'advogado',
  'estagiario',
  'administrativo',
] as const

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()
    if (profile?.perfil !== 'socio_gestor' || !profile?.ativo) {
      throw new Error('Permissão negada. Apenas Sócios Gestores podem gerenciar usuários.')
    }

    const body = await req.json()
    const { action, legaldesk_id, email, name, perfil } = body

    if (!action || !legaldesk_id) {
      throw new Error('Parâmetros obrigatórios ausentes: action e legaldesk_id.')
    }

    // 1. Localizar o profile existente: PRIMEIRO por legaldesk_usuario_id, DEPOIS fallback por email
    let { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, legaldesk_usuario_id, perfil, ativo')
      .eq('legaldesk_usuario_id', legaldesk_id)
      .maybeSingle()

    if (!existingProfile && email) {
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('id, email, legaldesk_usuario_id, perfil, ativo')
        .eq('email', email)
        .maybeSingle()
      existingProfile = profileByEmail
    }

    if (action === 'grant_access') {
      const targetPerfil = perfil || 'advogado'
      if (!VALID_PERFIS.includes(targetPerfil)) {
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
      if (!perfil || !VALID_PERFIS.includes(perfil)) {
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

    if (action === 'delete_access') {
      if (!existingProfile) {
        throw new Error('Usuário não possui perfil para exclusão de acesso.')
      }

      const profileId = existingProfile.id

      // Verificar dependências em todas as tabelas relacionadas
      const [
        { count: countTarefasResp },
        { count: countTarefasAux },
        { count: countSkipTarefasResp },
        { count: countSkipTarefasAux },
        { count: countManychatResp },
        { count: countManychatManual },
        { count: countHistorico },
        { count: countComentarios },
        { count: countAuditLog },
        { count: countKanbanHistory },
      ] = await Promise.all([
        supabase
          .from('tarefas')
          .select('*', { count: 'exact', head: true })
          .eq('responsavel_id', profileId),
        supabase
          .from('tarefas')
          .select('*', { count: 'exact', head: true })
          .eq('auxiliar_id', profileId),
        supabase
          .from('skip_tarefas')
          .select('*', { count: 'exact', head: true })
          .eq('responsavel_id', profileId),
        supabase
          .from('skip_tarefas')
          .select('*', { count: 'exact', head: true })
          .eq('auxiliar_id', profileId),
        supabase
          .from('manychat_contatos')
          .select('*', { count: 'exact', head: true })
          .eq('responsavel_id', profileId),
        supabase
          .from('manychat_contatos')
          .select('*', { count: 'exact', head: true })
          .eq('manual_updated_by', profileId),
        supabase
          .from('historico_tarefas')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', profileId),
        supabase
          .from('comentarios')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId),
        supabase
          .from('mc_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId),
        supabase
          .from('mc_kanban_history')
          .select('*', { count: 'exact', head: true })
          .eq('changed_by', profileId),
      ])

      const totalDependencies =
        (countTarefasResp || 0) +
        (countTarefasAux || 0) +
        (countSkipTarefasResp || 0) +
        (countSkipTarefasAux || 0) +
        (countManychatResp || 0) +
        (countManychatManual || 0) +
        (countHistorico || 0) +
        (countComentarios || 0) +
        (countAuditLog || 0) +
        (countKanbanHistory || 0)

      if (totalDependencies > 0) {
        // Se HOUVER dependências: NÃO excluir fisicamente. Apenas desativar (ativo=false)
        await supabase.from('profiles').update({ ativo: false }).eq('id', profileId)
        return new Response(
          JSON.stringify({
            success: true,
            deleted: false,
            reason: 'dependencies',
            deactivated: true,
            totalDependencies,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      // Se NÃO houver dependências: excluir o profile e depois excluir o auth user
      const { error: delProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId)

      if (delProfileError) throw delProfileError

      const { error: delAuthError } = await supabase.auth.admin.deleteUser(profileId)
      if (delAuthError) {
        console.warn('Aviso ao deletar auth user:', delAuthError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          deleted: true,
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
