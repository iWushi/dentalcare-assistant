-- =====================================================================
-- Módulo de Pagamentos Parciais — registo do SQL aplicado ao Supabase
-- Projecto: hpuwvszhcxabcoxqcuec  ·  Tabela: public.consultas
--
-- Este ficheiro é o rasto, no repositório, das migrações aplicadas à base
-- de dados (via Supabase). É idempotente na parte de schema/função; a parte
-- de backfill de dados foi corrida uma vez (fica aqui documentada).
-- Ortografia: Português europeu (Acordo de 1945).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) COLUNAS + CHECK + ÍNDICES  (migração: pagamentos_parciais_colunas)
--    Passa o estado do pagamento de texto livre para colunas estruturadas.
-- ---------------------------------------------------------------------
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS pagamento_grupo_id uuid,      -- liga as prestações do mesmo tratamento
  ADD COLUMN IF NOT EXISTS tipo_pagamento     text,      -- 'integral' | 'convencao' | 'beneficiario' | 'remanescente'
  ADD COLUMN IF NOT EXISTS valor_tratamento   numeric,   -- valor cheio do tratamento (referência; NUNCA somado em relatórios)
  ADD COLUMN IF NOT EXISTS valor_pendente     numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_pagamento   text DEFAULT 'liquidado',  -- 'pendente' | 'liquidado'
  ADD COLUMN IF NOT EXISTS seguradora         text,
  ADD COLUMN IF NOT EXISTS guia_numero        text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultas_tipo_pagamento_check') THEN
    ALTER TABLE public.consultas
      ADD CONSTRAINT consultas_tipo_pagamento_check
      CHECK (tipo_pagamento IN ('integral','convencao','beneficiario','remanescente'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultas_estado_pagamento_check') THEN
    ALTER TABLE public.consultas
      ADD CONSTRAINT consultas_estado_pagamento_check
      CHECK (estado_pagamento IN ('pendente','liquidado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consultas_estado_pagamento_data
  ON public.consultas (estado_pagamento, data);

CREATE INDEX IF NOT EXISTS idx_consultas_pagamento_grupo_id
  ON public.consultas (pagamento_grupo_id);


-- ---------------------------------------------------------------------
-- 2) BACKFILL GENÉRICO (corrido uma vez)
--    Todo o histórico existente = pagamento integral, já liquidado.
--    Exclui os 4 registos manuais (migrados no ponto 3).
-- ---------------------------------------------------------------------
-- UPDATE public.consultas
-- SET tipo_pagamento   = 'integral',
--     estado_pagamento = COALESCE(estado_pagamento, 'liquidado'),
--     valor_pendente   = COALESCE(valor_pendente, 0)
-- WHERE tipo_pagamento IS NULL
--   AND id NOT IN (
--     'dc775676-6834-46ce-a135-7ea14ab9f8ae',  -- India Margarido  (pendente)
--     '993d10ca-8733-419f-a963-b5fe5d43ffe7',  -- Elisa Langa       (pendente)
--     'e2b0a1fa-d73e-4c44-bf0e-7dbdf9f91135',  -- Halima Munguiwa   (1.ª prestação)
--     '15bfa9c7-4a75-4aca-a684-9a69cbc60da0'   -- Halima Munguiwa   (remanescente)
--   );


-- ---------------------------------------------------------------------
-- 3) BACKFILL DOS REGISTOS MANUAIS (corrido uma vez, após aprovação do diff)
--    3 casos que estavam com o pendente escrito à mão em observacoes/lembrete.
--    Os valores monetários existentes (valor_total, valor_final_dra) NÃO foram
--    alterados — apenas se preencheram as colunas novas.
-- ---------------------------------------------------------------------
-- DO $$
-- DECLARE
--   g_india  uuid := gen_random_uuid();
--   g_elisa  uuid := gen_random_uuid();
--   g_halima uuid := gen_random_uuid();
-- BEGIN
--   -- Caso A — India Margarido (convenção paga; beneficiário pendente)
--   UPDATE public.consultas SET pagamento_grupo_id=g_india, tipo_pagamento='convencao',
--     estado_pagamento='pendente', valor_tratamento=65299.99, valor_pendente=22800.00,
--     seguradora='MAXIMO', guia_numero='1.673/SMS'
--   WHERE id='dc775676-6834-46ce-a135-7ea14ab9f8ae';
--
--   -- Caso B — Elisa Langa (convenção; 35% do beneficiário pendente)
--   UPDATE public.consultas SET pagamento_grupo_id=g_elisa, tipo_pagamento='convencao',
--     estado_pagamento='pendente', valor_tratamento=62666.68, valor_pendente=21933.34,
--     seguradora='FOCOJUNE-IMPAR', guia_numero='1.747/MF'
--   WHERE id='993d10ca-8733-419f-a963-b5fe5d43ffe7';
--
--   -- Caso C — Halima Munguiwa (2 prestações, já liquidado, mesmo grupo)
--   UPDATE public.consultas SET pagamento_grupo_id=g_halima, tipo_pagamento='convencao',
--     estado_pagamento='liquidado', valor_tratamento=45000.00, valor_pendente=0, seguradora='MEDIHEATH'
--   WHERE id='e2b0a1fa-d73e-4c44-bf0e-7dbdf9f91135';
--
--   UPDATE public.consultas SET pagamento_grupo_id=g_halima, tipo_pagamento='remanescente',
--     estado_pagamento='liquidado', valor_tratamento=45000.00, valor_pendente=0, seguradora='MEDIHEATH'
--   WHERE id='15bfa9c7-4a75-4aca-a684-9a69cbc60da0';
-- END $$;


-- ---------------------------------------------------------------------
-- 4) FUNÇÃO RPC ATÓMICA  (migração: registar_pagamento_remanescente_fn)
--    Regista o pagamento do remanescente de uma conta pendente:
--      1) cria uma nova consulta com o valor recebido agora (tipo 'remanescente');
--      2) abate esse valor ao pendente da consulta original;
--      3) se o pendente chegar a zero, marca a original como 'liquidado'.
--    Tudo numa única transacção (atómico). SECURITY INVOKER + search_path fixo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registar_pagamento_remanescente(
  p_consulta_id text,
  p_data        date,
  p_valor       numeric
)
RETURNS public.consultas
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_orig          public.consultas;
  v_rate          numeric;
  v_grupo         uuid;
  v_nova          public.consultas;
  v_novo_pendente numeric;
