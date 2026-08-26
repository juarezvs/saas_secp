ALTER TABLE "regulamentacoes_ponto_orgaos"
ADD COLUMN "limite_virada_madrugada" VARCHAR(5) NOT NULL DEFAULT '04:00',
ADD COLUMN "inicio_janela_noite" VARCHAR(5) NOT NULL DEFAULT '18:00';
