ALTER TABLE "regulamentacoes_ponto_orgaos"
  ADD COLUMN "jornada_7h_cargo_comissionado_credito_minimo_minutos" INTEGER NOT NULL DEFAULT 480,
  ADD COLUMN "jornada_7h_credito_exige_intervalo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "expediente_padrao_inicio" VARCHAR(5) NOT NULL DEFAULT '09:00',
  ADD COLUMN "expediente_padrao_fim" VARCHAR(5) NOT NULL DEFAULT '18:00',
  ADD COLUMN "entrada_minima_permitida" VARCHAR(5) NOT NULL DEFAULT '07:00',
  ADD COLUMN "saida_maxima_permitida" VARCHAR(5) NOT NULL DEFAULT '19:00',
  ADD COLUMN "prazo_homologacao_dia_mes_seguinte" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "prazo_ajuste_ponto_dia_mes_seguinte" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "percentual_credito_sabado" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "percentual_credito_domingo_feriado" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "percentual_credito_recesso" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "recesso_ignora_limite_mensal" BOOLEAN NOT NULL DEFAULT true;
