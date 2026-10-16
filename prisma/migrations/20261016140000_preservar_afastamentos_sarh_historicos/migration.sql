-- A sincronização confundia o fim do período com a inativação do registro.
-- Restaurar somente importações SARH encerradas cujos identificadores e datas
-- ainda correspondam ao payload original; preservar registros locais/invalidados
-- que não tenham essa evidência. As datas de vigência permanecem inalteradas.
UPDATE "afastamentos_sarh"
SET "ativo" = true,
    "atualizado_em" = CURRENT_TIMESTAMP
WHERE "origem_sarh" = true
  AND "ativo" = false
  AND "data_fim" < CURRENT_DATE
  AND "codigo_externo_sarh" = "payload_sarh" ->> 'id'
  AND "origem_tabela" = "payload_sarh" ->> 'origemTabela'
  AND to_char("data_inicio", 'YYYY-MM-DD') = left("payload_sarh" ->> 'dataInicio', 10)
  AND to_char("data_fim", 'YYYY-MM-DD') = left("payload_sarh" ->> 'dataFim', 10);
