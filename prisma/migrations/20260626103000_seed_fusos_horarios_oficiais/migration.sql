DELETE FROM "fusos_horarios"
WHERE "valor" LIKE 'Etc/GMT%';

INSERT INTO "fusos_horarios" ("valor", "rotulo", "descricao", "ativo", "atualizado_em")
VALUES
  ('America/Noronha', 'Fernando de Noronha (UTC-02)', 'Fuso oficial brasileiro UTC-02.', true, CURRENT_TIMESTAMP),
  ('America/Sao_Paulo', 'Brasília/São Paulo (UTC-03)', 'Fuso oficial brasileiro UTC-03, horário de Brasília e da maior parte do país.', true, CURRENT_TIMESTAMP),
  ('America/Manaus', 'Manaus (UTC-04)', 'Fuso oficial brasileiro UTC-04, usado no Amazonas, Roraima, Rondônia e Mato Grosso.', true, CURRENT_TIMESTAMP),
  ('America/Eirunepe', 'Tabatinga/Eirunepé (UTC-05)', 'Fuso oficial brasileiro UTC-05, usado em localidades do oeste do Amazonas.', true, CURRENT_TIMESTAMP),
  ('America/Rio_Branco', 'Rio Branco (UTC-05)', 'Fuso oficial brasileiro UTC-05, usado no Acre.', true, CURRENT_TIMESTAMP)
ON CONFLICT ("valor") DO UPDATE
SET
  "rotulo" = EXCLUDED."rotulo",
  "descricao" = EXCLUDED."descricao",
  "ativo" = true,
  "atualizado_em" = CURRENT_TIMESTAMP;
