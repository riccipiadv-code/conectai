import {
  normalizeCoreRole,
  resolveEffectiveProfile,
  CoreAccessResult,
  EffectiveProfileSource,
} from './core-access'
import { evaluateAccessDecision } from '@/hooks/use-auth'

/**
 * Validação dos cenários de teste da Etapa 4 e da correção do bloqueio Conectaí:
 *
 * Cenários Obrigatórios da Correção:
 * 1. core 'ok' + administrador → acesso normal (hasSystemAccess = true, perfil administrador)
 * 2. core 'ok' + gestor → acesso normal (hasSystemAccess = true, perfil gestor)
 * 3. core 'ok' + operacional → acesso normal (hasSystemAccess = true, perfil operacional)
 * 4. core 'technical_error' → fallback legado e acesso normal (hasSystemAccess = true, profiles.perfil)
 * 5. core 'no_core_user' → rota interna bloqueada (hasSystemAccess = false, redirect 'no_access')
 * 6. core 'no_system_link' → rota interna bloqueada (hasSystemAccess = false, redirect 'no_access')
 * 7. core 'link_inactive' → rota interna bloqueada (hasSystemAccess = false, redirect 'no_access')
 * 8. core 'profile_inactive_or_invalid' → rota interna bloqueada (hasSystemAccess = false, redirect 'no_access')
 * 9. profiles.ativo = false → comportamento atual permanece (bloqueio com redirect 'disabled', shouldSignOut = true)
 * 10. usuário bloqueado no Conectaí NÃO deve ter a sessão Supabase destruída apenas por core_denied (shouldSignOut = false)
 *
 * Cenários existentes de menor privilégio e normalização (11 a 20).
 */
