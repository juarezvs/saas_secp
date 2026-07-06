-- CreateIndex
CREATE INDEX "afastamentos_sarh_servidor_id_ativo_data_inicio_data_fim_idx" ON "afastamentos_sarh"("servidor_id", "ativo", "data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "afastamentos_sarh_ativo_data_inicio_data_fim_idx" ON "afastamentos_sarh"("ativo", "data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "apuracoes_diarias_data_referencia_servidor_id_idx" ON "apuracoes_diarias"("data_referencia", "servidor_id");

-- CreateIndex
CREATE INDEX "banco_horas_movimentos_apuracao_diaria_id_status_idx" ON "banco_horas_movimentos"("apuracao_diaria_id", "status");

-- CreateIndex
CREATE INDEX "banco_horas_movimentos_servidor_id_ano_referencia_mes_refer_idx" ON "banco_horas_movimentos"("servidor_id", "ano_referencia", "mes_referencia", "status");

-- CreateIndex
CREATE INDEX "gestores_unidades_ativo_servidor_id_data_inicio_data_fim_idx" ON "gestores_unidades"("ativo", "servidor_id", "data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "gestores_unidades_ativo_unidade_id_data_inicio_data_fim_idx" ON "gestores_unidades"("ativo", "unidade_id", "data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "homologacoes_servidores_meses_servidor_id_status_idx" ON "homologacoes_servidores_meses"("servidor_id", "status");

-- CreateIndex
CREATE INDEX "jornadas_servidores_servidor_id_ativo_data_inicio_data_fim_idx" ON "jornadas_servidores"("servidor_id", "ativo", "data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "lotacoes_servidor_id_status_data_inicio_data_fim_idx" ON "lotacoes"("servidor_id", "status", "data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "lotacoes_unidade_id_status_data_inicio_data_fim_idx" ON "lotacoes"("unidade_id", "status", "data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "marcacoes_servidor_id_data_referencia_status_data_hora_idx" ON "marcacoes"("servidor_id", "data_referencia", "status", "data_hora");

-- CreateIndex
CREATE INDEX "marcacoes_servidor_id_data_hora_idx" ON "marcacoes"("servidor_id", "data_hora");

-- CreateIndex
CREATE INDEX "marcacoes_data_hora_id_idx" ON "marcacoes"("data_hora", "id");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_processada_data_hora_id_idx" ON "marcacoes_brutas"("processada", "data_hora", "id");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_origem_data_hora_id_idx" ON "marcacoes_brutas"("origem", "data_hora", "id");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_processada_origem_data_hora_id_idx" ON "marcacoes_brutas"("processada", "origem", "data_hora", "id");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_servidor_id_processada_data_hora_idx" ON "marcacoes_brutas"("servidor_id", "processada", "data_hora");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_cpf_processada_data_hora_idx" ON "marcacoes_brutas"("cpf", "processada", "data_hora");

-- CreateIndex
CREATE INDEX "marcacoes_brutas_matricula_processada_data_hora_idx" ON "marcacoes_brutas"("matricula", "processada", "data_hora");
