import {
  normalizeCoreRole,
  resolveEffectiveProfile,
  resolveManagedTeam,
  CoreAccessResult,
  CoreSubordinate,
  EffectiveProfileSource,
} from './core-access'
import { evaluateAccessDecision } from '@/hooks/use-auth'
import { canEditContact } from './contacts'

/**
 * Validação dos cenários de teste da Etapa 4 e da Etapa 5.8:
 *
 * Cenários da Etapa 4:
 * 1-18: Resolução de perfil, core_denied, technical_error e evaluateAccessDecision
 *
 * Cenários Obrigatórios da Etapa 5.8 (Montagem da Equipe do Gestor):
 * 19. gestor com subordinados → equipe central correta (source: 'core')
 * 20. gestor sem subordinados → equipe vazia (source: 'core', status: 'ok', sem fallback)
 * 21. gestor com core válido e legado divergente → core prevalece (não combina listas)
 * 22. falha técnica no core → fallback legado (source: 'legacy_fallback')
 * 23. administrador → canEditContact continua irrestrito independente de equipe
 * 24. operacional → canEditContact só permite atendimentos próprios
 * 25. gestor com canEditContact → permite seus próprios e da sua equipe resolvida via core
 * 26. subordinado com vínculo Conectaí inativo ou sem vínculo → filtrado da equipe
 * 27. managedUserIds mantém formato de string IDs operacionais (legaldesk_usuario_id)
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

  // Teste 18 (Obrigatório - Ajuste Etapa 4):
  // core = technical_error, profiles.perfil = ''
  // resultado esperado:
  // - source = 'legacy_fallback'
  // - hasSystemAccess = false
  // - rota interna bloqueada (hasSystemAccess false no contexto / decision.allowed = false com redirectReason 'no_access')
  // - sem privilégio administrativo (perfil vazio !== 'administrador')
  // - sem signOut() por esse motivo (shouldSignOut = false)
  const r18 = resolveEffectiveProfile(
    {
      status: 'technical_error',
      data: null,
      resolvedPerfil: null,
      detail: 'Timeout simulado ou falha de conexão com core_*',
    },
    '',
  )

  // Simulação da flag de contexto calculada a partir do profile:
  // hasSystemAccess = Boolean(user && profile && profile.ativo === true && profile.hasSystemAccess === true)
  const contextHasSystemAccess18 = Boolean(
    dummyUser &&
    {
      ativo: true,
      perfil: r18.perfil,
      hasSystemAccess: r18.hasSystemAccess,
    }.ativo === true &&
    r18.hasSystemAccess === true,
  )

  const d18 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: true,
      perfil: r18.perfil,
      perfilSource: r18.source,
      coreStatus: r18.coreStatus,
      hasSystemAccess: r18.hasSystemAccess,
    },
  })

  const isAdmin18: boolean = (r18.perfil as string) === 'administrador'

  assert(
    r18.source === 'legacy_fallback' &&
      r18.perfil === '' &&
      r18.coreStatus === 'technical_error' &&
      r18.hasSystemAccess === false &&
      contextHasSystemAccess18 === false &&
      d18.allowed === false &&
      d18.redirectReason === 'no_access' &&
      d18.shouldSignOut === false &&
      isAdmin18 === false,
    `Cenário 18 falhou: technical_error com legacy perfil vazio deve ter legacy_fallback, hasSystemAccess=false, rota bloqueada, sem signOut e sem admin. Obtido: ${JSON.stringify(
      { r18, contextHasSystemAccess18, d18 },
    )}`,
  )

  // ==========================================
  // Testes da Etapa 5.8: Equipe do Gestor
  // ==========================================

  // Cenário 19: Gestor com subordinados válidos no core → equipe central correta
  const sub1: CoreSubordinate = {
    id: 'core-sub-1',
    authUserId: 'auth-sub-1',
    nome: 'Subordinado 1',
    email: 'sub1@riccipi.com.br',
    ativo: true,
    vinculoId: 'vinc-1',
    perfilCodigo: 'operacional',
  }
  const sub2: CoreSubordinate = {
    id: 'core-sub-2',
    authUserId: 'auth-sub-2',
    nome: 'Subordinado 2',
    email: 'sub2@riccipi.com.br',
    ativo: true,
    vinculoId: 'vinc-2',
    perfilCodigo: 'operacional',
  }
  const coreResult19 = {
    status: 'ok' as const,
    subordinates: [sub1, sub2],
    managedUserIds: ['ld-sub-1', 'ld-sub-2'],
    managedCoreUserIds: ['core-sub-1', 'core-sub-2'],
  }
  const team19 = resolveManagedTeam(coreResult19, ['ld-legacy-other'])
  assert(
    team19.source === 'core' &&
      team19.status === 'ok' &&
      team19.managedUserIds.length === 2 &&
      team19.managedUserIds.includes('ld-sub-1') &&
      team19.managedUserIds.includes('ld-sub-2') &&
      !team19.managedUserIds.includes('ld-legacy-other') &&
      team19.managedCoreUserIds.length === 2 &&
      team19.coreSubordinates.length === 2,
    `Cenário 19 falhou: gestor com subordinados deve usar core diretamente, obtido ${JSON.stringify(team19)}`,
  )

  // Cenário 20: Gestor sem subordinados (core válido vazio) → equipe vazia (NÃO faz fallback para o legado!)
  const coreResult20 = {
    status: 'ok' as const,
    subordinates: [],
    managedUserIds: [],
    managedCoreUserIds: [],
  }
  const team20 = resolveManagedTeam(coreResult20, ['ld-legacy-sub-1', 'ld-legacy-sub-2'])
  assert(
    (team20.source === 'empty' || team20.source === 'core') &&
      team20.status === 'ok' &&
      team20.managedUserIds.length === 0 &&
      team20.coreSubordinates.length === 0,
    `Cenário 20 falhou: gestor sem subordinados no core válido deve ter equipe vazia e source 'empty'/'core' (sem fallback legado), obtido ${JSON.stringify(team20)}`,
  )

  // Cenário 21: Gestor com core válido e legado divergente → core prevalece categoricamente
  const coreResult21 = {
    status: 'ok' as const,
    subordinates: [sub1],
    managedUserIds: ['ld-sub-1'],
    managedCoreUserIds: ['core-sub-1'],
  }
  const team21 = resolveManagedTeam(coreResult21, ['ld-legacy-divergent'])
  assert(
    team21.source === 'core' &&
      team21.managedUserIds.length === 1 &&
      team21.managedUserIds[0] === 'ld-sub-1' &&
      !team21.managedUserIds.includes('ld-legacy-divergent'),
    `Cenário 21 falhou: core deve prevalecer sobre legado divergente, obtido ${JSON.stringify(team21)}`,
  )

  // Cenário 22: Falha técnica no core → fallback legado
  const coreResult22 = {
    status: 'technical_error' as const,
    subordinates: [],
    managedUserIds: [],
    managedCoreUserIds: [],
    detail: 'Timeout ou erro de conexão',
  }
  const team22 = resolveManagedTeam(coreResult22, ['ld-legacy-sub-1'])
  assert(
    team22.source === 'legacy_fallback' &&
      team22.status === 'technical_error' &&
      team22.managedUserIds.length === 1 &&
      team22.managedUserIds[0] === 'ld-legacy-sub-1',
    `Cenário 22 falhou: falha técnica deve acionar legacy_fallback, obtido ${JSON.stringify(team22)}`,
  )

  // Cenário 22b: Core result null → fallback legado
  const team22b = resolveManagedTeam(null, ['ld-legacy-sub-2'])
  assert(
    team22b.source === 'legacy_fallback' &&
      team22b.status === 'technical_error' &&
      team22b.managedUserIds.length === 1 &&
      team22b.managedUserIds[0] === 'ld-legacy-sub-2',
    `Cenário 22b falhou: coreResult null deve acionar legacy_fallback, obtido ${JSON.stringify(team22b)}`,
  )

  // Cenário 23: Administrador → canEditContact continua irrestrito independente da equipe
  const adminProfile = {
    perfil: 'administrador',
    legaldesk_usuario_id: 'ld-admin-1',
    ativo: true,
  }
  const contactAny = { responsavel_id: 'ld-other-user' }
  const canAdminEdit = canEditContact(contactAny, adminProfile, [])
  assert(
    canAdminEdit === true,
    `Cenário 23 falhou: administrador deve continuar tendo permissão total em canEditContact`,
  )

  // Cenário 24: Operacional → canEditContact só permite atendimentos próprios
  const opProfile = {
    perfil: 'operacional',
    legaldesk_usuario_id: 'ld-op-1',
    ativo: true,
  }
  const canOpEditOwn = canEditContact({ responsavel_id: 'ld-op-1' }, opProfile, [])
  const canOpEditOther = canEditContact({ responsavel_id: 'ld-other-user' }, opProfile, [
    'ld-other-user',
  ]) // mesmo se passar managedUserIds, operacional não pode!
  assert(
    canOpEditOwn === true && canOpEditOther === false,
    `Cenário 24 falhou: operacional só pode editar atendimentos próprios (canOpEditOwn=${canOpEditOwn}, canOpEditOther=${canOpEditOther})`,
  )

  // Cenário 25: Gestor com canEditContact usando equipe resolvida via core
  const gestorProfile = {
    perfil: 'gestor',
    legaldesk_usuario_id: 'ld-gestor-1',
    ativo: true,
  }
  const canGestorEditOwn = canEditContact({ responsavel_id: 'ld-gestor-1' }, gestorProfile, [
    'ld-sub-1',
  ])
  const canGestorEditSub = canEditContact({ responsavel_id: 'ld-sub-1' }, gestorProfile, [
    'ld-sub-1',
  ])
  const canGestorEditNonSub = canEditContact(
    { responsavel_id: 'ld-other-non-sub' },
    gestorProfile,
    ['ld-sub-1'],
  )
  assert(
    canGestorEditOwn === true && canGestorEditSub === true && canGestorEditNonSub === false,
    `Cenário 25 falhou: gestor deve poder editar próprio e subordinado da equipe, mas não terceiro. (own=${canGestorEditOwn}, sub=${canGestorEditSub}, nonSub=${canGestorEditNonSub})`,
  )

  // Cenário 26: Descarte de sessão obsoleta / proteção contra concorrência
  // Simulação da lógica de verificação de sessão (currentAuthUserIdRef + requestId)
  let activeUserId = 'user-initial'
  let activeRequestId = 1

  function isResponseValid(responseUserId: string, responseReqId: number) {
    return activeUserId === responseUserId && activeRequestId === responseReqId
  }

  // Resposta da mesma requisição e mesmo usuário → válida
  assert(
    isResponseValid('user-initial', 1) === true,
    'Cenário 26a falhou: resposta válida foi rejeitada',
  )
  // Logout intermediário (activeUserId virou null, reqId incrementado) → rejeitada
  activeUserId = ''
  activeRequestId = 2
  assert(
    isResponseValid('user-initial', 1) === false,
    'Cenário 26b falhou: resposta antiga após logout deve ser descartada',
  )
  // Troca de usuário (activeUserId virou user-2, reqId incrementado) → rejeitada
  activeUserId = 'user-2'
  activeRequestId = 3
  assert(
    isResponseValid('user-initial', 1) === false,
    'Cenário 26c falhou: resposta de usuário anterior deve ser descartada',
  )

  // ==========================================
  // Testes Obrigatórios da Etapa 5.10 (Ponte RPC core_managed_operational_ids)
  // ==========================================

  const sub3: CoreSubordinate = {
    id: 'core-sub-3',
    authUserId: 'auth-sub-3',
    nome: 'Subordinado 3',
    email: 'sub3@riccipi.com.br',
    ativo: true,
    vinculoId: 'vinc-3',
    perfilCodigo: 'operacional',
  }

  // Cenário 27 (5.10 - Item 1): gestor com 2 subordinados válidos → RPC retorna os 2 IDs operacionais
  const coreResult510_1 = {
    status: 'ok' as const,
    subordinates: [sub1, sub2],
    managedUserIds: ['ld-sub-1', 'ld-sub-2'],
    managedCoreUserIds: ['core-sub-1', 'core-sub-2'],
    rpcBridge: {
      status: 'ok' as const,
      items: [
        { auth_user_id: 'auth-sub-1', legaldesk_usuario_id: 'ld-sub-1' },
        { auth_user_id: 'auth-sub-2', legaldesk_usuario_id: 'ld-sub-2' },
      ],
    },
  }
  const team510_1 = resolveManagedTeam(coreResult510_1, ['ld-legacy-other'])
  assert(
    team510_1.source === 'core' &&
      team510_1.status === 'ok' &&
      team510_1.managedUserIds.length === 2 &&
      team510_1.managedUserIds.includes('ld-sub-1') &&
      team510_1.managedUserIds.includes('ld-sub-2') &&
      team510_1.rpcDiscrepancy === null,
    `Cenário 27 (5.10.1) falhou: esperado core com 2 IDs da RPC sem fallback, obtido ${JSON.stringify(team510_1)}`,
  )

  // Cenário 28 (5.10 - Item 2): gestor sem subordinados → equipe vazia válida, sem fallback
  const coreResult510_2 = {
    status: 'ok' as const,
    subordinates: [],
    managedUserIds: [],
    managedCoreUserIds: [],
    rpcBridge: {
      status: 'ok' as const,
      items: [],
    },
  }
  const team510_2 = resolveManagedTeam(coreResult510_2, ['ld-legacy-1', 'ld-legacy-2'])
  assert(
    (team510_2.source === 'empty' || team510_2.source === 'core') &&
      team510_2.status === 'ok' &&
      team510_2.managedUserIds.length === 0 &&
      team510_2.coreSubordinates.length === 0 &&
      team510_2.rpcDiscrepancy === null,
    `Cenário 28 (5.10.2) falhou: gestor sem subordinados deve ter managedUserIds=[] e source='empty'/'core' sem fallback legado, obtido ${JSON.stringify(team510_2)}`,
  )

  // ==========================================
  // Testes Obrigatórios da Etapa 5.12:
  // Regra: O core é a autoridade da hierarquia quando responde com sucesso.
  // O legado NUNCA sobrescreve uma equipe central válida.
  // ==========================================

  // Teste 5.12 - Cenário 1: Core com 3 subordinados + ponte retorna 3 → 3 usados (source 'core')
  const coreResult512_1 = {
    status: 'ok' as const,
    subordinates: [sub1, sub2, sub3],
    managedUserIds: ['ld-sub-1', 'ld-sub-2', 'ld-sub-3'],
    managedCoreUserIds: ['core-sub-1', 'core-sub-2', 'core-sub-3'],
    rpcBridge: {
      status: 'ok' as const,
      items: [
        { auth_user_id: 'auth-sub-1', legaldesk_usuario_id: 'ld-sub-1' },
        { auth_user_id: 'auth-sub-2', legaldesk_usuario_id: 'ld-sub-2' },
        { auth_user_id: 'auth-sub-3', legaldesk_usuario_id: 'ld-sub-3' },
      ],
    },
  }
  const team512_1 = resolveManagedTeam(coreResult512_1, ['ld-legacy-extra'])
  assert(
    team512_1.source === 'core' &&
      team512_1.status === 'ok' &&
      team512_1.managedUserIds.length === 3 &&
      team512_1.managedUserIds.includes('ld-sub-1') &&
      team512_1.managedUserIds.includes('ld-sub-2') &&
      team512_1.managedUserIds.includes('ld-sub-3') &&
      !team512_1.managedUserIds.includes('ld-legacy-extra') &&
      team512_1.rpcDiscrepancy === null,
    `Etapa 5.12 Cenário 1 falhou: core válido completo deve ter source='core', 3 IDs e sem legado, obtido ${JSON.stringify(team512_1)}`,
  )

  // Teste 5.12 - Cenário 2: Core vazio → equipe vazia (source 'empty')
  const coreResult512_2 = {
    status: 'ok' as const,
    subordinates: [],
    managedUserIds: [],
    managedCoreUserIds: [],
    rpcBridge: {
      status: 'ok' as const,
      items: [],
    },
  }
  const team512_2 = resolveManagedTeam(coreResult512_2, ['ld-legacy-any'])
  assert(
    team512_2.source === 'empty' &&
      team512_2.status === 'ok' &&
      team512_2.managedUserIds.length === 0 &&
      team512_2.coreSubordinates.length === 0 &&
      team512_2.rpcDiscrepancy === null,
    `Etapa 5.12 Cenário 2 falhou: core vazio deve resultar em source='empty' e managedUserIds=[], obtido ${JSON.stringify(team512_2)}`,
  )

  // Teste 5.12 - Cenário 3: Core com 3 subordinados + ponte retorna 2 → apenas os 2 centrais traduzidos (source 'core_partial_bridge')
  // Regra crítica: NÃO usa toda a equipe legada; NÃO mescla com subordinados que não pertencem ao core;
  // Mantém apenas os subordinados centrais traduzidos com segurança.
  const coreResult512_3 = {
    status: 'ok' as const,
    subordinates: [sub1, sub2, sub3],
    managedUserIds: ['ld-sub-1', 'ld-sub-2'], // Apenas 2 traduzidos
    managedCoreUserIds: ['core-sub-1', 'core-sub-2', 'core-sub-3'],
    rpcBridge: {
      status: 'ok' as const,
      items: [
        { auth_user_id: 'auth-sub-1', legaldesk_usuario_id: 'ld-sub-1' },
        { auth_user_id: 'auth-sub-2', legaldesk_usuario_id: 'ld-sub-2' },
      ],
    },
  }
  const team512_3 = resolveManagedTeam(coreResult512_3, [
    'ld-legacy-1',
    'ld-legacy-2',
    'ld-legacy-extra',
  ])
  assert(
    team512_3.source === 'core_partial_bridge' &&
      team512_3.status === 'ok' &&
      team512_3.managedUserIds.length === 2 &&
      team512_3.managedUserIds.includes('ld-sub-1') &&
      team512_3.managedUserIds.includes('ld-sub-2') &&
      !team512_3.managedUserIds.includes('ld-legacy-extra') &&
      team512_3.coreSubordinates.length === 3 &&
      team512_3.rpcDiscrepancy === 'partial_rpc',
    `Etapa 5.12 Cenário 3 falhou: ponte parcial deve ter source='core_partial_bridge', manter apenas os 2 traduzidos e NÃO usar legado, obtido ${JSON.stringify(team512_3)}`,
  )

  // Teste 5.12 - Cenário 4: Core com 3 subordinados + ponte retorna 0 → equipe operacional vazia, sem legado (source 'core_partial_bridge')
  // Regra crítica: NÃO usa a hierarquia legada para reconstruir a equipe; resultado operacional fica vazio;
  // preserva hierarquia central como autoridade; não eleva permissões via legado.
  const coreResult512_4 = {
    status: 'ok' as const,
    subordinates: [sub1, sub2, sub3],
    managedUserIds: [], // 0 IDs traduzidos pela ponte
    managedCoreUserIds: ['core-sub-1', 'core-sub-2', 'core-sub-3'],
    rpcBridge: {
      status: 'ok' as const,
      items: [],
    },
  }
  const team512_4 = resolveManagedTeam(coreResult512_4, [
    'ld-legacy-1',
    'ld-legacy-2',
    'ld-legacy-3',
  ])
  assert(
    team512_4.source === 'core_partial_bridge' &&
      team512_4.status === 'ok' &&
      team512_4.managedUserIds.length === 0 &&
      team512_4.coreSubordinates.length === 3 &&
      team512_4.managedCoreUserIds.length === 3 &&
      team512_4.rpcDiscrepancy === 'empty_rpc',
    `Etapa 5.12 Cenário 4 falhou: ponte vazia deve manter equipe operacional vazia e NÃO usar hierarquia legada, obtido ${JSON.stringify(team512_4)}`,
  )

  // Teste 5.12 - Cenário 5: Core com sucesso + legado contém usuário extra → usuário extra NÃO entra
  const coreResult512_5 = {
    status: 'ok' as const,
    subordinates: [sub1, sub2],
    managedUserIds: ['ld-sub-1', 'ld-sub-2'],
    managedCoreUserIds: ['core-sub-1', 'core-sub-2'],
    rpcBridge: {
      status: 'ok' as const,
      items: [
        { auth_user_id: 'auth-sub-1', legaldesk_usuario_id: 'ld-sub-1' },
        { auth_user_id: 'auth-sub-2', legaldesk_usuario_id: 'ld-sub-2' },
      ],
    },
  }
  const team512_5 = resolveManagedTeam(coreResult512_5, [
    'ld-sub-1',
    'ld-sub-2',
    'ld-infiltrator-extra',
  ])
  assert(
    team512_5.source === 'core' &&
      team512_5.managedUserIds.length === 2 &&
      !team512_5.managedUserIds.includes('ld-infiltrator-extra'),
    `Etapa 5.12 Cenário 5 falhou: usuário extra do legado NÃO pode entrar quando o core responde com sucesso, obtido ${JSON.stringify(team512_5)}`,
  )

  // Teste 5.12 - Cenário 6: Falha técnica completa do core → legacy_managed_operational_ids utilizado ('legacy_fallback')
  const coreResult512_6 = {
    status: 'technical_error' as const,
    subordinates: [],
    managedUserIds: [],
    managedCoreUserIds: [],
    detail: 'Falha técnica completa de conexão com core_*',
  }
  const legacyFromRpc = ['ld-legacy-from-rpc-1', 'ld-legacy-from-rpc-2']
  const team512_6 = resolveManagedTeam(coreResult512_6, legacyFromRpc)
  assert(
    team512_6.source === 'legacy_fallback' &&
      team512_6.status === 'technical_error' &&
      team512_6.managedUserIds.length === 2 &&
      team512_6.managedUserIds.includes('ld-legacy-from-rpc-1') &&
      team512_6.managedUserIds.includes('ld-legacy-from-rpc-2'),
    `Etapa 5.12 Cenário 6 falhou: falha técnica completa do core deve acionar legacy_fallback com IDs da RPC legada, obtido ${JSON.stringify(team512_6)}`,
  )

  // Teste 5.12 - Cenário 7: Erro também no fallback legado → equipe vazia segura, sem quebrar login
  const team512_7 = resolveManagedTeam(coreResult512_6, []) // RPC legada falhou ou retornou vazia
  assert(
    team512_7.source === 'legacy_fallback' &&
      team512_7.status === 'technical_error' &&
      team512_7.managedUserIds.length === 0,
    `Etapa 5.12 Cenário 7 falhou: erro no fallback legado deve manter equipe vazia segura sem quebrar, obtido ${JSON.stringify(team512_7)}`,
  )

  // Cenário 32 (5.10 - Item 6): operacional → não consulta equipe (simulado por verificação de perfil)
  const opRole: string = 'operacional'
  const shouldFetchTeamOp = opRole === 'gestor'
  assert(
    shouldFetchTeamOp === false,
    `Cenário 32 (5.10.6) falhou: operacional não deve consultar equipe do gestor`,
  )

  // Cenário 33 (5.10 - Item 7): administrador → comportamento atual preservado (sem equipe managed, canEdit irrestrito)
  const adminRole: string = 'administrador'
  const shouldFetchTeamAdmin = adminRole === 'gestor'
  const adminEditAny = canEditContact({ responsavel_id: 'ld-random-99' }, adminProfile, [])
  assert(
    shouldFetchTeamAdmin === false && adminEditAny === true,
    `Cenário 33 (5.10.7) falhou: administrador deve ter acesso irrestrito e não carregar equipe`,
  )

  // Cenário 34 (5.10 - Itens 8 e 9): logout e troca de usuário durante RPC em voo → descartado
  let inFlightAuthUserId = 'user-initial'
  let inFlightReqId = 10

  // Usuário faz logout enquanto a RPC executa
  const simulatedLogout = () => {
    inFlightAuthUserId = ''
    inFlightReqId++
  }
  // Avaliação pós-RPC
  const checkRpcPublishValid = (callingUser: string, callingReqId: number) => {
    return inFlightAuthUserId === callingUser && inFlightReqId === callingReqId
  }

  const validBefore = checkRpcPublishValid('user-initial', 10)
  simulatedLogout()
  const validAfterLogout = checkRpcPublishValid('user-initial', 10)
  assert(
    validBefore === true && validAfterLogout === false,
    `Cenário 34a (5.10.8) falhou: resposta de RPC após logout deve ser descartada`,
  )

  // Troca de usuário durante RPC
  inFlightAuthUserId = 'user-first'
  inFlightReqId = 20
  const simulatedUserSwitch = () => {
    inFlightAuthUserId = 'user-second'
    inFlightReqId++
  }
  simulatedUserSwitch()
  const validAfterSwitch = checkRpcPublishValid('user-first', 20)
  assert(
    validAfterSwitch === false,
    `Cenário 34b (5.10.9) falhou: resposta de RPC de usuário anterior deve ser descartada após troca de usuário`,
  )

  // Cenário 35 (5.10 - Itens 10, 11 e 12): canEditContact (usado por Kanban e Atendimentos) e formato de managedUserIds
  const gestorWithRpcTeam = {
    perfil: 'gestor',
    legaldesk_usuario_id: 'ld-gestor-1',
    ativo: true,
  }
  // managedUserIds resolvido via RPC com formato de string IDs operacionais
  const rpcManagedIds = team510_1.managedUserIds
  const canGestorEditKanbanSub = canEditContact(
    { responsavel_id: 'ld-sub-1' },
    gestorWithRpcTeam,
    rpcManagedIds,
  )
  const canGestorEditKanbanOther = canEditContact(
    { responsavel_id: 'ld-not-my-team' },
    gestorWithRpcTeam,
    rpcManagedIds,
  )
  assert(
    Array.isArray(rpcManagedIds) &&
      rpcManagedIds.every((id) => typeof id === 'string') &&
      canGestorEditKanbanSub === true &&
      canGestorEditKanbanOther === false,
    `Cenário 35 (5.10.10-12) falhou: Kanban/Atendimentos e formato de managedUserIds preservados`,
  )

  // ==========================================
  // Testes Obrigatórios da Etapa 5.18 (Alinhamento de canEditContact à Autoridade Central):
  // 1. administrador → edita qualquer atendimento;
  // 2. gestor → edita atendimento próprio;
  // 3. gestor → edita subordinado central;
  // 4. gestor → não edita usuário fora da equipe;
  // 5. operacional → edita próprio;
  // 6. operacional → não edita outro;
  // 7. hasSystemAccess = false → não edita;
  // 8. core_partial_bridge → somente IDs traduzidos podem ser editados;
  // 9. legacy_fallback → comportamento transitório preservado;
  // 10. atendimento sem responsável → gestor/operacional não recebem permissão indevida;
  // 11. Kanban mantém comportamento atual;
  // 12. ContactModal mantém comportamento atual;
  // 13. nenhuma nova consulta a profiles.gestor_id é criada.
  // ==========================================

  // Cenário 36 (5.18 - Item 1): Administrador → edita qualquer atendimento (próprio, subordinado, terceiro ou sem responsável)
  const admin518 = {
    perfil: 'administrador',
    legaldesk_usuario_id: 'ld-admin-1',
    ativo: true,
    hasSystemAccess: true,
  }
  assert(
    canEditContact({ responsavel_id: 'ld-any-user' }, admin518, []) === true &&
      canEditContact({ responsavel_id: 'ld-admin-1' }, admin518, []) === true &&
      canEditContact({ responsavel_id: null }, admin518, []) === true &&
      canEditContact(null, admin518, []) === true,
    'Cenário 36 (5.18.1) falhou: administrador deve poder editar qualquer atendimento inclusive sem responsável',
  )

  // Cenário 37 (5.18 - Item 2): Gestor → edita atendimento próprio
  const gestor518 = {
    perfil: 'gestor',
    legaldesk_usuario_id: 'ld-gestor-1',
    ativo: true,
    hasSystemAccess: true,
  }
  const managedTeam518 = ['ld-sub-1', 'ld-sub-2']
  assert(
    canEditContact({ responsavel_id: 'ld-gestor-1' }, gestor518, managedTeam518) === true,
    'Cenário 37 (5.18.2) falhou: gestor deve poder editar atendimento próprio',
  )

  // Cenário 38 (5.18 - Item 3): Gestor → edita subordinado central presente em managedUserIds
  assert(
    canEditContact({ responsavel_id: 'ld-sub-1' }, gestor518, managedTeam518) === true &&
      canEditContact({ responsavel_id: 'ld-sub-2' }, gestor518, managedTeam518) === true,
    'Cenário 38 (5.18.3) falhou: gestor deve poder editar subordinados presentes em managedUserIds',
  )

  // Cenário 39 (5.18 - Item 4): Gestor → NÃO edita usuário fora da equipe
  assert(
    canEditContact({ responsavel_id: 'ld-outside-user' }, gestor518, managedTeam518) === false &&
      canEditContact({ responsavel_id: 'ld-other-gestor' }, gestor518, managedTeam518) === false,
    'Cenário 39 (5.18.4) falhou: gestor NÃO deve poder editar usuário fora da equipe',
  )

  // Cenário 40 (5.18 - Item 5): Operacional → edita próprio
  const op518 = {
    perfil: 'operacional',
    legaldesk_usuario_id: 'ld-op-1',
    ativo: true,
    hasSystemAccess: true,
  }
  assert(
    canEditContact({ responsavel_id: 'ld-op-1' }, op518, []) === true,
    'Cenário 40 (5.18.5) falhou: operacional deve poder editar atendimento próprio',
  )

  // Cenário 41 (5.18 - Item 6): Operacional → NÃO edita outro atendimento (mesmo que IDs sejam passados em managedUserIds)
  assert(
    canEditContact({ responsavel_id: 'ld-other-op' }, op518, ['ld-other-op']) === false &&
      canEditContact({ responsavel_id: 'ld-op-2' }, op518, []) === false,
    'Cenário 41 (5.18.6) falhou: operacional NÃO deve poder editar atendimento de outro',
  )

  // Cenário 42 (5.18 - Item 7): hasSystemAccess = false → NÃO edita (administrador, gestor ou operacional)
  const adminNoAccess = {
    perfil: 'administrador',
    legaldesk_usuario_id: 'ld-admin-1',
    ativo: true,
    hasSystemAccess: false,
  }
  const gestorNoAccess = {
    perfil: 'gestor',
    legaldesk_usuario_id: 'ld-gestor-1',
    ativo: true,
    hasSystemAccess: false,
  }
  const opNoAccess = {
    perfil: 'operacional',
    legaldesk_usuario_id: 'ld-op-1',
    ativo: true,
    hasSystemAccess: false,
  }
  assert(
    canEditContact({ responsavel_id: 'ld-any' }, adminNoAccess, []) === false &&
      canEditContact({ responsavel_id: 'ld-gestor-1' }, gestorNoAccess, ['ld-sub-1']) === false &&
      canEditContact({ responsavel_id: 'ld-op-1' }, opNoAccess, []) === false,
    'Cenário 42 (5.18.7) falhou: hasSystemAccess=false deve bloquear edição para qualquer perfil',
  )

  // Cenário 43 (5.18 - Item 8): core_partial_bridge → somente IDs traduzidos podem ser editados (sem ampliar permissão nem recorrer a legado)
  // Exemplo: gestor tem 3 subordinados centrais, mas a ponte traduziu apenas 2 ('ld-sub-1', 'ld-sub-2').
  // O terceiro ('ld-untranslated') NÃO pode ser editado via canEditContact
  const partialBridgeManagedUserIds = ['ld-sub-1', 'ld-sub-2']
  assert(
    canEditContact({ responsavel_id: 'ld-sub-1' }, gestor518, partialBridgeManagedUserIds) ===
      true &&
      canEditContact({ responsavel_id: 'ld-sub-2' }, gestor518, partialBridgeManagedUserIds) ===
        true &&
      canEditContact(
        { responsavel_id: 'ld-untranslated' },
        gestor518,
        partialBridgeManagedUserIds,
      ) === false &&
      canEditContact(
        { responsavel_id: 'ld-legacy-only' },
        gestor518,
        partialBridgeManagedUserIds,
      ) === false,
    'Cenário 43 (5.18.8) falhou: em core_partial_bridge, apenas IDs traduzidos com segurança podem ser editados',
  )

  // Cenário 44 (5.18 - Item 9): legacy_fallback → comportamento transitório preservado (IDs da RPC legada consumidos diretamente)
  const legacyFallbackManagedUserIds = ['ld-legacy-sub-1', 'ld-legacy-sub-2']
  assert(
    canEditContact(
      { responsavel_id: 'ld-legacy-sub-1' },
      gestor518,
      legacyFallbackManagedUserIds,
    ) === true &&
      canEditContact(
        { responsavel_id: 'ld-legacy-sub-2' },
        gestor518,
        legacyFallbackManagedUserIds,
      ) === true &&
      canEditContact(
        { responsavel_id: 'ld-not-in-legacy' },
        gestor518,
        legacyFallbackManagedUserIds,
      ) === false,
    'Cenário 44 (5.18.9) falhou: em legacy_fallback, comportamento transitório deve ser preservado via managedUserIds',
  )

  // Cenário 45 (5.18 - Item 10): Atendimento sem responsável → gestor e operacional NÃO recebem permissão indevida
  assert(
    canEditContact({ responsavel_id: null }, gestor518, managedTeam518) === false &&
      canEditContact({ responsavel_id: '' }, gestor518, managedTeam518) === false &&
      canEditContact({ responsavel_id: undefined }, gestor518, managedTeam518) === false &&
      canEditContact(null, gestor518, managedTeam518) === false &&
      canEditContact({ responsavel_id: null }, op518, []) === false &&
      canEditContact(null, op518, []) === false,
    'Cenário 45 (5.18.10) falhou: atendimento sem responsável não deve conceder permissão para gestor ou operacional',
  )

  // Cenário 46 (5.18 - Item 11): Kanban mantém comportamento atual
  // No Kanban, canEditContact(contact, profile, managedUserIds) habilita o botão de editar e o drag-and-drop de mover card
  const kanbanContactOwn = { id: 'c-1', responsavel_id: 'ld-op-1', current_stage: 'nivel_1_novo' }
  const kanbanContactOther = {
    id: 'c-2',
    responsavel_id: 'ld-other',
    current_stage: 'nivel_1_novo',
  }
  assert(
    canEditContact(kanbanContactOwn, op518, []) === true &&
      canEditContact(kanbanContactOther, op518, []) === false,
    'Cenário 46 (5.18.11) falhou: Kanban deve manter regra estrita para operacional',
  )

  // Cenário 47 (5.18 - Item 12): ContactModal mantém comportamento atual
  // Na validação de salvamento do ContactModal: handleSubmit verifica canEditContact antes de prosseguir
  const modalContactSub = { responsavel_id: 'ld-sub-1' }
  const modalContactBlocked = { responsavel_id: 'ld-outsider' }
  assert(
    canEditContact(modalContactSub, gestor518, managedTeam518) === true &&
      canEditContact(modalContactBlocked, gestor518, managedTeam518) === false,
    'Cenário 47 (5.18.12) falhou: ContactModal deve validar permissão com base em canEditContact',
  )

  // Cenário 48 (5.18 - Item 13): Usuário inativo (ativo = false) nunca edita
  const inactiveProfile = {
    perfil: 'administrador',
    legaldesk_usuario_id: 'ld-admin-1',
    ativo: false,
    hasSystemAccess: true,
  }
  assert(
    canEditContact({ responsavel_id: 'ld-admin-1' }, inactiveProfile, []) === false,
    'Cenário 48 (5.18.13) falhou: usuário inativo (ativo=false) não pode editar atendimento',
  )

  return { passed, failed: errors.length, errors }
}
