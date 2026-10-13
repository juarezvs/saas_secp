UPDATE "calendarios_institucionais"
SET "data_fim" = "data_referencia",
    "atualizado_em" = CURRENT_TIMESTAMP
WHERE "data_fim" IS NULL;
