ALTER TABLE "overtime_policies"
  ADD COLUMN "scope_unit_id" UUID;

ALTER TABLE "overtime_policy_versions"
  ADD COLUMN "scope_unit_id" UUID;

ALTER TABLE "overtime_workflow_definitions"
  ADD COLUMN "scope_unit_id" UUID;

ALTER TABLE "overtime_workflow_versions"
  ADD COLUMN "scope_unit_id" UUID;

DROP INDEX IF EXISTS "overtime_policies_orgao_id_code_key";
DROP INDEX IF EXISTS "overtime_workflow_definitions_orgao_id_code_key";

CREATE UNIQUE INDEX "overtime_policies_orgao_id_code_scope_unit_id_key"
  ON "overtime_policies"("orgao_id", "code", "scope_unit_id");

CREATE UNIQUE INDEX "overtime_policies_orgao_id_code_scope_geral_key"
  ON "overtime_policies"("orgao_id", "code")
  WHERE "scope_unit_id" IS NULL;

CREATE UNIQUE INDEX "overtime_workflow_definitions_orgao_id_code_scope_unit_id_key"
  ON "overtime_workflow_definitions"("orgao_id", "code", "scope_unit_id");

CREATE UNIQUE INDEX "overtime_workflow_definitions_orgao_id_code_scope_geral_key"
  ON "overtime_workflow_definitions"("orgao_id", "code")
  WHERE "scope_unit_id" IS NULL;

CREATE INDEX "overtime_policies_scope_unit_id_idx"
  ON "overtime_policies"("scope_unit_id");

CREATE INDEX "overtime_policy_versions_scope_unit_id_idx"
  ON "overtime_policy_versions"("scope_unit_id");

CREATE INDEX "overtime_workflow_definitions_scope_unit_id_idx"
  ON "overtime_workflow_definitions"("scope_unit_id");

CREATE INDEX "overtime_workflow_versions_scope_unit_id_idx"
  ON "overtime_workflow_versions"("scope_unit_id");

ALTER TABLE "overtime_policies"
  ADD CONSTRAINT "overtime_policies_scope_unit_id_fkey"
  FOREIGN KEY ("scope_unit_id") REFERENCES "unidades_organizacionais"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "overtime_policy_versions"
  ADD CONSTRAINT "overtime_policy_versions_scope_unit_id_fkey"
  FOREIGN KEY ("scope_unit_id") REFERENCES "unidades_organizacionais"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "overtime_workflow_definitions"
  ADD CONSTRAINT "overtime_workflow_definitions_scope_unit_id_fkey"
  FOREIGN KEY ("scope_unit_id") REFERENCES "unidades_organizacionais"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "overtime_workflow_versions"
  ADD CONSTRAINT "overtime_workflow_versions_scope_unit_id_fkey"
  FOREIGN KEY ("scope_unit_id") REFERENCES "unidades_organizacionais"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