export function runCoreAccessTests(): { passed: number; failed: number; errors: string[] } {
  const errors: string[] = []
  let passed = 0

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++
    } else {
      errors.push(msg)
    }
  }

  const dummyUser = { id: 'usr-123' }

  // 1. core ok + administrador → acesso normal
  const r1 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'administrador',
    },
    'operacional',
  )
  const d1 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: true,
      perfil: r1.perfil,
      perfilSource: r1.source,
      coreStatus: r1.coreStatus,
    },
  })
  assert(
    r1.perfil === 'administrador' &&
      r1.source === 'core' &&
      r1.coreStatus === 'ok' &&
      r1.hasSystemAccess === true &&
      d1.allowed === true &&
      d1.shouldSignOut === false,
    `Cenário 1 falhou: esperado acesso normal administrador, obtido ${JSON.stringify({ r1, d1 })}`,
  )

  // 2. core ok + gestor → acesso normal
  const r2 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'gestor',
    },
    'operacional',
  )
  const d2 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: true,
      perfil: r2.perfil,
      perfilSource: r2.source,
      coreStatus: r2.coreStatus,
    },
  })
  assert(
    r2.perfil === 'gestor' &&
      r2.source === 'core' &&
      r2.coreStatus === 'ok' &&
      r2.hasSystemAccess === true &&
      d2.allowed === true &&
      d2.shouldSignOut === false,
    `Cenário 2 falhou: esperado acesso normal gestor, obtido ${JSON.stringify({ r2, d2 })}`,
  )

  // 3. core ok + operacional → acesso normal
  const r3 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'operacional',
    },
    'administrador',
  )
  const d3 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: true,
      perfil: r3.perfil,
      perfilSource: r3.source,
      coreStatus: r3.coreStatus,
    },
  })
  assert(
    r3.perfil === 'operacional' &&
      r3.source === 'core' &&
      r3.coreStatus === 'ok' &&
      r3.hasSystemAccess === true &&
      d3.allowed === true &&
      d3.shouldSignOut === false,
    `Cenário 3 falhou: esperado acesso normal operacional, obtido ${JSON.stringify({ r3, d3 })}`,
  )

  // 4. technical_error → fallback legado e acesso normal
  const r4 = resolveEffectiveProfile(
    {
      status: 'technical_error',
      data: null,
      resolvedPerfil: null,
      detail: 'Network timeout',
    },
    'administrador',
  )
  const d4 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: true,
      perfil: r4.perfil,
      perfilSource: r4.source,
      coreStatus: r4.coreStatus,
    },
  })
  assert(
    r4.perfil === 'administrador' &&
      r4.source === 'legacy_fallback' &&
      r4.coreStatus === 'technical_error' &&
      r4.hasSystemAccess === true &&
      d4.allowed === true &&
      d4.shouldSignOut === false,
    `Cenário 4 falhou: esperado fallback técnico e acesso permitido, obtido ${JSON.stringify({ r4, d4 })}`,
  )

  // 5. no_core_user → rota interna bloqueada
  const r5 = resolveEffectiveProfile(
    {
      status: 'no_core_user',
      data: null,
      resolvedPerfil: null,
    },
    'gestor',
  )
  const d5 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: true,
      perfil: r5.perfil,
      perfilSource: r5.source,
      coreStatus: r5.coreStatus,
    },
  })
  assert(
    r5.perfil === '' &&
      r5.source === 'core_denied' &&
      r5.coreStatus === 'no_core_user' &&
      r5.hasSystemAccess === false &&
      d5.allowed === false &&
      d5.redirectReason === 'no_access',
    `Cenário 5 falhou: esperado bloqueio rota interna para no_core_user, obtido ${JSON.stringify({ r5, d5 })}`,
  )

  // 6. no_system_link → bloqueada
  const r6 = resolveEffectiveProfile(
    {
      status: 'no_system_link',
      data: null,
      resolvedPerfil: null,
      detail: 'Sem vínculo em core_usuario_sistemas',
    },
    'administrador',
  )
  const d6 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: true,
      perfil: r6.perfil,
      perfilSource: r6.source,
      coreStatus: r6.coreStatus,
    },
  })
  assert(
    r6.perfil === '' &&
      r6.source === 'core_denied' &&
      r6.coreStatus === 'no_system_link' &&
      r6.hasSystemAccess === false &&
      d6.allowed === false &&
      d6.redirectReason === 'no_access',
    `Cenário 6 falhou: esperado bloqueio rota interna para no_system_link, obtido ${JSON.stringify({ r6, d6 })}`,
  )

  // 7. link_inactive → bloqueada
  const r7 = resolveEffectiveProfile(
    {
      status: 'link_inactive',
      data: null,
      resolvedPerfil: null,
    },
    'administrador',
  )
  const d7 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: true,
      perfil: r7.perfil,
      perfilSource: r7.source,
      coreStatus: r7.coreStatus,
    },
  })
  assert(
    r7.perfil === '' &&
      r7.source === 'core_denied' &&
      r7.coreStatus === 'link_inactive' &&
      r7.hasSystemAccess === false &&
      d7.allowed === false &&
      d7.redirectReason === 'no_access',
    `Cenário 7 falhou: esperado bloqueio rota interna para link_inactive, obtido ${JSON.stringify({ r7, d7 })}`,
  )

  // 8. profile_inactive_or_invalid → bloqueada
  const r8 = resolveEffectiveProfile(
    {
      status: 'profile_inactive_or_invalid',
      data: null,
      resolvedPerfil: null,
    },
    'administrador',
  )
  const d8 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: true,
      perfil: r8.perfil,
      perfilSource: r8.source,
      coreStatus: r8.coreStatus,
    },
  })
  assert(
    r8.perfil === '' &&
      r8.source === 'core_denied' &&
      r8.coreStatus === 'profile_inactive_or_invalid' &&
      r8.hasSystemAccess === false &&
      d8.allowed === false &&
      d8.redirectReason === 'no_access',
    `Cenário 8 falhou: esperado bloqueio para profile_inactive_or_invalid, obtido ${JSON.stringify({ r8, d8 })}`,
  )

  // 9. profiles.ativo = false → comportamento atual permanece (logout e redirect disabled)
  const d9 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: false,
      perfil: 'administrador',
      perfilSource: 'core',
      coreStatus: 'ok',
    },
  })
  assert(
    d9.allowed === false && d9.redirectReason === 'disabled' && d9.shouldSignOut === true,
    `Cenário 9 falhou: esperado inativação com shouldSignOut=true e reason=disabled, obtido ${JSON.stringify(d9)}`,
  )

  // 10. usuário bloqueado no Conectaí NÃO deve ter a sessão Supabase destruída apenas por core_denied
  const deniedCases: CoreAccessResult['status'][] = [
    'no_core_user',
    'no_system_link',
    'link_inactive',
    'profile_inactive_or_invalid',
  ]
  let d10AllSafe = true
  for (const st of deniedCases) {
    const res = resolveEffectiveProfile(
      { status: st, data: null, resolvedPerfil: null },
      'administrador',
    )
    const decision = evaluateAccessDecision({
      user: dummyUser,
      profile: {
        ativo: true,
        perfil: res.perfil,
        perfilSource: res.source,
        coreStatus: res.coreStatus,
      },
    })
    if (decision.shouldSignOut !== false || decision.allowed !== false) {
      d10AllSafe = false
      errors.push(`Cenário 10 falhou para status ${st}: sessão Supabase NÃO pode ser destruída!`)
    }
  }
  assert(
    d10AllSafe,
    `Cenário 10 falhou: usuário bloqueado por ausência de vínculo com Conectaí teve shouldSignOut=true`,
  )

  // Teste 11: perfil com código desconhecido/inválido
  const normInvalid = normalizeCoreRole('SUPER_ADMIN_CUSTOM')
  assert(
    normInvalid === null,
    `Cenário 11 falhou: normalização de desconhecido deve ser null, deu ${normInvalid}`,
  )

  // Teste 12: menor privilégio: ausência de perfil NÃO pode virar administrador
  const r12 = resolveEffectiveProfile(
    {
      status: 'no_system_link',
      data: null,
      resolvedPerfil: null,
    },
    'administrador',
  )
  assert(
    r12.perfil !== 'administrador' && r12.perfil === '',
    `Cenário 12 falhou: menor privilégio violado, obtido ${JSON.stringify(r12)}`,
  )

  // Teste 13: divergência core diz operacional vs legacy administrador -> core prevalece
  const r13 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'operacional',
    },
    'administrador',
  )
  assert(
    r13.perfil === 'operacional' && r13.source === 'core',
    `Cenário 13 falhou: core deve prevalecer sobre legado, obtido ${JSON.stringify(r13)}`,
  )

  // Teste 14: divergência core diz gestor vs legacy operacional -> core prevalece
  const r14 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'gestor',
    },
    'operacional',
  )
  assert(
    r14.perfil === 'gestor' && r14.source === 'core',
    `Cenário 14 falhou: core deve prevalecer sobre legado, obtido ${JSON.stringify(r14)}`,
  )

  // Teste 15: normalização com espaços e maiúsculas
  assert(normalizeCoreRole('ADMINISTRADOR') === 'administrador', 'Cenário 15a falhou')
  assert(normalizeCoreRole('  GESTOR  ') === 'gestor', 'Cenário 15b falhou')
  assert(normalizeCoreRole('operacional') === 'operacional', 'Cenário 15c falhou')
  assert(normalizeCoreRole(null) === null, 'Cenário 15d falhou')

  // Teste 16: coreResult null trata como technical_error -> fallback legado seguro
  const r16 = resolveEffectiveProfile(null, 'operacional')
  assert(
    r16.perfil === 'operacional' &&
      r16.source === 'legacy_fallback' &&
      r16.coreStatus === 'technical_error' &&
      r16.hasSystemAccess === true,
    `Cenário 16 falhou: esperado fallback técnico com acesso permitido, obtido ${JSON.stringify(r16)}`,
  )

  // Teste 17: menor privilégio estrito: perfil desconhecido no fallback também não vira admin
  const r17 = resolveEffectiveProfile(null, '')
  assert(
    r17.perfil === '' && r17.hasSystemAccess === false,
    `Cenário 17 falhou: perfil vazio não pode virar admin, obtido ${JSON.stringify(r17)}`,
  )

  return { passed, failed: errors.length, errors }
}
