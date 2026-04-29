export function normalizeManyChatPayload(payload: any) {
  let sub = payload?.contact || payload?.subscriber || payload?.data?.subscriber || payload?.data || payload?.user || payload;
  if (Array.isArray(sub)) sub = sub[0];
  
  const subscriberId = sub?.id || sub?.user_id || sub?.subscriber_id || payload?.user_id || null;
  const eventType = payload?.event || payload?.type || (subscriberId ? 'subscriber_update' : 'unknown');
  
  const nomeRaw = sub?.name || sub?.full_name || '';
  const nome = nomeRaw || `${sub?.first_name || ''} ${sub?.last_name || ''}`.trim() || 'Sem nome';
  const firstName = sub?.first_name || (nome.split(' ')[0] || null);
  const lastName = sub?.last_name || (nome.split(' ').slice(1).join(' ') || null);
  const telefone = sub?.phone || sub?.whatsapp_phone || null;
  const status = sub?.status || 'unknown';
  const foto = sub?.profile_pic || sub?.avatar_url || sub?.ava || null;
  const genero = sub?.gender || null;
  const locale = sub?.locale || null;
  const timezone = sub?.timezone || null;
  const lastInteraction = sub?.last_interaction_at || sub?.last_interaction || null;
  
  const generatedAt = payload?.generated || sub?.generated || null;
  const externalTransfers = payload?.external_transfers || sub?.external_transfers || null;
  const messagesPayload = payload?.messages || sub?.messages || null;

  const lead_nome_exibicao = sub?.name || nomeRaw || nome;
  const manychat_live_chat_url = sub?.live_chat_url || null;
  let subscribed_at = sub?.subscribed || null;
  if (subscribed_at && !isNaN(new Date(subscribed_at).getTime())) {
    subscribed_at = new Date(subscribed_at).toISOString();
  } else {
    subscribed_at = null;
  }
  const whatsapp_phone = sub?.whatsapp_phone || telefone;

  const customFields = sub?.custom_fields || payload?.custom_fields;
  let cfMap: Record<string, any> = {};
  if (Array.isArray(customFields)) {
    customFields.forEach((cf: any) => {
      if (cf.name) cfMap[cf.name] = cf.value;
    });
  } else if (typeof customFields === 'object' && customFields !== null) {
    cfMap = customFields;
  }

  const lead_nome = cfMap['user_nome'] || null;
  const lead_servico = cfMap['user_servico'] || null;
  const lead_email = cfMap['user_email'] || null;
  const lead_empresa_pf = cfMap['user_empresa'] || null;
  
  let lead_resumo = cfMap['user_resumo'] || null;
  const chatgpt_resposta = cfMap['chatgpt_resposta_anterior'] || null;

  if (chatgpt_resposta) {
    const text = String(chatgpt_resposta);
    const startMatch = text.match(/Resumo do Atendimento:\*?\*?\s*([\s\S]*?)(?=Em breve voc. ser. atendido)/i);
    if (startMatch && startMatch[1]) {
      lead_resumo = startMatch[1].trim();
    } else {
      lead_resumo = text.trim();
    }
  }

  // Extract dynamic attributes
  const attributes: Record<string, string> = {};
  
  const extractAttributes = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        if (key.startsWith('custom_field') || key.startsWith('question') || key.startsWith('cf_')) {
           attributes[key] = String(value);
        }
      }
    }
  };

  extractAttributes(payload);
  extractAttributes(payload?.data);
  extractAttributes(payload?.subscriber);
  extractAttributes(sub);
  extractAttributes(cfMap);

  return {
    subscriber_id: subscriberId ? String(subscriberId) : null,
    event_type: eventType,
    sub,
    extracted: {
      nome,
      first_name: firstName,
      last_name: lastName,
      telefone,
      status,
      foto,
      genero,
      locale,
      timezone,
      last_interaction: lastInteraction,
      generated_at: generatedAt,
      external_transfers: externalTransfers,
      messages_payload: messagesPayload,
      lead_nome_exibicao,
      manychat_live_chat_url,
      subscribed_at,
      whatsapp_phone,
      lead_nome,
      lead_servico,
      lead_email,
      lead_empresa_pf,
      lead_resumo,
      attributes
    }
  };
}
butes: Record<string, string> = {};
  const extractAttributes = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        if (key.startsWith('custom_field') || key.startsWith('question') || key.startsWith('cf_')) {
           attributes[key] = String(value);
        }
      }
    }
  };

  extractAttributes(payload);
  extractAttributes(payload?.data);
  extractAttributes(payload?.subscriber);
  extractAttributes(sub);
  extractAttributes(cfMap);

  return {
    subscriber_id: subscriberId ? String(subscriberId) : null,
    event_type: eventType,
    sub,
    extracted: {
      nome,
      first_name: firstName,
      last_name: lastName,
      telefone,
      status,
      foto,
      genero,
      locale,
      timezone,
      last_interaction: lastInteraction,
      generated_at: generatedAt,
      external_transfers: externalTransfers,
      messages_payload: messagesPayload,
      lead_nome_exibicao,
      manychat_live_chat_url,
      subscribed_at,
      whatsapp_phone,
      lead_nome,
      lead_servico,
      lead_email,
      lead_empresa_pf,
      lead_resumo,
      attributes
    }
  };
}
