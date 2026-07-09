ALTER TYPE "TipoIntegracao" ADD VALUE IF NOT EXISTS 'TEAMS';

CREATE TABLE IF NOT EXISTS "integracoes_teams_configuracoes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ativo" BOOLEAN NOT NULL DEFAULT false,
  "ambiente" VARCHAR(40) NOT NULL DEFAULT 'desenvolvimento',
  "microsoft_app_id" VARCHAR(120),
  "microsoft_app_secret_criptografado" TEXT,
  "tenant_id" VARCHAR(120),
  "bot_endpoint" TEXT,
  "messaging_endpoint" TEXT,
  "url_publica_secp" TEXT,
  "politica_envio_notificacoes" VARCHAR(80) NOT NULL DEFAULT 'somente_vinculados',
  "bot_conversacional_ativo" BOOLEAN NOT NULL DEFAULT false,
  "notificacoes_ativas" BOOLEAN NOT NULL DEFAULT false,
  "adaptive_cards_ativos" BOOLEAN NOT NULL DEFAULT false,
  "abas_teams_ativas" BOOLEAN NOT NULL DEFAULT false,
  "registro_ponto_ativo" BOOLEAN NOT NULL DEFAULT false,
  "consulta_banco_horas_ativa" BOOLEAN NOT NULL DEFAULT false,
  "aprovacoes_ativas" BOOLEAN NOT NULL DEFAULT false,
  "homologacoes_ativas" BOOLEAN NOT NULL DEFAULT false,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integracoes_teams_configuracoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "teams_usuarios_vinculados" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "usuario_id" UUID NOT NULL,
  "servidor_id" UUID,
  "teams_user_id" VARCHAR(180) NOT NULL,
  "teams_aad_object_id" VARCHAR(180),
  "teams_conversation_id" TEXT,
  "tenant_id" VARCHAR(120),
  "service_url" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teams_usuarios_vinculados_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "teams_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tipo" VARCHAR(80) NOT NULL,
  "direcao" VARCHAR(40) NOT NULL,
  "usuario_id" UUID,
  "teams_user_id" VARCHAR(180),
  "evento" VARCHAR(160) NOT NULL,
  "payload_resumo" TEXT,
  "sucesso" BOOLEAN NOT NULL DEFAULT true,
  "erro" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teams_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "teams_notificacoes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "usuario_id" UUID NOT NULL,
  "teams_user_id" VARCHAR(180),
  "titulo" VARCHAR(180) NOT NULL,
  "mensagem" TEXT NOT NULL,
  "tipo" VARCHAR(80) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'pendente',
  "enviado_em" TIMESTAMP(3),
  "erro" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teams_notificacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "integracoes_teams_configuracoes_ativo_idx" ON "integracoes_teams_configuracoes"("ativo");
CREATE INDEX IF NOT EXISTS "integracoes_teams_configuracoes_ambiente_idx" ON "integracoes_teams_configuracoes"("ambiente");

CREATE UNIQUE INDEX IF NOT EXISTS "teams_usuarios_vinculados_teams_user_id_tenant_id_key"
  ON "teams_usuarios_vinculados"("teams_user_id", "tenant_id");
CREATE INDEX IF NOT EXISTS "teams_usuarios_vinculados_usuario_id_idx" ON "teams_usuarios_vinculados"("usuario_id");
CREATE INDEX IF NOT EXISTS "teams_usuarios_vinculados_servidor_id_idx" ON "teams_usuarios_vinculados"("servidor_id");
CREATE INDEX IF NOT EXISTS "teams_usuarios_vinculados_teams_aad_object_id_idx" ON "teams_usuarios_vinculados"("teams_aad_object_id");
CREATE INDEX IF NOT EXISTS "teams_usuarios_vinculados_ativo_idx" ON "teams_usuarios_vinculados"("ativo");

CREATE INDEX IF NOT EXISTS "teams_logs_tipo_idx" ON "teams_logs"("tipo");
CREATE INDEX IF NOT EXISTS "teams_logs_direcao_idx" ON "teams_logs"("direcao");
CREATE INDEX IF NOT EXISTS "teams_logs_usuario_id_idx" ON "teams_logs"("usuario_id");
CREATE INDEX IF NOT EXISTS "teams_logs_teams_user_id_idx" ON "teams_logs"("teams_user_id");
CREATE INDEX IF NOT EXISTS "teams_logs_evento_idx" ON "teams_logs"("evento");
CREATE INDEX IF NOT EXISTS "teams_logs_sucesso_idx" ON "teams_logs"("sucesso");
CREATE INDEX IF NOT EXISTS "teams_logs_criado_em_idx" ON "teams_logs"("criado_em");

CREATE INDEX IF NOT EXISTS "teams_notificacoes_usuario_id_idx" ON "teams_notificacoes"("usuario_id");
CREATE INDEX IF NOT EXISTS "teams_notificacoes_teams_user_id_idx" ON "teams_notificacoes"("teams_user_id");
CREATE INDEX IF NOT EXISTS "teams_notificacoes_tipo_idx" ON "teams_notificacoes"("tipo");
CREATE INDEX IF NOT EXISTS "teams_notificacoes_status_idx" ON "teams_notificacoes"("status");
CREATE INDEX IF NOT EXISTS "teams_notificacoes_criado_em_idx" ON "teams_notificacoes"("criado_em");

ALTER TABLE "teams_usuarios_vinculados"
  ADD CONSTRAINT "teams_usuarios_vinculados_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "teams_usuarios_vinculados"
  ADD CONSTRAINT "teams_usuarios_vinculados_servidor_id_fkey"
  FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teams_logs"
  ADD CONSTRAINT "teams_logs_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teams_notificacoes"
  ADD CONSTRAINT "teams_notificacoes_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
