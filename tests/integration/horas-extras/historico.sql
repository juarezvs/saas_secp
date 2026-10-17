-- Dados inteiramente fictícios inseridos ANTES da nova migration.
INSERT INTO orgaos (id,sigla,nome,atualizado_em) VALUES
('99999999-9999-4999-8999-999999999991','HE_HIST','Orgao historico ficticio para ensaio',CURRENT_TIMESTAMP);
INSERT INTO unidades_organizacionais (id,orgao_id,codigo,sigla,nome,tipo,atualizado_em) VALUES
('99999999-9999-4999-8999-999999999992','99999999-9999-4999-8999-999999999991','HE_HIST','HE_HIST','Unidade historica ficticia','VARA',CURRENT_TIMESTAMP);
INSERT INTO usuarios (id,matricula,nome,atualizado_em) VALUES
('99999999-9999-4999-8999-999999999993','HE_TEST_FICTICIO','Usuario ficticio para testes',CURRENT_TIMESTAMP);

INSERT INTO servidores (id,usuario_id,orgao_id,matricula,atualizado_em) VALUES
('99999999-9999-4999-8999-999999999994','99999999-9999-4999-8999-999999999993','99999999-9999-4999-8999-999999999991','HE_TEST_FICTICIO',CURRENT_TIMESTAMP);
INSERT INTO autorizacoes_horas_extras
(id,orgao_id,unidade_id,processo_sei,documento_autorizacao,mes_referencia,data_autorizacao,modalidade,status,conteudo_original_autorizado,atualizado_em) VALUES
('99999999-9999-4999-8999-999999999995','99999999-9999-4999-8999-999999999991','99999999-9999-4999-8999-999999999992','SEI-FICTICIO-HISTORICO','ATO-FICTICIO-HISTORICO','2026-08','2026-08-01','DATAS_ESPECIFICAS','PAGA','{"origem":"HISTORICO_FICTICIO_PRESERVAR"}',CURRENT_TIMESTAMP);
INSERT INTO autorizacoes_horas_extras_servidores
(id,autorizacao_id,servidor_id,unidade_id,matricula_snapshot,nome_snapshot,periodo_inicio,periodo_fim,quantidade_maxima_minutos,status,atualizado_em) VALUES
('99999999-9999-4999-8999-999999999996','99999999-9999-4999-8999-999999999995','99999999-9999-4999-8999-999999999994','99999999-9999-4999-8999-999999999992','HE_TEST_FICTICIO','Pessoa historica ficticia','2026-08-14','2026-08-14',120,'PROCESSADO_EM_FOLHA',CURRENT_TIMESTAMP);
INSERT INTO horas_extras_classificacoes_intervalos
(id,servidor_autorizado_id,data,inicio,fim,minutos,categoria,motivo) VALUES
('99999999-9999-4999-8999-999999999997','99999999-9999-4999-8999-999999999996','2026-08-14','18:00','20:00',120,'HORA_EXTRA_RECONHECIDA','Reconhecimento historico inteiramente ficticio');
INSERT INTO horas_extras_calculos
(id,autorizacao_id,competencia,total_servidores,total_minutos,total_valor_centavos,divisor_minutos,memoria_calculo,atualizado_em) VALUES
('99999999-9999-4999-8999-999999999998','99999999-9999-4999-8999-999999999995','2026-08',1,120,12000,12000,'{"origem":"MEMORIA_FICTICIA_PRESERVAR"}',CURRENT_TIMESTAMP);
INSERT INTO horas_extras_calculos_itens
(id,calculo_id,servidor_autorizado_id,classificacao_intervalo_id,data,inicio,fim,minutos,tipo_dia,vigencia_remuneratoria_id,remuneracao_base_centavos,divisor_minutos,percentual,valor_centavos) VALUES
('99999999-9999-4999-8999-999999999999','99999999-9999-4999-8999-999999999998','99999999-9999-4999-8999-999999999996','99999999-9999-4999-8999-999999999997','2026-08-14','18:00','20:00',120,'DIA_UTIL','FICTICIA-2026-08',800000,12000,50,12000);
INSERT INTO horas_extras_atestos (id,autorizacao_id,gestor_usuario_id,texto,snapshot) VALUES
('99999999-9999-4999-8999-999999999981','99999999-9999-4999-8999-999999999995','99999999-9999-4999-8999-999999999993','Atesto historico ficticio','{"origem":"ATESTO_FICTICIO_PRESERVAR"}');
INSERT INTO horas_extras_remuneracoes_snapshots
(id,calculo_id,servidor_autorizado_id,vigencia_id,inicio,fim,remuneracao_base_centavos,origem,payload) VALUES
('99999999-9999-4999-8999-999999999982','99999999-9999-4999-8999-999999999998','99999999-9999-4999-8999-999999999996','FICTICIA-2026-08','2026-08-01','2026-08-31',800000,'MANUAL','{"origem":"REMUNERACAO_FICTICIA_PRESERVAR"}');
