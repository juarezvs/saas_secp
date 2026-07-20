ALTER TABLE "perfis"
  ADD COLUMN "administrativo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "excecao" BOOLEAN NOT NULL DEFAULT false;

UPDATE "perfis"
SET "administrativo" = true
WHERE "codigo" IN (
  'ADMIN',
  'MASTER',
  'SECAP',
  'SECAD',
  'DIREF',
  'NUTEC',
  'SUPORTE'
);

UPDATE "perfis"
SET "excecao" = true
WHERE "codigo" IN (
  'EXCECAO_REGISTRO_WEB',
  'EXCECAO_REGISTRO_FACIAL'
);
