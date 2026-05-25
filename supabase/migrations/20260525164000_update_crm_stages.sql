DO $$
BEGIN
  -- Change default to new initial stage
  ALTER TABLE public.manychat_contatos ALTER COLUMN current_stage SET DEFAULT 'nivel_1_novo';

  -- Update existing stages to new terminology
  UPDATE public.manychat_contatos 
  SET current_stage = 'nivel_1_novo' 
  WHERE current_stage = 'novo';

  UPDATE public.manychat_contatos 
  SET current_stage = 'nivel_2_especialista' 
  WHERE current_stage = 'triagem_n1';

  UPDATE public.manychat_contatos 
  SET current_stage = 'nivel_3_especial' 
  WHERE current_stage = 'nivel_2';

  UPDATE public.manychat_contatos 
  SET current_stage = 'enviado_orcamento_ag_retorno' 
  WHERE current_stage = 'aguardando_cliente';

  UPDATE public.manychat_contatos 
  SET current_stage = 'orcamento_aprovado' 
  WHERE current_stage = 'aprovado';
END $$;
