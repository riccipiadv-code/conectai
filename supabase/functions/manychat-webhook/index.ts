import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { normalizeManyChatPayload } from '../_shared/manychat.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Secrets missing' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let rawPayload;
  try {
    rawPayload = await req.json();
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const payloads = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
  const results = [];
  let hasCriticalErrors = false;

  for (const payload of payloads) {
    const { subscriber_id, event_type, sub, extracted } = normalizeManyChatPayload(payload);
    
    let status = 'pending';
    let errorMessage = null;

    if (!subscriber_id) {
       status = 'error';
       errorMessage = 'Payload inválido: não foi possível extrair o identificador do contato (id). A estrutura recebida não contém os dados mínimos obrigatórios.';
       hasCriticalErrors = true;
    }

    const { error } = await supabase.from('integration_logs').insert({
      event_type: event_type,
      payload: payload,
      status: status,
      error_message: errorMessage,
      subscriber_id: subscriber_id,
      detected_event_type: event_type,
      received_at: new Date().toISOString(),
      processing_context: {
        extracted_keys: sub && typeof sub === 'object' ? Object.keys(sub) : [],
        extracted_data: extracted,
        has_id: !!subscriber_id
      }
    });

    results.push({
      success: !error && status !== 'error',
      error: errorMessage || error?.message,
      queued: status === 'pending'
    });
  }

  if (hasCriticalErrors) {
    return new Response(JSON.stringify({ success: false, error: 'Validação falhou: Missing subscriber_id. Verifique o payload enviado pelo ManyChat.', results }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const dbErrors = results.some(r => r.error && !hasCriticalErrors);
  if (dbErrors) {
    return new Response(JSON.stringify({ success: false, results }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ success: true, queued: true, count: payloads.length }), { headers: { 'Content-Type': 'application/json' } });
});
