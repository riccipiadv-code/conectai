import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SistemaInput {
  sistema_id: string
  perfil_id: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Token de autorização não fornecido.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor ausente.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Cliente administrativo com service_role (apenas interno na edge function, nunca exposto ao frontend)
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  try {
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validação estrita da cadeia de administrador:
    // 1. core_usuarios pelo auth_user_id
    // 2. core_usuarios.ativo = true
    // 3. Administrador ativo no sistema GESTOR_ACESSO com perfil ADMINISTRADOR
    const { data: requesterCoreUser, error: coreUserError } = await adminClient
      .from('core_usuarios')
      .select('id, nome, email, ativo')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (coreUserError || !requesterCoreUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário corporativo não localizado em core_usuarios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!requesterCoreUser.ativo) {
      return new Response(
        JSON.stringify({ error: 'Usuário corporativo inativo no Gestor de Acesso.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Verifica se possui o perfil de ADMINISTRADOR no sistema GESTOR_ACESSO
    const { data: adminPerms, error: adminPermError } = await adminClient
      .from('core_usuario_sistemas')
      .select(`
        id,
        ativo,
        core_sistemas!inner(codigo, ativo),
        core_perfis!inner(codigo, ativo)
      `)
      .eq('usuario_id', requesterCoreUser.id)
      .eq('ativo', true)
      .eq('core_sistemas.codigo', 'GESTOR_ACESSO')
      .eq('core_sistemas.ativo', true)
      .eq('core_perfis.codigo', 'ADMINISTRADOR')
      .eq('core_perfis.ativo', true)

    if (adminPermError || !adminPerms || adminPerms.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'Acesso negado: privilégios de administrador do Gestor de Acesso são obrigatórios.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Leitura do corpo da requisição
    const body = await req.json()
    const { action } = body

    if (!action) {
      return new Response(JSON.stringify({ error: 'Parâmetro action ausente.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // =========================================================================
    // HELPER: Validação prévia completa dos pares sistema/perfil
    // Se houver qualquer par inválido, retorna erro sem tocar no banco
    // =========================================================================
    async function validateSistemasPairs(
      sistemasInput: unknown,
    ): Promise<{ valid: boolean; error?: string; rows?: SistemaInput[] }> {
      if (!Array.isArray(sistemasInput)) {
        return { valid: true, rows: [] }
      }

      // Buscar todos os sistemas e perfis ativos para validação em memória consistente
      const { data: allSistemas, error: sErr } = await adminClient
        .from('core_sistemas')
        .select('id, codigo, nome, ativo')

      if (sErr || !allSistemas) {
        return { valid: false, error: 'Falha ao consultar catálogo de sistemas corporativos.' }
      }

      const { data: allPerfis, error: pErr } = await adminClient
        .from('core_perfis')
        .select('id, sistema_id, codigo, nome, ativo')

      if (pErr || !allPerfis) {
        return { valid: false, error: 'Falha ao consultar catálogo de perfis corporativos.' }
      }

      const sistemasMap = new Map(allSistemas.map((s) => [s.id, s]))
      const perfisMap = new Map(allPerfis.map((p) => [p.id, p]))

      const validatedList: SistemaInput[] = []
      const seenSistemas = new Set<string>()

      for (let i = 0; i < sistemasInput.length; i++) {
        const item = sistemasInput[i]
        if (!item || typeof item !== 'object') {
          return {
            valid: false,
            error: `Item de acesso no índice ${i} está com formato inválido.`,
          }
        }

        const sistema_id = item.sistema_id
        const perfil_id = item.perfil_id

        if (!sistema_id || !perfil_id) {
          return {
            valid: false,
            error: `Item de acesso no índice ${i} requer ambos sistema_id e perfil_id.`,
          }
        }

        if (seenSistemas.has(sistema_id)) {
          return {
            valid: false,
            error: `Sistema duplicado na lista de acessos (id: ${sistema_id}). Cada sistema só pode ter um perfil atribuído.`,
          }
        }
        seenSistemas.add(sistema_id)

        const sistema = sistemasMap.get(sistema_id)
        if (!sistema) {
          return {
            valid: false,
            error: `Sistema ${sistema_id} não existe no catálogo de sistemas corporativos.`,
          }
        }

        const perfil = perfisMap.get(perfil_id)
        if (!perfil) {
          return {
            valid: false,
            error: `Perfil ${perfil_id} não existe no catálogo de perfis corporativos.`,
          }
        }

        if (perfil.sistema_id !== sistema_id) {
          return {
            valid: false,
            error: `Incoerência de acesso: o perfil "${perfil.nome}" não pertence ao sistema "${sistema.nome}".`,
          }
        }

        validatedList.push({ sistema_id, perfil_id })
      }

      return { valid: true, rows: validatedList }
    }

    // =========================================================================
    // HELPER: Validação de segurança para garantir ao menos 1 Administrador ativo
    // no sistema GESTOR_ACESSO com perfil ADMINISTRADOR.
    // Impede que qualquer operação deixe o Gestor de Acessos sem admin.
    // =========================================================================
    async function willKeepAtLeastOneGestorAcessoAdmin(
      targetUserId: string,
      prospectiveUserActive: boolean,
      prospectiveSistemas?: SistemaInput[],
    ): Promise<{ safe: boolean; error?: string }> {
      // 1. Busca todos os administradores ativos atuais do Gestor de Acesso
      const { data: currentAdmins, error: adminQueryErr } = await adminClient
        .from('core_usuario_sistemas')
        .select(`
          id,
          usuario_id,
          ativo,
          core_usuarios!inner(id, ativo, email),
          core_sistemas!inner(codigo, ativo),
          core_perfis!inner(codigo, ativo)
        `)
        .eq('ativo', true)
        .eq('core_usuarios.ativo', true)
        .eq('core_sistemas.codigo', 'GESTOR_ACESSO')
        .eq('core_sistemas.ativo', true)
        .eq('core_perfis.codigo', 'ADMINISTRADOR')
        .eq('core_perfis.ativo', true)

      if (adminQueryErr) {
        return {
          safe: false,
          error: `Falha ao validar integridade de administradores: ${adminQueryErr.message}`,
        }
      }

      // Outros administradores ativos (exceto o usuário alvo)
      const otherActiveAdmins = (currentAdmins || []).filter((a) => a.usuario_id !== targetUserId)

      // Se houver outro(s) administrador(es) ativo(s), é sempre seguro
      if (otherActiveAdmins.length > 0) {
        return { safe: true }
      }

      // Não há outros administradores ativos.
      // O usuário alvo é o ÚNICO administrador ativo do Gestor de Acesso.
      // Se ele estiver sendo inativado: BLOQUEAR!
      if (!prospectiveUserActive) {
        return {
          safe: false,
          error:
            'Operação bloqueada: não é permitido desativar o único Administrador ativo com perfil ADMINISTRADOR no sistema GESTOR_ACESSO.',
        }
      }

      // Se os acessos estiverem sendo redefinidos, checar se ele CONTINUARÁ com perfil ADMINISTRADOR em GESTOR_ACESSO
      if (prospectiveSistemas !== undefined) {
        // Obter os IDs de sistema e perfil de GESTOR_ACESSO / ADMINISTRADOR
        const { data: gaSistema } = await adminClient
          .from('core_sistemas')
          .select('id')
          .eq('codigo', 'GESTOR_ACESSO')
          .maybeSingle()

        const { data: admPerfil } = await adminClient
          .from('core_perfis')
          .select('id')
          .eq('codigo', 'ADMINISTRADOR')
          .eq('sistema_id', gaSistema?.id || '')
          .maybeSingle()

        const stillHasAdminRole = prospectiveSistemas.some(
          (s) => s.sistema_id === gaSistema?.id && s.perfil_id === admPerfil?.id,
        )

        if (!stillHasAdminRole) {
          return {
            safe: false,
            error:
              'Operação bloqueada: não é permitido remover o perfil ADMINISTRADOR do sistema GESTOR_ACESSO do único administrador ativo existente.',
          }
        }
      }

      return { safe: true }
    }

    // =========================================================================
    // ACTION: create_user
    // Cria novo usuário corporativo em core_usuarios e seus acessos em core_usuario_sistemas
    // Opcionalmente dispara convite Supabase Auth caso send_invite = true
    // =========================================================================
    if (action === 'create_user') {
      const { nome, email, ativo, gestor_id, sistemas, send_invite } = body

      const normNome = String(nome || '').trim()
      const normEmail = String(email || '')
        .trim()
        .toLowerCase()
      const isAtivo = ativo ?? true

      if (!normNome || !normEmail) {
        return new Response(JSON.stringify({ error: 'Nome e e-mail são obrigatórios.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validação de formato de e-mail básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(normEmail)) {
        return new Response(JSON.stringify({ error: 'Formato de e-mail inválido.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Verificar unicidade do e-mail em core_usuarios
      const { data: existingUser, error: checkEmailErr } = await adminClient
        .from('core_usuarios')
        .select('id')
        .ilike('email', normEmail)
        .maybeSingle()

      if (checkEmailErr) throw checkEmailErr
      if (existingUser) {
        return new Response(
          JSON.stringify({ error: 'Já existe um usuário cadastrado com este e-mail.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Validar gestor_id se fornecido
      let validatedGestorId: string | null = null
      if (gestor_id && typeof gestor_id === 'string' && gestor_id.trim()) {
        const { data: gestorData, error: gestorErr } = await adminClient
          .from('core_usuarios')
          .select('id, ativo')
          .eq('id', gestor_id.trim())
          .maybeSingle()

        if (gestorErr || !gestorData) {
          return new Response(JSON.stringify({ error: 'Gestor informado não encontrado.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        if (!gestorData.ativo) {
          return new Response(
            JSON.stringify({ error: 'O gestor selecionado precisa estar ativo.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }
        validatedGestorId = gestorData.id
      }

      // Validação prévia completa dos pares sistema/perfil
      const valSistemas = await validateSistemasPairs(sistemas)
      if (!valSistemas.valid) {
        return new Response(JSON.stringify({ error: valSistemas.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const sanitizedSistemas: SistemaInput[] = valSistemas.rows || []

      // 1. Inserir o registro corporativo em core_usuarios (sem vínculo auth inicial)
      const { data: newUsuario, error: insertUserErr } = await adminClient
        .from('core_usuarios')
        .insert({
          nome: normNome,
          email: normEmail,
          ativo: isAtivo,
          gestor_id: validatedGestorId,
          auth_user_id: null,
        })
        .select()
        .single()

      if (insertUserErr || !newUsuario) {
        throw insertUserErr || new Error('Falha ao inserir core_usuarios.')
      }

      // 2. Chamar a RPC atômica public.core_atualizar_usuario_acessos
      const acessosPayload = sanitizedSistemas.map((item) => ({
        sistema_id: item.sistema_id,
        perfil_id: item.perfil_id,
      }))

      const { error: rpcAcessosErr } = await adminClient.rpc('core_atualizar_usuario_acessos', {
        p_usuario_id: newUsuario.id,
        p_acessos: acessosPayload,
      })

      if (rpcAcessosErr) {
        // REGRA DE NÃO EXCLUSÃO FÍSICA: NUNCA apagar o usuário.
        // Deixar o registro sem acessos e inativo, retornar erro claro ao frontend e NÃO disparar convite.
        await adminClient.from('core_usuarios').update({ ativo: false }).eq('id', newUsuario.id)

        return new Response(
          JSON.stringify({
            error: `Falha ao atribuir acessos do usuário: ${rpcAcessosErr.message}. O usuário foi criado inativo e sem acessos. Nenhum convite foi enviado.`,
            usuario_id: newUsuario.id,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // 3. SOMENTE APÓS cadastro e acessos concluídos com sucesso: disparar convite/associar Auth
      let linkedAuthUserId: string | null = null
      let inviteWarning: string | null = null

      try {
        const { data: authUsersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const existingAuth = (authUsersList?.users || []).find(
          (u) => u.email?.toLowerCase() === normEmail,
        )

        if (existingAuth) {
          linkedAuthUserId = existingAuth.id
          await adminClient
            .from('core_usuarios')
            .update({ auth_user_id: linkedAuthUserId })
            .eq('id', newUsuario.id)
        } else if (send_invite && isAtivo) {
          // APP_URL seguro vindo de variável de ambiente / segredo (opcional para redirect se existir)
          const appUrlEnv = Deno.env.get('APP_URL')
          const APP_URL = appUrlEnv ? appUrlEnv.replace(/\/+$/, '') : null
          const inviteOptions: { data: { nome: string }; redirectTo?: string } = {
            data: { nome: normNome },
          }
          if (APP_URL) {
            inviteOptions.redirectTo = `${APP_URL}/login`
          }

          const { data: inviteData, error: inviteErr } =
            await adminClient.auth.admin.inviteUserByEmail(normEmail, inviteOptions)

          if (inviteErr) {
            console.error('Falha ao disparar convite Supabase Auth:', inviteErr)
            inviteWarning = `Usuário e acessos cadastrados com sucesso, mas o envio do convite falhou: ${inviteErr.message}. Você pode reenviar o convite pela listagem de usuários.`
          } else if (inviteData?.user?.id) {
            linkedAuthUserId = inviteData.user.id
            await adminClient
              .from('core_usuarios')
              .update({ auth_user_id: linkedAuthUserId })
              .eq('id', newUsuario.id)
          }
        }
      } catch (authErr: unknown) {
        const aErr = authErr as Error
        console.error('Erro na etapa de associação de Auth/convite:', aErr)
        inviteWarning = `Usuário e acessos cadastrados com sucesso, mas ocorreu um erro no convite: ${aErr?.message}. Você pode reenviar o convite pela listagem de usuários.`
      }

      // Obter o registro atualizado de core_usuarios com auth_user_id vinculado (se houver)
      const { data: finalUsuario } = await adminClient
        .from('core_usuarios')
        .select()
        .eq('id', newUsuario.id)
        .single()

      return new Response(
        JSON.stringify({
          success: true,
          usuario: finalUsuario || newUsuario,
          invite_sent: Boolean(linkedAuthUserId && !inviteWarning),
          invite_warning: inviteWarning,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // =========================================================================
    // ACTION: update_user
    // Atualiza dados cadastrais, gestor e acessos em core_usuario_sistemas
    // com validação prévia de todos os pares e proteção do último administrador
    // =========================================================================
    if (action === 'update_user') {
      const { id, nome, email, ativo, gestor_id, sistemas } = body

      if (!id) {
        return new Response(JSON.stringify({ error: 'ID do usuário ausente.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const normNome = String(nome || '').trim()
      const normEmail = String(email || '')
        .trim()
        .toLowerCase()
      const prospectiveAtivo = ativo !== undefined ? Boolean(ativo) : true

      if (!normNome || !normEmail) {
        return new Response(JSON.stringify({ error: 'Nome e e-mail são obrigatórios.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Não permitir que o usuário seja gestor de si mesmo
      if (gestor_id && gestor_id === id) {
        return new Response(
          JSON.stringify({ error: 'O usuário não pode ser gestor de si mesmo.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Verificar unicidade de e-mail em outros registros
      const { data: existingEmailUser } = await adminClient
        .from('core_usuarios')
        .select('id')
        .ilike('email', normEmail)
        .neq('id', id)
        .maybeSingle()

      if (existingEmailUser) {
        return new Response(
          JSON.stringify({ error: 'Já existe outro usuário cadastrado com este e-mail.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Validar gestor_id se fornecido
      let validatedGestorId: string | null = null
      if (gestor_id && typeof gestor_id === 'string' && gestor_id.trim()) {
        const { data: gestorData, error: gestorErr } = await adminClient
          .from('core_usuarios')
          .select('id, ativo')
          .eq('id', gestor_id.trim())
          .maybeSingle()

        if (gestorErr || !gestorData) {
          return new Response(JSON.stringify({ error: 'Gestor informado não encontrado.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        if (!gestorData.ativo) {
          return new Response(
            JSON.stringify({ error: 'O gestor selecionado precisa estar ativo.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }
        validatedGestorId = gestorData.id
      }

      // Validação prévia de todos os pares sistema/perfil caso sistemas tenha sido enviado
      let validatedSistemas: SistemaInput[] | undefined = undefined
      if (Array.isArray(sistemas)) {
        const valSistemas = await validateSistemasPairs(sistemas)
        if (!valSistemas.valid) {
          return new Response(JSON.stringify({ error: valSistemas.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        validatedSistemas = valSistemas.rows || []
      }

      // Proteção de segurança: verificar se a operação deixará o Gestor de Acessos sem admin ativo
      const adminSafety = await willKeepAtLeastOneGestorAcessoAdmin(
        id,
        prospectiveAtivo,
        validatedSistemas,
      )
      if (!adminSafety.safe) {
        return new Response(JSON.stringify({ error: adminSafety.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Atualizar core_usuarios primeiro (mantém dados cadastrais atualizados antes de ajustar acessos)
      const { data: updatedUser, error: updateErr } = await adminClient
        .from('core_usuarios')
        .update({
          nome: normNome,
          email: normEmail,
          ativo: prospectiveAtivo,
          gestor_id: validatedGestorId,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) throw updateErr

      // Atualizar acessos atomicamente via RPC pública core_atualizar_usuario_acessos
      // A RPC é a única responsável pela substituição dos acessos (remove existentes e insere novos em uma só transação).
      if (validatedSistemas !== undefined) {
        const acessosPayload = validatedSistemas.map((item) => ({
          sistema_id: item.sistema_id,
          perfil_id: item.perfil_id,
        }))

        const { error: rpcAcessosErr } = await adminClient.rpc('core_atualizar_usuario_acessos', {
          p_usuario_id: id,
          p_acessos: acessosPayload,
        })

        if (rpcAcessosErr) {
          return new Response(
            JSON.stringify({
              error: `Falha ao atualizar acessos do usuário: ${rpcAcessosErr.message}`,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }

      return new Response(JSON.stringify({ success: true, usuario: updatedUser }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // =========================================================================
    // ACTION: toggle_status
    // Ativa ou desativa um usuário corporativo com proteção de último administrador
    // =========================================================================
    if (action === 'toggle_status') {
      const { id } = body

      if (!id) {
        return new Response(JSON.stringify({ error: 'ID do usuário ausente.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: currentUser, error: getErr } = await adminClient
        .from('core_usuarios')
        .select('id, ativo')
        .eq('id', id)
        .single()

      if (getErr || !currentUser) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const novoStatus = !currentUser.ativo

      // Se for desativação, garantir que não deixará o sistema sem administrador ativo
      if (!novoStatus) {
        const adminSafety = await willKeepAtLeastOneGestorAcessoAdmin(id, false)
        if (!adminSafety.safe) {
          return new Response(JSON.stringify({ error: adminSafety.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const { data: updatedUser, error: updateErr } = await adminClient
        .from('core_usuarios')
        .update({ ativo: novoStatus })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) throw updateErr

      return new Response(
        JSON.stringify({ success: true, usuario: updatedUser, ativo: novoStatus }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // =========================================================================
    // ACTION: invite_user
    // Envia convite por e-mail ou redefinição de senha com:
    // 1. Bloqueio para usuário inativo
    // 2. redirectTo via APP_URL configurado em variável segura
    // =========================================================================
    if (action === 'invite_user') {
      const { id } = body

      if (!id) {
        return new Response(JSON.stringify({ error: 'ID do usuário ausente.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: usuario, error: userErr } = await adminClient
        .from('core_usuarios')
        .select('id, nome, email, auth_user_id, ativo')
        .eq('id', id)
        .single()

      if (userErr || !usuario) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Bloquear convite ou redefinição para usuário inativo
      if (!usuario.ativo) {
        return new Response(
          JSON.stringify({
            error:
              'Operação não permitida: não é possível convidar ou redefinir senha de um usuário inativo.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // APP_URL seguro vindo de variável de ambiente / segredo (nunca hardcoded nem URL implícita)
      const appUrlEnv = Deno.env.get('APP_URL')
      const APP_URL = appUrlEnv ? appUrlEnv.replace(/\/+$/, '') : null

      if (!APP_URL) {
        return new Response(
          JSON.stringify({
            error:
              'A variável segura APP_URL não está configurada no backend. Configure o domínio publicado do Gestor de Acessos.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const resetRedirectUrl = `${APP_URL}/login`

      // Se já tem auth_user_id, envia recuperação de senha ao invés de convite
      if (usuario.auth_user_id) {
        // Enviar link de redefinição de senha com redirectTo explícito vindo de APP_URL
        const { error: resetErr } = await adminClient.auth.resetPasswordForEmail(usuario.email, {
          redirectTo: resetRedirectUrl,
        })
        if (resetErr) throw resetErr

        return new Response(
          JSON.stringify({
            success: true,
            message: `Link de redefinição enviado com sucesso para ${usuario.email}.`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Verificar se e-mail já existe no Supabase Auth
      const { data: authUsersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const existingAuth = (authUsersList?.users || []).find(
        (u) => u.email?.toLowerCase() === usuario.email.toLowerCase(),
      )

      let authUserId: string | null = null
      if (existingAuth) {
        authUserId = existingAuth.id
      } else {
        const { data: inviteData, error: inviteErr } =
          await adminClient.auth.admin.inviteUserByEmail(usuario.email, {
            data: { nome: usuario.nome },
            redirectTo: resetRedirectUrl,
          })

        if (inviteErr) throw inviteErr
        authUserId = inviteData.user?.id || null
      }

      if (authUserId) {
        await adminClient
          .from('core_usuarios')
          .update({ auth_user_id: authUserId })
          .eq('id', usuario.id)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Convite de acesso despachado para ${usuario.email}.`,
          auth_user_id: authUserId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(JSON.stringify({ error: `Ação "${action}" não reconhecida.` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const error = err as Error
    console.error('Erro na função manage-core-user:', error)
    return new Response(JSON.stringify({ error: error?.message || 'Erro interno no servidor.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
