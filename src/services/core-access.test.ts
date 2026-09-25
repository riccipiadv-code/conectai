import {
  normalizeCoreRole,
  resolveEffectiveProfile,
  CoreAccessResult,
  EffectiveProfileSource,
} from './core-access'

/**
 * Validação dos 15 cenários de teste da Etapa 4:
 * 1. administrador com core válido
 * 2. gestor com core válido
 * 3. operacional com core válido
 * 4. core temporariamente indisponível (falha técnica) -> fallback para profiles
 * 5. usuário sem vínculo válido com Conectaí no core (no_system_link) -> sem perfil (menor privilégio)
 * 6. usuário inexistente em core_usuarios (no_core_user) -> sem perfil (menor privilégio)
 * 7. vínculo inativo no core (link_inactive) -> sem perfil (menor privilégio)
 * 8. perfil central inativo (profile_inactive_or_invalid) -> sem perfil (menor privilégio)
 * 9. perfil central com código inválido/desconhecido -> sem perfil (menor privilégio)
 * 10. menor privilégio: core negado NÃO eleva a administrador nem quando legacy era admin
 * 11. divergência: core diz operacional, profiles diz administrador -> core prevalece (operacional)
 * 12. divergência: core diz gestor, profiles diz operacional -> core prevalece (gestor)
 * 13. normalização: maiúsculas, minúsculas e espaços em branco ('ADMINISTRADOR', '  gestor  ')
 * 14. resultado null de coreResult trata como technical_error -> fallback legado seguro
 * 15. ausência de perfil no core NUNCA vira administrador
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

  // Teste 1: administrador com core válido
  const r1 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'administrador',
    },
    'operacional',
  )
  assert(
    r1.perfil === 'administrador' && r1.source === 'core' && r1.coreStatus === 'ok',
    `Cenário 1 falhou: esperado administrador/core/ok, obtido ${JSON.stringify(r1)}`,
  )

  // Teste 2: gestor com core válido
  const r2 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'gestor',
    },
    'operacional',
  )
  assert(
    r2.perfil === 'gestor' && r2.source === 'core' && r2.coreStatus === 'ok',
    `Cenário 2 falhou: esperado gestor/core/ok, obtido ${JSON.stringify(r2)}`,
  )

  // Teste 3: operacional com core válido
  const r3 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'operacional',
    },
    'administrador',
  )
  assert(
    r3.perfil === 'operacional' && r3.source === 'core' && r3.coreStatus === 'ok',
    `Cenário 3 falhou: esperado operacional/core/ok, obtido ${JSON.stringify(r3)}`,
  )

  // Teste 4: core temporariamente indisponível -> fallback para profiles
  const r4 = resolveEffectiveProfile(
    {
      status: 'technical_error',
      data: null,
      resolvedPerfil: null,
      detail: 'Network timeout',
    },
    'administrador',
  )
  assert(
    r4.perfil === 'administrador' &&
      r4.source === 'legacy_fallback' &&
      r4.coreStatus === 'technical_error',
    `Cenário 4 falhou: esperado fallback para administrador, obtido ${JSON.stringify(r4)}`,
  )

  // Teste 5: usuário sem vínculo com Conectaí no core -> sem perfil (menor privilégio)
  const r5 = resolveEffectiveProfile(
    {
      status: 'no_system_link',
      data: null,
      resolvedPerfil: null,
      detail: 'Sem vínculo em core_usuario_sistemas',
    },
    'administrador',
  )
  assert(
    r5.perfil === '' && r5.source === 'core_denied' && r5.coreStatus === 'no_system_link',
    `Cenário 5 falhou: esperado bloqueio/core_denied, obtido ${JSON.stringify(r5)}`,
  )

  // Teste 6: usuário inexistente em core_usuarios -> sem perfil (menor privilégio)
  const r6 = resolveEffectiveProfile(
    {
      status: 'no_core_user',
      data: null,
      resolvedPerfil: null,
    },
    'gestor',
  )
  assert(
    r6.perfil === '' && r6.source === 'core_denied' && r6.coreStatus === 'no_core_user',
    `Cenário 6 falhou: esperado bloqueio/no_core_user, obtido ${JSON.stringify(r6)}`,
  )

  // Teste 7: vínculo inativo -> sem perfil (menor privilégio)
  const r7 = resolveEffectiveProfile(
    {
      status: 'link_inactive',
      data: null,
      resolvedPerfil: null,
    },
    'administrador',
  )
  assert(
    r7.perfil === '' && r7.source === 'core_denied' && r7.coreStatus === 'link_inactive',
    `Cenário 7 falhou: esperado link_inactive bloqueado, obtido ${JSON.stringify(r7)}`,
  )

  // Teste 8: perfil central inativo -> sem perfil (menor privilégio)
  const r8 = resolveEffectiveProfile(
    {
      status: 'profile_inactive_or_invalid',
      data: null,
      resolvedPerfil: null,
    },
    'administrador',
  )
  assert(
    r8.perfil === '' &&
      r8.source === 'core_denied' &&
      r8.coreStatus === 'profile_inactive_or_invalid',
    `Cenário 8 falhou: esperado profile_inactive bloqueado, obtido ${JSON.stringify(r8)}`,
  )

  // Teste 9: perfil com código desconhecido/inválido
  const normInvalid = normalizeCoreRole('SUPER_ADMIN_CUSTOM')
  assert(
    normInvalid === null,
    `Cenário 9 falhou: normalização de desconhecido deve ser null, deu ${normInvalid}`,
  )

  // Teste 10: menor privilégio: ausência de perfil NÃO pode virar administrador
  const r10 = resolveEffectiveProfile(
    {
      status: 'no_system_link',
      data: null,
      resolvedPerfil: null,
    },
    'administrador',
  )
  assert(
    r10.perfil !== 'administrador' && r10.perfil === '',
    `Cenário 10 falhou: menor privilégio violado, obtido ${JSON.stringify(r10)}`,
  )

  // Teste 11: divergência core diz operacional vs legacy administrador -> core prevalece
  const r11 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'operacional',
    },
    'administrador',
  )
  assert(
    r11.perfil === 'operacional' && r11.source === 'core',
    `Cenário 11 falhou: core deve prevalecer sobre legado, obtido ${JSON.stringify(r11)}`,
  )

  // Teste 12: divergência core diz gestor vs legacy operacional -> core prevalece
  const r12 = resolveEffectiveProfile(
    {
      status: 'ok',
      data: null,
      resolvedPerfil: 'gestor',
    },
    'operacional',
  )
  assert(
    r12.perfil === 'gestor' && r12.source === 'core',
    `Cenário 12 falhou: core deve prevalecer sobre legado, obtido ${JSON.stringify(r12)}`,
  )

  // Teste 13: normalização com espaços e maiúsculas
  assert(normalizeCoreRole('ADMINISTRADOR') === 'administrador', 'Cenário 13a falhou')
  assert(normalizeCoreRole('  GESTOR  ') === 'gestor', 'Cenário 13b falhou')
  assert(normalizeCoreRole('operacional') === 'operacional', 'Cenário 13c falhou')
  assert(normalizeCoreRole(null) === null, 'Cenário 13d falhou')

  // Teste 14: coreResult null trata como technical_error -> fallback legado seguro
  const r14 = resolveEffectiveProfile(null, 'operacional')
  assert(
    r14.perfil === 'operacional' &&
      r14.source === 'legacy_fallback' &&
      r14.coreStatus === 'technical_error',
    `Cenário 14 falhou: esperado fallback técnico, obtido ${JSON.stringify(r14)}`,
  )

  // Teste 15: menor privilégio estrito: perfil desconhecido no fallback também não vira admin
  const r15 = resolveEffectiveProfile(null, '')
  assert(
    r15.perfil === '',
    `Cenário 15 falhou: perfil vazio não pode virar admin, obtido ${JSON.stringify(r15)}`,
  )

  return { passed, failed: errors.length, errors }
}
