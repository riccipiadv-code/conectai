/**
 * Utilitário de segurança para tratamento e sanitização de mensagens de erro no frontend.
 * Evita vazamento de stack traces, queries SQL, nomes de tabelas/policies internas,
 * tokens, secrets e detalhes de infraestrutura para o usuário final.
 * Registra o detalhe técnico completo apenas no console.error.
 */

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /bearer/i,
  /authorization/i,
  /service_role/i,
  /supabase_anon_key/i,
  /postgres/i,
  /pg_/i,
  /relation ".*" does not exist/i,
  /column ".*" does not exist/i,
  /syntax error at or near/i,
  /violates foreign key constraint/i,
  /violates unique constraint/i,
  /violates row-level security/i,
  /rls/i,
  /jwt/i,
  /at Function\./i,
  /at async/i,
  /stack/i,
]

/**
 * Mensagens amigáveis para erros comuns conhecidos
 */
const KNOWN_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'E-mail ainda não confirmado. Verifique sua caixa de entrada.',
  'User not found': 'Usuário não encontrado.',
  'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
  'Password should be at least 8 characters': 'A senha deve ter no mínimo 8 caracteres.',
  'Auth session missing!': 'Sessão expirada. Por favor, faça login novamente.',
  'JWT expired': 'Sua sessão expirou. Por favor, faça login novamente.',
}

/**
 * Retorna uma mensagem de erro segura para exibição na UI (toasts, alertas).
 * O erro técnico completo é registrado apenas no console do desenvolvedor.
 *
 * @param error Objeto de erro capturado (Error, PostgrestError, AuthError, string, etc.)
 * @param fallback Mensagem amigável padrão caso o erro não possa ser exposto com segurança
 */
export function getSafeErrorMessage(
  error: unknown,
  fallback = 'Ocorreu um erro inesperado. Tente novamente.',
): string {
  if (!error) return fallback

  let rawMessage = ''
  if (typeof error === 'string') {
    rawMessage = error
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>
    rawMessage = errObj.message || errObj.error || errObj.error_description || ''

    // Se o erro tiver context json (ex: Edge Function response)
    if (!rawMessage && errObj.context) {
      if (typeof errObj.context === 'string') {
        rawMessage = errObj.context
      } else if (errObj.context.message) {
        rawMessage = errObj.context.message
      }
    }
  }

  // Se não houver mensagem, retornar fallback
  if (!rawMessage || typeof rawMessage !== 'string') {
    console.error('[Segurança] Detalhe interno do erro:', error)
    return fallback
  }

  const trimmed = rawMessage.trim()

  // Se for mensagem mapeada amigável
  if (KNOWN_ERROR_MAP[trimmed]) {
    return KNOWN_ERROR_MAP[trimmed]
  }

  // Verificar se contém termos técnicos ou sensíveis
  const hasSensitiveContent = SENSITIVE_PATTERNS.some((pattern) => pattern.test(trimmed))

  if (hasSensitiveContent) {
    console.error('[Segurança] Detalhe técnico omitido da interface:', error)
    return fallback
  }

  // Se a mensagem for excessivamente longa (provavelmente um payload ou dump de exceção)
  if (trimmed.length > 200) {
    console.error('[Segurança] Erro técnico extenso omitido:', error)
    return fallback
  }

  return trimmed
}
