import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { normalizeManyChatPayload } from '../_shared/manychat.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Secrets missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  let rawPayload
  try {
    rawPayload = await req.json()
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const payloads = Array.isArray(rawPayload) ? rawPayload : [rawPayload]
  const results = []

  for (const payload of payloads) {
    const { subscriber_id, event_type, sub, extracted } = normalizeManyChatPayload(payload)

    let status = 'processed'
    let errorMessage = null

    if (!subscriber_id) {
      status = 'error'
      errorMessage = 'Missing subscriber_id'
    } else {
      const record = {
        manychat_id: String(subscriber_id),
        nome: extracted.nome,
        first_name: extracted.first_name,
        last_name: extracted.last_name,
        telefone: extracted.telefone,
        status: extracted.status,
        foto: extracted.foto,
        genero: extracted.genero,
        last_interaction_at: extracted.last_interaction
          ? new Date(extracted.last_interaction).toISOString()
          : new Date().toISOString(),
        payload_bruto: payload,
        manychat_data: sub,
        external_transfers: extracted.external_transfers,
        messages_payload: extracted.messages_payload,
        generated_at: extracted.generated_at
          ? new Date(extracted.generated_at).toISOString()
          : null,
        last_synced_at: new Date().toISOString(),
        last_update_status: 'updated',
        lead_nome_exibicao: extracted.lead_nome_exibicao,
        manychat_live_chat_url: extracted.manychat_live_chat_url,
        subscribed_at: extracted.subscribed_at,
        whatsapp_phone: extracted.whatsapp_phone,
        lead_nome: extracted.lead_nome,
        lead_servico: extracted.lead_servico,
        lead_email: extracted.lead_email,
        lead_empresa_pf: extracted.lead_empresa_pf,
        lead_resumo: extracted.lead_resumo,
      }

      // Nota: current_stage e sla_status não estão no payload, então o Supabase vai preencher com
      // o valor DEFAULT ('novo' e 'green') ao inserir um novo registro e não vai alterar se for um update
      const { error: upsertError } = await supabase
        .from('manychat_contatos')
        .upsert(record, { onConflict: 'manychat_id' })

      if (upsertError) {
        status = 'error'
        errorMessage = upsertError.message
      } else if (extracted.attributes && Object.keys(extracted.attributes).length > 0) {
        const attrsToInsert = Object.entries(extracted.attributes).map(([key, value]) => ({
          manychat_id: String(subscriber_id),
          attribute_key: key,
          attribute_value: String(value),
          updated_at: new Date().toISOString(),
        }))
        await supabase
          .from('manychat_contact_attributes')
          .upsert(attrsToInsert, { onConflict: 'manychat_id,attribute_key' })
      }
    }

    await supabase.from('integration_logs').insert({
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
        has_id: !!subscriber_id,
      },
    })

    results.push({ success: status === 'processed', error: errorMessage })
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