BEGIN
  SELECT * INTO v_orig FROM public.consultas WHERE id = p_consulta_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consulta original não encontrada.';
  END IF;

  IF v_orig.estado_pagamento IS DISTINCT FROM 'pendente' THEN
    RAISE EXCEPTION 'Esta conta já está liquidada.';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor recebido tem de ser maior que zero.';
  END IF;

  IF round(p_valor, 2) > round(COALESCE(v_orig.valor_pendente, 0), 2) THEN
    RAISE EXCEPTION 'O valor recebido (%) é maior que o valor pendente (%).',
      round(p_valor, 2), round(COALESCE(v_orig.valor_pendente, 0), 2);
  END IF;

  -- Taxa de comissão a partir dos procedimentos do original: K = 65%, restantes = 40%
  v_rate := CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(v_orig.procedimentos, '[]'::jsonb)) e
      WHERE upper(left(COALESCE(e->>'codigo', e->>'code', ''), 1)) = 'K'
    ) THEN 0.65 ELSE 0.40 END;

  v_grupo := COALESCE(v_orig.pagamento_grupo_id, gen_random_uuid());
  IF v_orig.pagamento_grupo_id IS NULL THEN
    UPDATE public.consultas SET pagamento_grupo_id = v_grupo WHERE id = v_orig.id;
  END IF;

  INSERT INTO public.consultas (
    data, clinica, paciente_id, paciente_nome, procedimentos,
    valor_total, valor_sem_iva, valor_final_dra, custo_lab,
    pagamento_grupo_id, tipo_pagamento, valor_tratamento, valor_pendente,
    estado_pagamento, seguradora, guia_numero, observacoes
  ) VALUES (
    p_data, v_orig.clinica, v_orig.paciente_id, v_orig.paciente_nome, v_orig.procedimentos,
    round(p_valor, 2), round(p_valor / 1.05, 2), round((p_valor / 1.05) * v_rate, 2), 0,
    v_grupo, 'remanescente', v_orig.valor_tratamento, 0,
    'liquidado', v_orig.seguradora, v_orig.guia_numero,
    'Pagamento do remanescente'
      || COALESCE(' — ' || v_orig.seguradora, '')
      || COALESCE(' / Guia ' || v_orig.guia_numero, '')
      || ' (ref. tratamento de ' || to_char(v_orig.data, 'DD/MM/YYYY') || ')'
  )
  RETURNING * INTO v_nova;

  v_novo_pendente := round(COALESCE(v_orig.valor_pendente, 0) - p_valor, 2);
  UPDATE public.consultas
    SET valor_pendente   = GREATEST(v_novo_pendente, 0),
        estado_pagamento = CASE WHEN v_novo_pendente <= 0.005 THEN 'liquidado' ELSE 'pendente' END
    WHERE id = v_orig.id;

  RETURN v_nova;
END $$;
