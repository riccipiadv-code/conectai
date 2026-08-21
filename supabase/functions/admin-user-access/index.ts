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

    if (!action) {
      throw new Error('Parâmetro obrigatório ausente: action.')
    }

    if (action === 'list_users') {
      // 1. Consultar todos os legaldesk_usuarios ordenados por nome
      const { data: ldUsers, error: ldError } = await supabase
        .from('legaldesk_usuarios')
        .select('*')
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

    if (!legaldesk_id) {
      throw new Error('Parâmetros obrigatórios ausentes: legaldesk_id.')
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

      // 4. Proteção contra autoexclusão
      if (profileId === user.id) {
        throw new Error('Você não pode excluir sua própria conta.')
      }

      // Verificar dependências em todas as tabelas relacionadas
      const [
        resTarefasResp,
        resTarefasAux,
        resSkipTarefasResp,
        resSkipTarefasAux,
        resManychatRespUser,
        resManychatManual,
        resManychatDeletedBy,
        resHistorico,
        resComentarios,
        resAuditLogUser,
        resAuditLogChangedBy,
        resKanbanHistory,
        resAreasGestor,
        resProfilesSubstituto,
        resEmailSendLogs,
        resEmailSettings,
        resNotificacoes,
        resAnexos,
        resMcUserProfiles,
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
          .eq('responsible_user_id', profileId),
        supabase
          .from('manychat_contatos')
          .select('*', { count: 'exact', head: true })
          .eq('manual_updated_by', profileId),
        supabase
          .from('manychat_contatos')
          .select('*', { count: 'exact', head: true })
          .eq('deleted_by', profileId),
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
          .from('mc_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('changed_by', profileId),
        supabase
          .from('mc_kanban_history')
          .select('*', { count: 'exact', head: true })
          .eq('changed_by', profileId),
        supabase
          .from('areas')
          .select('*', { count: 'exact', head: true })
          .eq('gestor_id', profileId),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('substituto_id', profileId),
        supabase
          .from('email_send_logs')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', profileId),
        supabase
          .from('email_settings')
          .select('*', { count: 'exact', head: true })
          .eq('updated_by', profileId),
        supabase
          .from('notificacoes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId),
        supabase
          .from('anexos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId),
        supabase
          .from('mc_user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId),
      ])

      // 1. Tratar explicitamente qualquer erro nas consultas de dependência
      const checks = [
        { name: 'tarefas.responsavel_id', res: resTarefasResp },
        { name: 'tarefas.auxiliar_id', res: resTarefasAux },
        { name: 'skip_tarefas.responsavel_id', res: resSkipTarefasResp },
        { name: 'skip_tarefas.auxiliar_id', res: resSkipTarefasAux },
        { name: 'manychat_contatos.responsible_user_id', res: resManychatRespUser },
        { name: 'manychat_contatos.manual_updated_by', res: resManychatManual },
        { name: 'manychat_contatos.deleted_by', res: resManychatDeletedBy },
        { name: 'historico_tarefas.usuario_id', res: resHistorico },
        { name: 'comentarios.user_id', res: resComentarios },
        { name: 'mc_audit_log.user_id', res: resAuditLogUser },
        { name: 'mc_audit_log.changed_by', res: resAuditLogChangedBy },
        { name: 'mc_kanban_history.changed_by', res: resKanbanHistory },
        { name: 'areas.gestor_id', res: resAreasGestor },
        { name: 'profiles.substituto_id', res: resProfilesSubstituto },
        { name: 'email_send_logs.created_by', res: resEmailSendLogs },
        { name: 'email_settings.updated_by', res: resEmailSettings },
        { name: 'notificacoes.user_id', res: resNotificacoes },
        { name: 'anexos.user_id', res: resAnexos },
        { name: 'mc_user_profiles.user_id', res: resMcUserProfiles },
      ]

      for (const check of checks) {
        if (check.res.error) {
          throw new Error(
            `Erro ao verificar dependências em ${check.name}: ${check.res.error.message}`,
          )
        }
      }

      const totalDependencies = checks.reduce((sum, check) => sum + (check.res.count || 0), 0)

      if (totalDependencies > 0) {
        // Se HOUVER dependências: NÃO excluir fisicamente. Apenas desativar (ativo=false)
        const { error: deactivateError } = await supabase
          .from('profiles')
          .update({ ativo: false })
          .eq('id', profileId)

        if (deactivateError) throw deactivateError

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

      // Se NÃO houver dependências:
      // 6. Tratar explicitamente erro na exclusão do profile
      const { error: delProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId)

      if (delProfileError) {
        throw new Error(`Erro ao excluir perfil do usuário: ${delProfileError.message}`)
      }

      // 5. Excluir auth user após remover profile (se o auth delete falhar, registrar log claro)
      const { error: delAuthError } = await supabase.auth.admin.deleteUser(profileId)
      if (delAuthError) {
        console.error(
          `ERRO CRÍTICO: Perfil ${profileId} excluído, mas falha ao excluir auth.users (${profileId}):`,
          delAuthError,
        )
        throw new Error(
          `Perfil excluído, mas ocorreu um erro ao remover credenciais do Auth: ${delAuthError.message}. Intervenção manual pode ser necessária.`,
        )
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
