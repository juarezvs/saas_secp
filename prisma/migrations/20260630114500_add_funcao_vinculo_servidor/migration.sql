ALTER TABLE "servidores"
  ADD COLUMN "codigo_funcionario_sarh" INTEGER,
  ADD COLUMN "codigo_provimento_sarh" INTEGER,
  ADD COLUMN "descricao_provimento_sarh" VARCHAR(200),
  ADD COLUMN "codigo_situacao_sarh" INTEGER,
  ADD COLUMN "descricao_situacao_sarh" VARCHAR(250),
  ADD COLUMN "perfil_tipo_sarh" VARCHAR(20),
  ADD COLUMN "funcao_atual_grupo_sarh" VARCHAR(20),
  ADD COLUMN "funcao_atual_categoria_sarh" VARCHAR(30),
  ADD COLUMN "funcao_atual_codigo_sarh" VARCHAR(50),
  ADD COLUMN "funcao_atual_descricao" VARCHAR(250),
  ADD COLUMN "funcao_atual_situacao_sarh" VARCHAR(100),
  ADD COLUMN "funcao_atual_inicio_sarh" DATE;

CREATE INDEX "servidores_codigo_funcionario_sarh_idx" ON "servidores"("codigo_funcionario_sarh");
CREATE INDEX "servidores_codigo_provimento_sarh_idx" ON "servidores"("codigo_provimento_sarh");
CREATE INDEX "servidores_codigo_situacao_sarh_idx" ON "servidores"("codigo_situacao_sarh");
