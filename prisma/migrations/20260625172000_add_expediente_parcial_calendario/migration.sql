ALTER TABLE "calendarios_institucionais"
ADD COLUMN "janela_inicio" VARCHAR(5),
ADD COLUMN "janela_fim" VARCHAR(5),
ADD COLUMN "data_original" DATE,
ADD COLUMN "data_substituida" BOOLEAN NOT NULL DEFAULT false;
