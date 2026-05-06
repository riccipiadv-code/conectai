DO $$
DECLARE
  v_id uuid;
  v_servico text;
  v_servico_id uuid;
BEGIN
  -- Atualizar lead_servico com base no mapeamento numérico
  UPDATE public.manychat_contatos
  SET lead_servico = CASE
    WHEN lead_servico = '1' THEN 'Registro de Marcas'
    WHEN lead_servico = '2' THEN 'Proteção de Patentes'
    WHEN lead_servico = '3' THEN 'Proteção de Desenho Industrial'
    WHEN lead_servico = '4' THEN 'Direitos Autorais ou Programas de Computador'
    WHEN lead_servico = '5' THEN 'Consultoria em Propriedade Intelectual'
    WHEN lead_servico = '6' THEN 'Assessoria em Ações Judiciais'
    WHEN lead_servico = '7' THEN 'Outros Assuntos'
    ELSE lead_servico
  END
  WHERE lead_servico IN ('1', '2', '3', '4', '5', '6', '7');

  -- Preencher servico_id com base no lead_servico atualizado e tentar corrigir IDs vazios
  FOR v_id, v_servico IN 
    SELECT id, lead_servico 
    FROM public.manychat_contatos 
    WHERE lead_servico IS NOT NULL AND servico_id IS NULL 
  LOOP
    v_servico_id := NULL;
    
    -- Tenta match exato
    SELECT id INTO v_servico_id FROM public.manychat_servicos WHERE descricao ILIKE v_servico LIMIT 1;
    
    -- Tenta match parcial se não encontrar exato
    IF v_servico_id IS NULL THEN
      SELECT id INTO v_servico_id FROM public.manychat_servicos WHERE descricao ILIKE '%' || v_servico || '%' LIMIT 1;
    END IF;

    -- Atualiza caso tenha encontrado o serviço correspondente
    IF v_servico_id IS NOT NULL THEN
      UPDATE public.manychat_contatos SET servico_id = v_servico_id WHERE id = v_id;
    END IF;
  END LOOP;
END $$;
