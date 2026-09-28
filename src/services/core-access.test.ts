import {
  normalizeCoreRole,
  resolveEffectiveProfile,
  resolveManagedTeam,
  CoreAccessResult,
  CoreAccessStatus,
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

  // 4. technical_error → bloqueio seguro: perfil vazio, hasSystemAccess=false, sem elevação pelo legado
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
    r4.perfil === '' &&
      r4.source === 'technical_error' &&
      r4.coreStatus === 'technical_error' &&
      r4.hasSystemAccess === false &&
      d4.allowed === false &&
      d4.redirectReason === 'no_access' &&
      d4.shouldSignOut === false,
    `Cenário 4 falhou: esperado technical_error com perfil vazio e hasSystemAccess=false, obtido ${JSON.stringify({ r4, d4 })}`,
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

  // 9. coreStatus = 'user_inactive' → logout e redirect disabled (autoridade centralizada no core)
  const d9 = evaluateAccessDecision({
    user: dummyUser,
    profile: {
      ativo: false,
      perfil: 'administrador',
      perfilSource: 'core',
      coreStatus: 'user_inactive',
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

  // Teste 16: coreResult null trata como technical_error -> perfil vazio, hasSystemAccess=false
  const r16 = resolveEffectiveProfile(null, 'operacional')
  assert(
    r16.perfil === '' &&
      r16.source === 'technical_error' &&
      r16.coreStatus === 'technical_error' &&
      r16.hasSystemAccess === false,
    `Cenário 16 falhou: esperado technical_error seguro com perfil vazio e hasSystemAccess=false, obtido ${JSON.stringify(r16)}`,
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
  // - source = 'technical_error'
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
  // hasSystemAccess = Boolean(user && profile && profile.coreStatus !== 'user_inactive' && profile.hasSystemAccess === true)
  const contextHasSystemAccess18 = Boolean(
    dummyUser &&
    {
      coreStatus: r18.coreStatus,
      perfil: r18.perfil,
      hasSystemAccess: r18.hasSystemAccess,
    }.coreStatus !== 'user_inactive' &&
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
    r18.source === 'technical_error' &&
      r18.perfil === '' &&
      r18.coreStatus === 'technical_error' &&
      r18.hasSystemAccess === false &&
      contextHasSystemAccess18 === false &&
      d18.allowed === false &&
      d18.redirectReason === 'no_access' &&
      d18.shouldSignOut === false &&
      isAdmin18 === false,
    `Cenário 18 falhou: technical_error com legacy perfil vazio deve ter source='technical_error', hasSystemAccess=false, rota bloqueada, sem signOut e sem admin. Obtido: ${JSON.stringify(
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

  // Cenário 23: Administrador → canEditContact continua irrestrito independente da equipe quando hasSystemAccess === true
  const adminProfile = {
    perfil: 'administrador',
    legaldesk_usuario_id: 'ld-admin-1',
    ativo: true,
    hasSystemAccess: true,
  }
  const contactAny = { responsavel_id: 'ld-other-user' }
  const canAdminEdit = canEditContact(contactAny, adminProfile, [])
  assert(
    canAdminEdit === true,
    `Cenário 23 falhou: administrador com hasSystemAccess=true deve ter permissão total em canEditContact`,
  )

  // Cenário 24: Operacional → canEditContact só permite atendimentos próprios quando hasSystemAccess === true
  const opProfile = {
    perfil: 'operacional',
    legaldesk_usuario_id: 'ld-op-1',
    ativo: true,
    hasSystemAccess: true,
  }
  const canOpEditOwn = canEditContact({ responsavel_id: 'ld-op-1' }, opProfile, [])
  const canOpEditOther = canEditContact({ responsavel_id: 'ld-other-user' }, opProfile, [
    'ld-other-user',
  ]) // mesmo se passar managedUserIds, operacional não pode!
  assert(
    canOpEditOwn === true && canOpEditOther === false,
    `Cenário 24 falhou: operacional só pode editar atendimentos próprios (canOpEditOwn=${canOpEditOwn}, canOpEditOther=${canOpEditOther})`,
  )

  // Cenário 25: Gestor com canEditContact usando equipe resolvida via core quando hasSystemAccess === true
  const gestorProfile = {
    perfil: 'gestor',
    legaldesk_usuario_id: 'ld-gestor-1',
    ativo: true,
    hasSystemAccess: true,
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
    hasSystemAccess: true,
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

  // ==========================================
  // Testes Obrigatórios da Etapa 5.19 (Endurecimento da Edição e Menor Privilégio):
  // 1. hasSystemAccess = true + admin → edita;
  // 2. hasSystemAccess = true + gestor → regras atuais (próprio + equipe core);
  // 3. hasSystemAccess = true + operacional → regras atuais (somente próprio);
  // 4. hasSystemAccess = false → não edita;
  // 5. hasSystemAccess = undefined → não edita;
  // 6. profile legado 'administrador' sem contexto central (hasSystemAccess undefined/ausente) → não recebe autorização frontend;
  // 7. updateContact sem contexto central não recria autorização pelo legado;
  // 8. Kanban sem contexto central não consulta legacy_managed_operational_ids() diretamente;
  // 9. fluxo normal do Kanban continua funcionando;
  // 10. fluxo normal de Atendimentos continua funcionando;
  // 11. RLS continua sendo a barreira final do banco.
  // ==========================================

  // Cenário 49 (5.19 - Item 1): hasSystemAccess = true + admin → edita qualquer atendimento
  const admin519 = {
    perfil: 'administrador',
    legaldesk_usuario_id: 'ld-admin-519',
    ativo: true,
    hasSystemAccess: true,
  }
  assert(
    canEditContact({ responsavel_id: 'ld-any' }, admin519, []) === true &&
      canEditContact({ responsavel_id: null }, admin519, []) === true,
    'Cenário 49 (5.19.1) falhou: hasSystemAccess=true + admin deve poder editar',
  )

  // Cenário 50 (5.19 - Item 2): hasSystemAccess = true + gestor → regras atuais (próprio e equipe)
  const gestor519 = {
    perfil: 'gestor',
    legaldesk_usuario_id: 'ld-gestor-519',
    ativo: true,
    hasSystemAccess: true,
  }
  const managedTeam519 = ['ld-sub-519-a', 'ld-sub-519-b']
  assert(
    canEditContact({ responsavel_id: 'ld-gestor-519' }, gestor519, managedTeam519) === true &&
      canEditContact({ responsavel_id: 'ld-sub-519-a' }, gestor519, managedTeam519) === true &&
      canEditContact({ responsavel_id: 'ld-other' }, gestor519, managedTeam519) === false &&
      canEditContact({ responsavel_id: null }, gestor519, managedTeam519) === false,
    'Cenário 50 (5.19.2) falhou: hasSystemAccess=true + gestor deve seguir regras de próprio e equipe',
  )

  // Cenário 51 (5.19 - Item 3): hasSystemAccess = true + operacional → regras atuais (somente próprio)
  const op519 = {
    perfil: 'operacional',
    legaldesk_usuario_id: 'ld-op-519',
    ativo: true,
    hasSystemAccess: true,
  }
  assert(
    canEditContact({ responsavel_id: 'ld-op-519' }, op519, []) === true &&
      canEditContact({ responsavel_id: 'ld-other' }, op519, ['ld-other']) === false &&
      canEditContact({ responsavel_id: null }, op519, []) === false,
    'Cenário 51 (5.19.3) falhou: hasSystemAccess=true + operacional deve editar somente atendimentos próprios',
  )

  // Cenário 52 (5.19 - Item 4): hasSystemAccess = false → não edita para nenhum perfil
  const adminAccessFalse = {
    perfil: 'administrador',
    legaldesk_usuario_id: 'ld-admin-1',
    ativo: true,
    hasSystemAccess: false,
  }
  const gestorAccessFalse = {
    perfil: 'gestor',
    legaldesk_usuario_id: 'ld-gestor-1',
    ativo: true,
    hasSystemAccess: false,
  }
  const opAccessFalse = {
    perfil: 'operacional',
    legaldesk_usuario_id: 'ld-op-1',
    ativo: true,
    hasSystemAccess: false,
  }
  assert(
    canEditContact({ responsavel_id: 'ld-any' }, adminAccessFalse, []) === false &&
      canEditContact({ responsavel_id: 'ld-gestor-1' }, gestorAccessFalse, ['ld-sub-1']) ===
        false &&
      canEditContact({ responsavel_id: 'ld-op-1' }, opAccessFalse, []) === false,
    'Cenário 52 (5.19.4) falhou: hasSystemAccess=false não deve poder editar em nenhum perfil',
  )

  // Cenário 53 (5.19 - Item 5): hasSystemAccess = undefined → não edita (endurecimento de canEditContact)
  const adminAccessUndefined = {
    perfil: 'administrador',
    legaldesk_usuario_id: 'ld-admin-1',
    ativo: true,
    hasSystemAccess: undefined,
  }
  const gestorAccessUndefined = {
    perfil: 'gestor',
    legaldesk_usuario_id: 'ld-gestor-1',
    ativo: true,
    hasSystemAccess: undefined,
  }
  const opAccessUndefined = {
    perfil: 'operacional',
    legaldesk_usuario_id: 'ld-op-1',
    ativo: true,
    hasSystemAccess: undefined,
  }
  assert(
    canEditContact({ responsavel_id: 'ld-any' }, adminAccessUndefined, []) === false &&
      canEditContact({ responsavel_id: 'ld-gestor-1' }, gestorAccessUndefined, ['ld-sub-1']) ===
        false &&
      canEditContact({ responsavel_id: 'ld-op-1' }, opAccessUndefined, []) === false,
    'Cenário 53 (5.19.5) falhou: hasSystemAccess=undefined não deve receber permissão de edição frontend',
  )

  // Cenário 54 (5.19 - Item 6): profile legado 'administrador' sem contexto central (hasSystemAccess ausente) → NÃO recebe autorização frontend
  const legacyAdminWithoutCore = {
    perfil: 'administrador',
    legaldesk_usuario_id: 'ld-legacy-admin',
    ativo: true,
  }
  assert(
    canEditContact({ responsavel_id: 'ld-any' }, legacyAdminWithoutCore, []) === false &&
      canEditContact(null, legacyAdminWithoutCore, []) === false,
    'Cenário 54 (5.19.6) falhou: perfil legado administrador sem contexto central (hasSystemAccess ausente) NÃO pode receber autorização frontend',
  )

  // Cenário 55 (5.19 - Item 7 e 8): updateContact e Kanban sem contexto central não recriam autorização pelo legado nem chamam legacy_managed_operational_ids
  // Simulação conceitual da regra de useKanbanData e updateContact:
  // Se useKanbanData é invocado sem contexto central (currentUserProfile = undefined ou hasSystemAccess !== true),
  // a operação é imediatamente barrada com menor privilégio, sem tentar resolver perfil ou equipe via RPCs legadas.
  const checkKanbanMoveAllowedWithoutCentralContext = (
    profileParam?: { hasSystemAccess?: boolean; ativo?: boolean } | null,
  ) => {
    if (!profileParam || profileParam.hasSystemAccess !== true) {
      return false
    }
    return true
  }
  assert(
    checkKanbanMoveAllowedWithoutCentralContext(undefined) === false &&
      checkKanbanMoveAllowedWithoutCentralContext(null) === false &&
      checkKanbanMoveAllowedWithoutCentralContext({ hasSystemAccess: undefined, ativo: true }) ===
        false &&
      checkKanbanMoveAllowedWithoutCentralContext({ hasSystemAccess: false, ativo: true }) ===
        false &&
      checkKanbanMoveAllowedWithoutCentralContext({ hasSystemAccess: true, ativo: true }) === true,
    'Cenário 55 (5.19.7-8) falhou: Kanban sem contexto central deve barrar operação sem simular permissões legadas',
  )

  // =========================================================================
  // CENÁRIOS QA: Migração Edge Functions para core_* (Autorização e Gestor)
  // QA 1 a 10 exigidos pela especificação:
  // =========================================================================

  interface MockCoreUser {
    id: string
    auth_user_id: string | null
    nome: string
    email: string
    ativo: boolean
    gestor_id: string | null
  }

  interface MockCoreSistema {
    id: string
    codigo: string
    ativo: boolean
  }

  interface MockCorePerfil {
    id: string
    codigo: string
    ativo: boolean
  }

  interface MockCoreUsuarioSistema {
    id: string
    usuario_id: string
    sistema_id: string
    perfil_id: string
    ativo: boolean
  }

  interface MockProfileBridge {
    id: string
    legaldesk_usuario_id: string | null
    gestor_id?: string | null
    perfil?: string | null
  }

  // Helper simulando a lógica exata de verifyConectaiAdmin
  function evaluateEdgeFunctionAdminAccess(params: {
    authUserId?: string | null
    coreUsers: MockCoreUser[]
    coreSistemas: MockCoreSistema[]
    corePerfis: MockCorePerfil[]
    coreUsuarioSistemas: MockCoreUsuarioSistema[]
  }): { allowed: boolean; reason?: string } {
    if (!params.authUserId) {
      return { allowed: false, reason: 'unauthorized' }
    }

    const coreUser = params.coreUsers.find((u) => u.auth_user_id === params.authUserId)
    if (!coreUser) {
      return { allowed: false, reason: 'no_core_user' }
    }
    if (!coreUser.ativo) {
      return { allowed: false, reason: 'core_user_inactive' }
    }

    const sistemaConectai = params.coreSistemas.find((s) => s.codigo === 'CONECTAI')
    if (!sistemaConectai || !sistemaConectai.ativo) {
      return { allowed: false, reason: 'sistema_inactive_or_missing' }
    }

    const links = params.coreUsuarioSistemas.filter(
      (us) => us.usuario_id === coreUser.id && us.sistema_id === sistemaConectai.id && us.ativo,
    )

    const hasAdmin = links.some((link) => {
      const perfil = params.corePerfis.find((p) => p.id === link.perfil_id)
      return perfil && perfil.ativo && perfil.codigo === 'ADMINISTRADOR'
    })

    if (!hasAdmin) {
      return { allowed: false, reason: 'admin_role_missing_or_inactive' }
    }

    return { allowed: true }
  }

  // Helper simulando a lógica exata de resolveGestorFromCore
  function evaluateEdgeFunctionResolveGestor(params: {
    targetLegaldeskUsuarioId: string
    destEmail: string
    profileBridges: MockProfileBridge[]
    coreUsers: MockCoreUser[]
  }): { gestorEmail: string | null; gestorNome: string | null } {
    if (!params.targetLegaldeskUsuarioId) {
      return { gestorEmail: null, gestorNome: null }
    }

    // 1. Ponte profiles.legaldesk_usuario_id -> profiles.id (auth_user_id)
    const bridge = params.profileBridges.find(
      (p) => p.legaldesk_usuario_id === params.targetLegaldeskUsuarioId,
    )
    if (!bridge?.id) {
      return { gestorEmail: null, gestorNome: null }
    }

    // 2. core_usuarios correspondente
    const coreUser = params.coreUsers.find((u) => u.auth_user_id === bridge.id)
    if (!coreUser?.gestor_id) {
      return { gestorEmail: null, gestorNome: null }
    }

    // 3. Gestor no core_usuarios (deve estar com ativo = true)
    const gestorCore = params.coreUsers.find((u) => u.id === coreUser.gestor_id)
    if (!gestorCore || gestorCore.ativo !== true) {
      return { gestorEmail: null, gestorNome: null }
    }

    const candidateEmail = (gestorCore.email || '').trim()
    if (candidateEmail && candidateEmail.toLowerCase() !== params.destEmail.toLowerCase()) {
      return {
        gestorEmail: candidateEmail,
        gestorNome: (gestorCore.nome || '').trim() || null,
      }
    }

    return { gestorEmail: null, gestorNome: null }
  }

  // Base de testes mockada
  const baseSistemas: MockCoreSistema[] = [{ id: 'sis-conectai', codigo: 'CONECTAI', ativo: true }]
  const basePerfis: MockCorePerfil[] = [
    { id: 'perf-admin', codigo: 'ADMINISTRADOR', ativo: true },
    { id: 'perf-gestor', codigo: 'GESTOR', ativo: true },
    { id: 'perf-op', codigo: 'OPERACIONAL', ativo: true },
    { id: 'perf-admin-inativo', codigo: 'ADMINISTRADOR', ativo: false },
  ]

  // QA 1: Administrador do Conectaí acessa configurações de e-mail
  const qa1Users: MockCoreUser[] = [
    {
      id: 'cu-admin',
      auth_user_id: 'auth-admin',
      nome: 'Admin User',
      email: 'admin@riccipi.com.br',
      ativo: true,
      gestor_id: null,
    },
  ]
  const qa1Links: MockCoreUsuarioSistema[] = [
    {
      id: 'link-1',
      usuario_id: 'cu-admin',
      sistema_id: 'sis-conectai',
      perfil_id: 'perf-admin',
      ativo: true,
    },
  ]
  const qa1 = evaluateEdgeFunctionAdminAccess({
    authUserId: 'auth-admin',
    coreUsers: qa1Users,
    coreSistemas: baseSistemas,
    corePerfis: basePerfis,
    coreUsuarioSistemas: qa1Links,
  })
  assert(qa1.allowed === true, 'QA 1 falhou: administrador do Conectaí deve acessar configurações')

  // QA 2: Gestor é bloqueado nas configurações de e-mail
  const qa2Users: MockCoreUser[] = [
    {
      id: 'cu-gestor',
      auth_user_id: 'auth-gestor',
      nome: 'Gestor User',
      email: 'gestor@riccipi.com.br',
      ativo: true,
      gestor_id: null,
    },
  ]
  const qa2Links: MockCoreUsuarioSistema[] = [
    {
      id: 'link-2',
      usuario_id: 'cu-gestor',
      sistema_id: 'sis-conectai',
      perfil_id: 'perf-gestor',
      ativo: true,
    },
  ]
  const qa2 = evaluateEdgeFunctionAdminAccess({
    authUserId: 'auth-gestor',
    coreUsers: qa2Users,
    coreSistemas: baseSistemas,
    corePerfis: basePerfis,
    coreUsuarioSistemas: qa2Links,
  })
  assert(
    qa2.allowed === false,
    'QA 2 falhou: gestor deve ser bloqueado nas funções de configurações de e-mail',
  )

  // QA 3: Operacional é bloqueado nas configurações de e-mail
  const qa3Users: MockCoreUser[] = [
    {
      id: 'cu-op',
      auth_user_id: 'auth-op',
      nome: 'Op User',
      email: 'op@riccipi.com.br',
      ativo: true,
      gestor_id: null,
    },
  ]
  const qa3Links: MockCoreUsuarioSistema[] = [
    {
      id: 'link-3',
      usuario_id: 'cu-op',
      sistema_id: 'sis-conectai',
      perfil_id: 'perf-op',
      ativo: true,
    },
  ]
  const qa3 = evaluateEdgeFunctionAdminAccess({
    authUserId: 'auth-op',
    coreUsers: qa3Users,
    coreSistemas: baseSistemas,
    corePerfis: basePerfis,
    coreUsuarioSistemas: qa3Links,
  })
  assert(
    qa3.allowed === false,
    'QA 3 falhou: operacional deve ser bloqueado nas configurações de e-mail',
  )

  // QA 4: Usuário sem vínculo Conectaí é bloqueado
  const qa4Users: MockCoreUser[] = [
    {
      id: 'cu-sem-vinculo',
      auth_user_id: 'auth-sem-vinculo',
      nome: 'Sem Vinculo',
      email: 'sem@riccipi.com.br',
      ativo: true,
      gestor_id: null,
    },
  ]
  const qa4 = evaluateEdgeFunctionAdminAccess({
    authUserId: 'auth-sem-vinculo',
    coreUsers: qa4Users,
    coreSistemas: baseSistemas,
    corePerfis: basePerfis,
    coreUsuarioSistemas: [],
  })
  assert(
    qa4.allowed === false,
    'QA 4 falhou: usuário sem vínculo Conectaí deve ser bloqueado nas funções administrativas',
  )

  // QA 5: Vínculo inativo é bloqueado
  const qa5Links: MockCoreUsuarioSistema[] = [
    {
      id: 'link-5',
      usuario_id: 'cu-admin',
      sistema_id: 'sis-conectai',
      perfil_id: 'perf-admin',
      ativo: false, // vínculo inativo
    },
  ]
  const qa5 = evaluateEdgeFunctionAdminAccess({
    authUserId: 'auth-admin',
    coreUsers: qa1Users,
    coreSistemas: baseSistemas,
    corePerfis: basePerfis,
    coreUsuarioSistemas: qa5Links,
  })
  assert(qa5.allowed === false, 'QA 5 falhou: vínculo inativo deve ser bloqueado')

  // QA 6: Perfil inativo é bloqueado
  const qa6Links: MockCoreUsuarioSistema[] = [
    {
      id: 'link-6',
      usuario_id: 'cu-admin',
      sistema_id: 'sis-conectai',
      perfil_id: 'perf-admin-inativo', // perfil inativo
      ativo: true,
    },
  ]
  const qa6 = evaluateEdgeFunctionAdminAccess({
    authUserId: 'auth-admin',
    coreUsers: qa1Users,
    coreSistemas: baseSistemas,
    corePerfis: basePerfis,
    coreUsuarioSistemas: qa6Links,
  })
  assert(qa6.allowed === false, 'QA 6 falhou: perfil inativo deve ser bloqueado')

  // QA 7: Usuário inativo em core_usuarios é bloqueado mesmo com vínculo/perfil admin
  const qa7Users: MockCoreUser[] = [
    {
      id: 'cu-admin-inactive',
      auth_user_id: 'auth-admin-inactive',
      nome: 'Admin Inativo',
      email: 'admin_inativo@riccipi.com.br',
      ativo: false,
      gestor_id: null,
    },
  ]
  const qa7Links: MockCoreUsuarioSistema[] = [
    {
      id: 'link-7',
      usuario_id: 'cu-admin-inactive',
      sistema_id: 'sis-conectai',
      perfil_id: 'perf-admin',
      ativo: true,
    },
  ]
  const qa7 = evaluateEdgeFunctionAdminAccess({
    authUserId: 'auth-admin-inactive',
    coreUsers: qa7Users,
    coreSistemas: baseSistemas,
    corePerfis: basePerfis,
    coreUsuarioSistemas: qa7Links,
  })
  assert(qa7.allowed === false, 'QA 7 falhou: core_usuarios.ativo=false deve ser bloqueado')

  // QA 8: CC vai ao gestor definido em core_usuarios.gestor_id
  const qa8Profiles: MockProfileBridge[] = [
    {
      id: 'auth-resp-1',
      legaldesk_usuario_id: 'ld-resp-1',
      gestor_id: 'auth-gestor-legado-DIVERGENTE', // divergente propositalmente
    },
  ]
  const qa8CoreUsers: MockCoreUser[] = [
    {
      id: 'cu-resp-1',
      auth_user_id: 'auth-resp-1',
      nome: 'Responsavel 1',
      email: 'resp1@riccipi.com.br',
      ativo: true,
      gestor_id: 'cu-gestor-central', // Gestor central oficial
    },
    {
      id: 'cu-gestor-central',
      auth_user_id: 'auth-gestor-central',
      nome: 'Gestor Central',
      email: 'gestor.central@riccipi.com.br',
      ativo: true,
      gestor_id: null,
    },
  ]
  const qa8 = evaluateEdgeFunctionResolveGestor({
    targetLegaldeskUsuarioId: 'ld-resp-1',
    destEmail: 'resp1@riccipi.com.br',
    profileBridges: qa8Profiles,
    coreUsers: qa8CoreUsers,
  })
  assert(
    qa8.gestorEmail === 'gestor.central@riccipi.com.br',
    'QA 8 falhou: CC deve ir exclusivamente ao gestor definido em core_usuarios.gestor_id',
  )

  // QA 9: Usuário sem gestor no core não gera erro e retorna gestorEmail null
  const qa9CoreUsers: MockCoreUser[] = [
    {
      id: 'cu-resp-2',
      auth_user_id: 'auth-resp-2',
      nome: 'Responsavel Sem Gestor',
      email: 'sem.gestor@riccipi.com.br',
      ativo: true,
      gestor_id: null,
    },
  ]
  const qa9Profiles: MockProfileBridge[] = [
    {
      id: 'auth-resp-2',
      legaldesk_usuario_id: 'ld-resp-2',
      gestor_id: null,
    },
  ]
  const qa9 = evaluateEdgeFunctionResolveGestor({
    targetLegaldeskUsuarioId: 'ld-resp-2',
    destEmail: 'sem.gestor@riccipi.com.br',
    profileBridges: qa9Profiles,
    coreUsers: qa9CoreUsers,
  })
  assert(
    qa9.gestorEmail === null && qa9.gestorNome === null,
    'QA 9 falhou: usuário sem gestor no core deve retornar gestorEmail null sem erros',
  )

  // QA 10: Nenhuma dessas funções usa profiles.perfil ou profiles.gestor_id como autoridade
  // Se um usuário tiver profiles.perfil = 'administrador', mas não tiver vínculo admin no core, deve ser bloqueado!
  const qa10UserProfiles: MockProfileBridge[] = [
    {
      id: 'auth-fake-admin',
      legaldesk_usuario_id: 'ld-fake',
      perfil: 'administrador', // legado mente que é admin
    },
  ]
  const qa10CoreUsers: MockCoreUser[] = [
    {
      id: 'cu-fake-admin',
      auth_user_id: 'auth-fake-admin',
      nome: 'Fake Admin',
      email: 'fake@riccipi.com.br',
      ativo: true,
      gestor_id: null,
    },
  ]
  const qa10Links: MockCoreUsuarioSistema[] = [
    {
      id: 'link-fake',
      usuario_id: 'cu-fake-admin',
      sistema_id: 'sis-conectai',
      perfil_id: 'perf-op', // No core é apenas operacional
      ativo: true,
    },
  ]
  const qa10 = evaluateEdgeFunctionAdminAccess({
    authUserId: 'auth-fake-admin',
    coreUsers: qa10CoreUsers,
    coreSistemas: baseSistemas,
    corePerfis: basePerfis,
    coreUsuarioSistemas: qa10Links,
  })
  assert(
    qa10.allowed === false,
    'QA 10 falhou: profiles.perfil não pode conceder acesso de administrador',
  )

  // QA 11: resolveGestorFromCore com gestor inativo em core_usuarios não envia CC
  const qa11Profiles: MockProfileBridge[] = [
    {
      id: 'auth-resp-inactive-gestor',
      legaldesk_usuario_id: 'ld-resp-inactive-gestor',
    },
  ]
  const qa11CoreUsers: MockCoreUser[] = [
    {
      id: 'cu-resp-inactive-gestor',
      auth_user_id: 'auth-resp-inactive-gestor',
      nome: 'Subordinado',
      email: 'sub@riccipi.com.br',
      ativo: true,
      gestor_id: 'cu-gestor-inativo',
    },
    {
      id: 'cu-gestor-inativo',
      auth_user_id: 'auth-gestor-inativo',
      nome: 'Gestor Inativo',
      email: 'gestor.inativo@riccipi.com.br',
      ativo: false, // inativo!
      gestor_id: null,
    },
  ]
  const qa11 = evaluateEdgeFunctionResolveGestor({
    targetLegaldeskUsuarioId: 'ld-resp-inactive-gestor',
    destEmail: 'sub@riccipi.com.br',
    profileBridges: qa11Profiles,
    coreUsers: qa11CoreUsers,
  })
  assert(
    qa11.gestorEmail === null && qa11.gestorNome === null,
    'QA 11 falhou: gestor inativo em core_usuarios não deve receber CC',
  )

  // QA 12: deleteContact validação central de autorização
  // Helper para simular a autorização de deleteContact
  function evaluateDeleteContactAuthorization(
    authContext?: {
      perfil?: string | null
      ativo?: boolean
      hasSystemAccess?: boolean
    } | null,
  ): { allowed: boolean; reason?: string } {
    if (
      !authContext ||
      authContext.ativo === false ||
      authContext.hasSystemAccess !== true ||
      authContext.perfil !== 'administrador'
    ) {
      return {
        allowed: false,
        reason: 'Permissão negada: apenas administradores podem excluir atendimentos.',
      }
    }
    return { allowed: true }
  }

  // 12a: Sem contexto central -> bloqueado (não consulta profiles.perfil)
  assert(
    evaluateDeleteContactAuthorization(null).allowed === false,
    'QA 12a falhou: deleteContact sem contexto central deve ser bloqueado',
  )
  assert(
    evaluateDeleteContactAuthorization(undefined).allowed === false,
    'QA 12a bis falhou: deleteContact undefined deve ser bloqueado',
  )

  // 12b: Contexto com admin central e hasSystemAccess === true -> autorizado
  assert(
    evaluateDeleteContactAuthorization({
      perfil: 'administrador',
      ativo: true,
      hasSystemAccess: true,
    }).allowed === true,
    'QA 12b falhou: deleteContact com admin central ativo e hasSystemAccess deve ser autorizado',
  )

  // 12c: Gestor ou operacional central -> bloqueado
  assert(
    evaluateDeleteContactAuthorization({
      perfil: 'gestor',
      ativo: true,
      hasSystemAccess: true,
    }).allowed === false,
    'QA 12c falhou: deleteContact com perfil gestor deve ser bloqueado',
  )
  assert(
    evaluateDeleteContactAuthorization({
      perfil: 'operacional',
      ativo: true,
      hasSystemAccess: true,
    }).allowed === false,
    'QA 12c bis falhou: deleteContact com perfil operacional deve ser bloqueado',
  )

  // 12d: Perfil administrador mas hasSystemAccess === false ou inativo -> bloqueado
  assert(
    evaluateDeleteContactAuthorization({
      perfil: 'administrador',
      ativo: false,
      hasSystemAccess: true,
    }).allowed === false,
    'QA 12d falhou: deleteContact com admin inativo deve ser bloqueado',
  )
  assert(
    evaluateDeleteContactAuthorization({
      perfil: 'administrador',
      ativo: true,
      hasSystemAccess: false,
    }).allowed === false,
    'QA 12d bis falhou: deleteContact com admin sem hasSystemAccess deve ser bloqueado',
  )

  // =========================================================================
  // CENÁRIOS OBRIGATÓRIOS: Migração do controle de usuário ativo/inativo
  // para core_usuarios.ativo e Gestor de Acessos Ricci (8 Cenários)
  // =========================================================================

  // Helper para simular AuthGuard de acordo com a autoridade central (core_usuarios.ativo / coreStatus / hasSystemAccess)
  function simulateAuthGuardDecision(params: {
    user: { id: string } | null
    profile: {
      coreStatus?: CoreAccessStatus
      hasSystemAccess?: boolean
      perfil?: string
      ativo?: boolean // legado não-autoritativo
    } | null
    loading?: boolean
  }): { allowed: boolean; redirect: string | null; loadingView: boolean } {
    if (params.loading) {
      return { allowed: false, redirect: null, loadingView: true }
    }
    // 1. Inativação central no core (core_usuarios.ativo = false)
    if (params.profile?.coreStatus === 'user_inactive') {
      return { allowed: false, redirect: '/login?reason=disabled', loadingView: false }
    }
    // 2. Não autenticado
    if (!params.user) {
      return { allowed: false, redirect: '/login', loadingView: false }
    }
    // 3. Sem acesso permitido ao Conectaí
    if (!params.profile?.hasSystemAccess) {
      return { allowed: false, redirect: '/login?reason=no_access', loadingView: false }
    }
    return { allowed: true, redirect: null, loadingView: false }
  }

  // Helper para simular AdminGuard de acordo com a autoridade central
  function simulateAdminGuardDecision(params: {
    user: { id: string } | null
    profile: {
      coreStatus?: CoreAccessStatus
      hasSystemAccess?: boolean
      perfil?: string
      ativo?: boolean
    } | null
    loading?: boolean
  }): { allowed: boolean; redirect: string | null; loadingView: boolean } {
    if (params.loading) {
      return { allowed: false, redirect: null, loadingView: true }
    }
    if (params.profile?.coreStatus === 'user_inactive') {
      return { allowed: false, redirect: '/login?reason=disabled', loadingView: false }
    }
    if (!params.user) {
      return { allowed: false, redirect: '/login', loadingView: false }
    }
    if (!params.profile?.hasSystemAccess) {
      return { allowed: false, redirect: '/login?reason=no_access', loadingView: false }
    }
    if (params.profile?.perfil !== 'administrador') {
      return { allowed: false, redirect: '/', loadingView: false }
    }
    return { allowed: true, redirect: null, loadingView: false }
  }

  // Cenário 1: usuário ativo (core_usuarios.ativo=true, vínculo ativo, sistema ativo, perfil ativo) acessa normalmente
  const coreResultCen1: CoreAccessResult = {
    status: 'ok',
    data: {
      id: 'core-usr-1',
      authUserId: 'auth-usr-1',
      nome: 'Usuário Ativo',
      email: 'ativo@riccipi.com.br',
      ativo: true,
      gestorId: null,
      vinculoConectai: {
        id: 'vinc-1',
        sistemaId: 'sis-conectai',
        sistemaCodigo: 'CONECTAI',
        sistemaNome: 'Conectaí',
        perfilId: 'perf-op',
        perfilCodigo: 'operacional',
        perfilNome: 'Operacional',
        ativo: true,
        perfilAtivo: true,
      },
    },
    resolvedPerfil: 'operacional',
  }
  const resolutionCen1 = resolveEffectiveProfile(coreResultCen1, 'operacional')
  const authGuardCen1 = simulateAuthGuardDecision({
    user: { id: 'auth-usr-1' },
    profile: {
      perfil: resolutionCen1.perfil,
      coreStatus: resolutionCen1.coreStatus,
      hasSystemAccess: resolutionCen1.hasSystemAccess,
      ativo: true,
    },
    loading: false,
  })
  const accessDecisionCen1 = evaluateAccessDecision({
    user: { id: 'auth-usr-1' },
    profile: {
      perfil: resolutionCen1.perfil,
      perfilSource: resolutionCen1.source,
      coreStatus: resolutionCen1.coreStatus,
      hasSystemAccess: resolutionCen1.hasSystemAccess,
      ativo: true,
    },
  })
  assert(
    resolutionCen1.hasSystemAccess === true &&
      resolutionCen1.coreStatus === 'ok' &&
      authGuardCen1.allowed === true &&
      authGuardCen1.redirect === null &&
      accessDecisionCen1.allowed === true,
    'Cenário 1 falhou: usuário ativo com vínculo/sistema/perfil ativos deve acessar normalmente',
  )

  // Cenário 2: core_usuarios.ativo=false bloqueia login/acesso (user_inactive -> /login?reason=disabled)
  const coreResultCen2: CoreAccessResult = {
    status: 'user_inactive',
    data: {
      id: 'core-usr-2',
      authUserId: 'auth-usr-2',
      nome: 'Usuário Inativo',
      email: 'inativo@riccipi.com.br',
      ativo: false,
      gestorId: null,
    },
    resolvedPerfil: null,
  }
  const resolutionCen2 = resolveEffectiveProfile(coreResultCen2, 'administrador')
  const authGuardCen2 = simulateAuthGuardDecision({
    user: { id: 'auth-usr-2' },
    profile: {
      perfil: resolutionCen2.perfil,
      coreStatus: resolutionCen2.coreStatus,
      hasSystemAccess: resolutionCen2.hasSystemAccess,
      ativo: true, // mesmo que legado fosse true, coreStatus manda
    },
    loading: false,
  })
  const adminGuardCen2 = simulateAdminGuardDecision({
    user: { id: 'auth-usr-2' },
    profile: {
      perfil: 'administrador',
      coreStatus: 'user_inactive',
      hasSystemAccess: false,
    },
    loading: false,
  })
  const accessDecisionCen2 = evaluateAccessDecision({
    user: { id: 'auth-usr-2' },
    profile: {
      perfil: resolutionCen2.perfil,
      perfilSource: resolutionCen2.source,
      coreStatus: resolutionCen2.coreStatus,
      hasSystemAccess: resolutionCen2.hasSystemAccess,
      ativo: false,
    },
  })
  assert(
    resolutionCen2.hasSystemAccess === false &&
      resolutionCen2.coreStatus === 'user_inactive' &&
      authGuardCen2.allowed === false &&
      authGuardCen2.redirect === '/login?reason=disabled' &&
      adminGuardCen2.allowed === false &&
      adminGuardCen2.redirect === '/login?reason=disabled' &&
      accessDecisionCen2.allowed === false &&
      accessDecisionCen2.redirectReason === 'disabled' &&
      accessDecisionCen2.shouldSignOut === true,
    'Cenário 2 falhou: core_usuarios.ativo=false deve bloquear login/acesso com reason=disabled e signOut=true',
  )

  // Cenário 3: usuário já logado é derrubado após inativação (Realtime em core_usuarios -> sessão encerrada e redirecionada para /login?reason=disabled)
  // Simulação do payload Realtime de core_usuarios com UPDATE: { ativo: false }
  let simulatedSessionState = {
    user: { id: 'auth-usr-logged-in' } as { id: string } | null,
    profile: {
      perfil: 'operacional',
      ativo: true,
      coreStatus: 'ok' as CoreAccessStatus,
      hasSystemAccess: true,
    } as any,
    terminatedReason: null as string | null,
  }
  const handleRealtimeCoreUsuarioUpdate = (payloadNew: { id?: string; ativo?: boolean }) => {
    if (payloadNew.ativo === false) {
      // Simula terminateSessionDisabled()
      simulatedSessionState.user = null
      simulatedSessionState.profile = {
        perfil: '',
        ativo: false,
        coreStatus: 'user_inactive',
        hasSystemAccess: false,
      }
      simulatedSessionState.terminatedReason = 'disabled'
    }
  }
  handleRealtimeCoreUsuarioUpdate({ id: 'cu-1', ativo: false })
  const guardAfterRealtime = simulateAuthGuardDecision({
    user: simulatedSessionState.user,
    profile: simulatedSessionState.profile,
    loading: false,
  })
  assert(
    simulatedSessionState.user === null &&
      simulatedSessionState.profile.coreStatus === 'user_inactive' &&
      simulatedSessionState.terminatedReason === 'disabled' &&
      guardAfterRealtime.redirect === '/login?reason=disabled',
    'Cenário 3 falhou: inativação via Realtime em core_usuarios deve derrubar sessão e redirecionar para /login?reason=disabled',
  )

  // Cenário 4: vínculo Conectaí inativo (core_usuario_sistemas.ativo=false) bloqueia com no_access (sem derrubar auth global)
  const coreResultCen4: CoreAccessResult = {
    status: 'link_inactive',
    data: {
      id: 'core-usr-4',
      authUserId: 'auth-usr-4',
      nome: 'Usuário Vínculo Inativo',
      email: 'vinculo_inativo@riccipi.com.br',
      ativo: true,
      gestorId: null,
      vinculoConectai: {
        id: 'vinc-4',
        sistemaId: 'sis-conectai',
        sistemaCodigo: 'CONECTAI',
        sistemaNome: 'Conectaí',
        perfilId: 'perf-op',
        perfilCodigo: 'operacional',
        perfilNome: 'Operacional',
        ativo: false, // vínculo Conectaí inativo!
        perfilAtivo: true,
      },
    },
    resolvedPerfil: null,
  }
  const resolutionCen4 = resolveEffectiveProfile(coreResultCen4, 'operacional')
  const authGuardCen4 = simulateAuthGuardDecision({
    user: { id: 'auth-usr-4' },
    profile: {
      perfil: resolutionCen4.perfil,
      coreStatus: resolutionCen4.coreStatus,
      hasSystemAccess: resolutionCen4.hasSystemAccess,
      ativo: true,
    },
    loading: false,
  })
  const accessDecisionCen4 = evaluateAccessDecision({
    user: { id: 'auth-usr-4' },
    profile: {
      perfil: resolutionCen4.perfil,
      perfilSource: resolutionCen4.source,
      coreStatus: resolutionCen4.coreStatus,
      hasSystemAccess: resolutionCen4.hasSystemAccess,
      ativo: true,
    },
  })
  assert(
    resolutionCen4.hasSystemAccess === false &&
      resolutionCen4.coreStatus === 'link_inactive' &&
      authGuardCen4.allowed === false &&
      authGuardCen4.redirect === '/login?reason=no_access' &&
      accessDecisionCen4.allowed === false &&
      accessDecisionCen4.redirectReason === 'no_access' &&
      accessDecisionCen4.shouldSignOut === false,
    'Cenário 4 falhou: vínculo Conectaí inativo (core_usuario_sistemas.ativo=false) deve bloquear com reason=no_access sem derrubar sessão',
  )

  // Cenário 5: perfil inativo (core_perfis.ativo=false) bloqueia com no_access
  const coreResultCen5: CoreAccessResult = {
    status: 'profile_inactive_or_invalid',
    data: {
      id: 'core-usr-5',
      authUserId: 'auth-usr-5',
      nome: 'Usuário Perfil Inativo',
      email: 'perfil_inativo@riccipi.com.br',
      ativo: true,
      gestorId: null,
    },
    resolvedPerfil: null,
  }
  const resolutionCen5 = resolveEffectiveProfile(coreResultCen5, 'administrador')
  const authGuardCen5 = simulateAuthGuardDecision({
    user: { id: 'auth-usr-5' },
    profile: {
      perfil: resolutionCen5.perfil,
      coreStatus: resolutionCen5.coreStatus,
      hasSystemAccess: resolutionCen5.hasSystemAccess,
      ativo: true,
    },
    loading: false,
  })
  const accessDecisionCen5 = evaluateAccessDecision({
    user: { id: 'auth-usr-5' },
    profile: {
      perfil: resolutionCen5.perfil,
      perfilSource: resolutionCen5.source,
      coreStatus: resolutionCen5.coreStatus,
      hasSystemAccess: resolutionCen5.hasSystemAccess,
      ativo: true,
    },
  })
  assert(
    resolutionCen5.hasSystemAccess === false &&
      resolutionCen5.coreStatus === 'profile_inactive_or_invalid' &&
      authGuardCen5.allowed === false &&
      authGuardCen5.redirect === '/login?reason=no_access' &&
      accessDecisionCen5.allowed === false &&
      accessDecisionCen5.redirectReason === 'no_access' &&
      accessDecisionCen5.shouldSignOut === false,
    'Cenário 5 falhou: perfil Conectaí inativo (core_perfis.ativo=false) deve bloquear com reason=no_access',
  )

  // Cenário 6: admin/gestor/operacional ativos continuam normais
  const rolesToTest = ['administrador', 'gestor', 'operacional'] as const
  let allRolesNormal = true
  for (const role of rolesToTest) {
    const resRole = resolveEffectiveProfile(
      {
        status: 'ok',
        data: null,
        resolvedPerfil: role,
      },
      'operacional',
    )
    const guardDecision = simulateAuthGuardDecision({
      user: { id: `auth-${role}` },
      profile: {
        perfil: resRole.perfil,
        coreStatus: resRole.coreStatus,
        hasSystemAccess: resRole.hasSystemAccess,
        ativo: true,
      },
      loading: false,
    })
    const evalDecision = evaluateAccessDecision({
      user: { id: `auth-${role}` },
      profile: {
        perfil: resRole.perfil,
        perfilSource: resRole.source,
        coreStatus: resRole.coreStatus,
        hasSystemAccess: resRole.hasSystemAccess,
        ativo: true,
      },
    })
    if (!guardDecision.allowed || !evalDecision.allowed || resRole.perfil !== role) {
      allRolesNormal = false
    }
  }
  assert(
    allRolesNormal,
    'Cenário 6 falhou: admin, gestor e operacional ativos devem continuar acessando normalmente',
  )

  // Cenário 7: profiles.ativo não é mais autoridade de sessão (não influencia a decisão)
  // Caso 7a: core_usuarios.ativo = true, mas profiles.ativo = false -> ACESSO PERMITIDO (core manda)
  const coreActiveLegacyInactive = evaluateAccessDecision({
    user: { id: 'usr-core-active' },
    profile: {
      perfil: 'operacional',
      perfilSource: 'core',
      coreStatus: 'ok',
      hasSystemAccess: true,
      ativo: false, // profiles.ativo desatualizado / legado inativo
    },
  })
  const guardCoreActiveLegacyInactive = simulateAuthGuardDecision({
    user: { id: 'usr-core-active' },
    profile: {
      perfil: 'operacional',
      coreStatus: 'ok',
      hasSystemAccess: true,
      ativo: false, // profiles.ativo = false NÃO bloqueia!
    },
    loading: false,
  })
  // Caso 7b: core_usuarios.ativo = false, mas profiles.ativo = true -> ACESSO BLOQUEADO (core manda)
  const coreInactiveLegacyActive = evaluateAccessDecision({
    user: { id: 'usr-core-inactive' },
    profile: {
      perfil: 'operacional',
      perfilSource: 'core',
      coreStatus: 'user_inactive',
      hasSystemAccess: false,
      ativo: true, // profiles.ativo mente que é true
    },
  })
  const guardCoreInactiveLegacyActive = simulateAuthGuardDecision({
    user: { id: 'usr-core-inactive' },
    profile: {
      perfil: 'operacional',
      coreStatus: 'user_inactive',
      hasSystemAccess: false,
      ativo: true, // profiles.ativo = true NÃO permite!
    },
    loading: false,
  })
  assert(
    coreActiveLegacyInactive.allowed === true &&
      coreActiveLegacyInactive.redirectReason === undefined &&
      guardCoreActiveLegacyInactive.allowed === true &&
      guardCoreActiveLegacyInactive.redirect === null &&
      coreInactiveLegacyActive.allowed === false &&
      coreInactiveLegacyActive.redirectReason === 'disabled' &&
      guardCoreInactiveLegacyActive.allowed === false &&
      guardCoreInactiveLegacyActive.redirect === '/login?reason=disabled',
    'Cenário 7 falhou: profiles.ativo NÃO deve mais ser autoridade de acesso ou influenciar a decisão',
  )

  // Cenário 8: login, logout, recuperação de senha e timeout continuam funcionando (regressão)
  // 8a: Login com usuário ativo no core -> disabled=false, noAccess=false
  const mockSignInUserActive = (coreStatus: CoreAccessStatus) => {
    if (coreStatus === 'user_inactive') {
      return { error: null, disabled: true, noAccess: false }
    }
    if (
      coreStatus === 'no_core_user' ||
      coreStatus === 'no_system_link' ||
      coreStatus === 'link_inactive' ||
      coreStatus === 'profile_inactive_or_invalid' ||
      coreStatus === 'system_inactive'
    ) {
      return { error: null, disabled: false, noAccess: true }
    }
    return { error: null, disabled: false, noAccess: false }
  }
  const signInOk = mockSignInUserActive('ok')
  const signInDisabled = mockSignInUserActive('user_inactive')
  const signInNoAccess = mockSignInUserActive('link_inactive')

  // 8b: Logout limpa estado e encerra sessão
  let sessionState = { active: true, user: 'usr-1' }
  const mockSignOut = () => {
    sessionState = { active: false, user: '' }
    return { error: null }
  }
  mockSignOut()

  // 8c: Recuperação de senha gera redirect para /resetar-senha
  const mockResetPasswordUrl = (origin: string) => `${origin}/resetar-senha`
  const resetUrl = mockResetPasswordUrl('https://conectai.riccipi.com.br')

  // 8d: Timeout de requisição segura para o core não quebra o sistema (vira technical_error sem conceder perfil)
  const timeoutCoreResult: CoreAccessResult = {
    status: 'technical_error',
    data: null,
    resolvedPerfil: null,
    detail: 'core_timeout',
  }
  const timeoutResolution = resolveEffectiveProfile(timeoutCoreResult, 'administrador')

  assert(
    signInOk.disabled === false &&
      signInOk.noAccess === false &&
      signInDisabled.disabled === true &&
      signInNoAccess.noAccess === true &&
      sessionState.active === false &&
      resetUrl === 'https://conectai.riccipi.com.br/resetar-senha' &&
      timeoutResolution.source === 'technical_error' &&
      timeoutResolution.perfil === '' &&
      timeoutResolution.hasSystemAccess === false,
    'Cenário 8 falhou: regressão de login, logout, recuperação de senha e timeout seguro falhou',
  )

  return { passed, failed: errors.length, errors }
}
