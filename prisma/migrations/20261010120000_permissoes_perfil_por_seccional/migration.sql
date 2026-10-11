CREATE TABLE "perfis_permissoes_orgaos" (
    "id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,
    "orgao_id" UUID NOT NULL,
    "permitida" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfis_permissoes_orgaos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "perfis_permissoes_orgaos_perfil_id_permissao_id_orgao_id_key"
ON "perfis_permissoes_orgaos"("perfil_id", "permissao_id", "orgao_id");

CREATE INDEX "perfis_permissoes_orgaos_perfil_id_orgao_id_idx"
ON "perfis_permissoes_orgaos"("perfil_id", "orgao_id");

CREATE INDEX "perfis_permissoes_orgaos_orgao_id_idx"
ON "perfis_permissoes_orgaos"("orgao_id");

ALTER TABLE "perfis_permissoes_orgaos"
ADD CONSTRAINT "perfis_permissoes_orgaos_perfil_id_fkey"
FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "perfis_permissoes_orgaos"
ADD CONSTRAINT "perfis_permissoes_orgaos_permissao_id_fkey"
FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "perfis_permissoes_orgaos"
ADD CONSTRAINT "perfis_permissoes_orgaos_orgao_id_fkey"
FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Corrige a autorização web que foi incluída no perfil global SERVIDOR por
-- administrador seccional. O histórico mais recente determina a seccional;
-- alterações realizadas por usuário MASTER permanecem globais.
WITH permissao_web AS (
    SELECT id FROM "permissoes"
    WHERE codigo = 'marcacoes:registrar-web:proprio'
),
perfil_servidor AS (
    SELECT id FROM "perfis"
    WHERE UPPER(codigo) = 'SERVIDOR' AND global = true
),
ultima_inclusao_seccional AS (
    SELECT DISTINCT ON (ae.entidade_id)
        ae.entidade_id::uuid AS perfil_id,
        pw.id AS permissao_id,
        up.orgao_id
    FROM "auditoria_eventos" ae
    CROSS JOIN permissao_web pw
    JOIN "usuarios_perfis" up
      ON up.usuario_id = ae.usuario_id
     AND up.ativo = true
     AND up.orgao_id IS NOT NULL
    JOIN perfil_servidor ps ON ps.id::text = ae.entidade_id
    WHERE ae.entidade = 'Perfil'
      AND ae.acao = 'PERFIL_ATUALIZADO'
      AND ae.dados_depois::text LIKE '%' || pw.id::text || '%'
      AND COALESCE(ae.dados_antes::text, '') NOT LIKE '%' || pw.id::text || '%'
      AND NOT EXISTS (
          SELECT 1
          FROM "usuarios_perfis" up_master
          JOIN "perfis" p_master ON p_master.id = up_master.perfil_id
          WHERE up_master.usuario_id = ae.usuario_id
            AND up_master.ativo = true
            AND UPPER(p_master.codigo) = 'MASTER'
      )
    ORDER BY ae.entidade_id, ae.criado_em DESC
)
INSERT INTO "perfis_permissoes_orgaos"
    (id, perfil_id, permissao_id, orgao_id, permitida, criado_em, atualizado_em)
SELECT gen_random_uuid(), perfil_id, permissao_id, orgao_id, true,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM ultima_inclusao_seccional
ON CONFLICT (perfil_id, permissao_id, orgao_id)
DO UPDATE SET permitida = true, atualizado_em = CURRENT_TIMESTAMP;

DELETE FROM "perfis_permissoes" pp
USING "permissoes" p, "perfis" perfil
WHERE pp.permissao_id = p.id
  AND pp.perfil_id = perfil.id
  AND p.codigo = 'marcacoes:registrar-web:proprio'
  AND UPPER(perfil.codigo) = 'SERVIDOR'
  AND perfil.global = true
  AND EXISTS (
      SELECT 1 FROM "perfis_permissoes_orgaos" ppo
      WHERE ppo.perfil_id = pp.perfil_id
        AND ppo.permissao_id = pp.permissao_id
        AND ppo.permitida = true
  );
