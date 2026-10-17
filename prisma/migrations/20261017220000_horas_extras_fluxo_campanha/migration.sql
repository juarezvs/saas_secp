-- AlterTable
ALTER TABLE "autorizacoes_horas_extras" ADD COLUMN     "campaign_version_id" UUID;

-- CreateTable
CREATE TABLE "overtime_employee_restrictions" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "max_daily_minutes" INTEGER NOT NULL,
    "sei_document" VARCHAR(160) NOT NULL,
    "validated_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_employee_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_projects" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "orgao_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_project_versions" (
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "content_snapshot" JSONB NOT NULL,
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
    "sei_process" VARCHAR(80) NOT NULL,
    "justification" TEXT NOT NULL,
    "activities" TEXT NOT NULL,
    "expected_results" TEXT NOT NULL,
    "ordinary_impossibility" TEXT NOT NULL,
    "urgency_reason" TEXT,
    "amendment_reason" TEXT,
    "content_hash" CHAR(64) NOT NULL,
    "rules_snapshot" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "authorized_at" TIMESTAMP(3),
    "reservation_operation_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_project_items" (
    "recess_call_id" UUID,
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "requested_minutes" INTEGER NOT NULL,
    "approved_minutes" INTEGER NOT NULL DEFAULT 0,
    "performed_minutes" INTEGER NOT NULL DEFAULT 0,
    "proven_minutes" INTEGER NOT NULL DEFAULT 0,
    "homologated_minutes" INTEGER NOT NULL DEFAULT 0,
    "activity" TEXT NOT NULL,
    "destination" VARCHAR(30) NOT NULL DEFAULT 'PECUNIA',
    "day_type" "OvertimeDayType" NOT NULL,
    "estimated_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "decision_reason" TEXT,
    "employee_snapshot" JSONB NOT NULL,
    "execution_snapshot" JSONB,
    "proof_snapshot" JSONB,
    "calculation_snapshot" JSONB,
    "financial_status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    "classification_id" UUID,

    CONSTRAINT "overtime_project_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_project_events" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "active_profile" VARCHAR(120) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "from_status" VARCHAR(40),
    "to_status" VARCHAR(40) NOT NULL,
    "reason" TEXT NOT NULL,
    "sei_document" VARCHAR(160) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_project_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_project_fundings" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,

    CONSTRAINT "overtime_project_fundings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_extraordinary_credits" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "original_minutes" INTEGER NOT NULL,
    "credited_minutes" INTEGER NOT NULL,
    "used_minutes" INTEGER NOT NULL DEFAULT 0,
    "factor" DECIMAL(4,2) NOT NULL,
    "expires_on" DATE NOT NULL,
    "sei_document" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_extraordinary_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_extraordinary_credit_uses" (
    "request_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "credit_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "sei_document" VARCHAR(160) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_extraordinary_credit_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_salary_history" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "base_centavos" INTEGER NOT NULL,
    "components" JSONB NOT NULL,
    "source" VARCHAR(30) NOT NULL,
    "sei_document" VARCHAR(160) NOT NULL,
    "validated_by_user_id" UUID NOT NULL,
    "replaces_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_salary_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_salary_rubrics" (
    "id" UUID NOT NULL,
    "orgao_id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "description" VARCHAR(250) NOT NULL,
    "nature" VARCHAR(100) NOT NULL,
    "includes_in_base" BOOLEAN NOT NULL,
    "normative_basis" TEXT NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE,
    "validated_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_salary_rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overtime_employee_restrictions_employee_id_valid_from_valid_idx" ON "overtime_employee_restrictions"("employee_id", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "overtime_projects_orgao_id_campaign_id_idx" ON "overtime_projects"("orgao_id", "campaign_id");

-- CreateIndex
CREATE INDEX "overtime_projects_requester_user_id_idx" ON "overtime_projects"("requester_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_project_versions_reservation_operation_id_key" ON "overtime_project_versions"("reservation_operation_id");

-- CreateIndex
CREATE INDEX "overtime_project_versions_status_idx" ON "overtime_project_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_project_versions_project_id_version_key" ON "overtime_project_versions"("project_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_project_items_classification_id_key" ON "overtime_project_items"("classification_id");

-- CreateIndex
CREATE INDEX "overtime_project_items_employee_id_date_idx" ON "overtime_project_items"("employee_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_project_items_version_id_employee_id_date_start_ti_key" ON "overtime_project_items"("version_id", "employee_id", "date", "start_time");

-- CreateIndex
CREATE INDEX "overtime_project_events_version_id_created_at_idx" ON "overtime_project_events"("version_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_project_fundings_operation_id_key" ON "overtime_project_fundings"("operation_id");

-- CreateIndex
CREATE INDEX "overtime_project_fundings_version_id_idx" ON "overtime_project_fundings"("version_id");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_extraordinary_credits_item_id_key" ON "overtime_extraordinary_credits"("item_id");

-- CreateIndex
CREATE INDEX "overtime_extraordinary_credits_employee_id_expires_on_idx" ON "overtime_extraordinary_credits"("employee_id", "expires_on");

-- CreateIndex
CREATE INDEX "overtime_extraordinary_credit_uses_credit_id_date_idx" ON "overtime_extraordinary_credit_uses"("credit_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_salary_history_replaces_id_key" ON "overtime_salary_history"("replaces_id");

-- CreateIndex
CREATE INDEX "overtime_salary_history_employee_id_valid_from_valid_until_idx" ON "overtime_salary_history"("employee_id", "valid_from", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_salary_rubrics_orgao_id_code_valid_from_key" ON "overtime_salary_rubrics"("orgao_id", "code", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "autorizacoes_horas_extras_campaign_version_id_mes_referenci_key" ON "autorizacoes_horas_extras"("campaign_version_id", "mes_referencia");

-- AddForeignKey
ALTER TABLE "autorizacoes_horas_extras" ADD CONSTRAINT "autorizacoes_horas_extras_campaign_version_id_fkey" FOREIGN KEY ("campaign_version_id") REFERENCES "overtime_project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_employee_restrictions" ADD CONSTRAINT "overtime_employee_restrictions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_employee_restrictions" ADD CONSTRAINT "overtime_employee_restrictions_validated_by_user_id_fkey" FOREIGN KEY ("validated_by_user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_projects" ADD CONSTRAINT "overtime_projects_campaign_id_orgao_id_fkey" FOREIGN KEY ("campaign_id", "orgao_id") REFERENCES "overtime_campaigns"("id", "orgao_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_projects" ADD CONSTRAINT "overtime_projects_account_id_campaign_id_fkey" FOREIGN KEY ("account_id", "campaign_id") REFERENCES "overtime_campaign_accounts"("id", "campaign_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_projects" ADD CONSTRAINT "overtime_projects_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_versions" ADD CONSTRAINT "overtime_project_versions_reservation_operation_id_fkey" FOREIGN KEY ("reservation_operation_id") REFERENCES "overtime_budget_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_versions" ADD CONSTRAINT "overtime_project_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "overtime_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_items" ADD CONSTRAINT "overtime_project_items_recess_call_id_fkey" FOREIGN KEY ("recess_call_id") REFERENCES "recessos_convocados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_items" ADD CONSTRAINT "overtime_project_items_classification_id_fkey" FOREIGN KEY ("classification_id") REFERENCES "horas_extras_classificacoes_intervalos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_items" ADD CONSTRAINT "overtime_project_items_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "overtime_project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_items" ADD CONSTRAINT "overtime_project_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_events" ADD CONSTRAINT "overtime_project_events_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "overtime_project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_events" ADD CONSTRAINT "overtime_project_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_fundings" ADD CONSTRAINT "overtime_project_fundings_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "overtime_project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_project_fundings" ADD CONSTRAINT "overtime_project_fundings_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "overtime_budget_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_extraordinary_credits" ADD CONSTRAINT "overtime_extraordinary_credits_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "overtime_project_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_extraordinary_credits" ADD CONSTRAINT "overtime_extraordinary_credits_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_extraordinary_credit_uses" ADD CONSTRAINT "overtime_extraordinary_credit_uses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_extraordinary_credit_uses" ADD CONSTRAINT "overtime_extraordinary_credit_uses_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "overtime_extraordinary_credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_extraordinary_credit_uses" ADD CONSTRAINT "overtime_extraordinary_credit_uses_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_salary_history" ADD CONSTRAINT "overtime_salary_history_replaces_id_fkey" FOREIGN KEY ("replaces_id") REFERENCES "overtime_salary_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_salary_history" ADD CONSTRAINT "overtime_salary_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_salary_history" ADD CONSTRAINT "overtime_salary_history_validated_by_user_id_fkey" FOREIGN KEY ("validated_by_user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_salary_rubrics" ADD CONSTRAINT "overtime_salary_rubrics_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_salary_rubrics" ADD CONSTRAINT "overtime_salary_rubrics_validated_by_user_id_fkey" FOREIGN KEY ("validated_by_user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Invariantes dos novos registros, sem reescrever dados históricos.
CREATE UNIQUE INDEX overtime_project_one_current_version ON overtime_project_versions(project_id) WHERE is_current;
ALTER TABLE overtime_employee_restrictions ADD CONSTRAINT overtime_employee_restriction_check CHECK (valid_until>=valid_from AND max_daily_minutes BETWEEN 0 AND 600 AND btrim(sei_document)<>'');
CREATE TRIGGER overtime_employee_restrictions_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON overtime_employee_restrictions FOR EACH STATEMENT EXECUTE FUNCTION impedir_alteracao_razao_orcamentaria_he();
ALTER TABLE overtime_project_versions ADD CONSTRAINT overtime_project_status_check CHECK
 (status IN ('DRAFT','ADMIN_REVIEW','BUDGET_REVIEW','AUTHORITY_REVIEW','AUTHORIZED','EXECUTING','AWAITING_PROOF','PROVEN','HOMOLOGATED','FINANCIAL_REVIEW','READY_FOR_PAYROLL','CONVERTED','COMPLETED','RETURNED','REJECTED','CANCELLED','SUPERSEDED'));
ALTER TABLE overtime_project_items ADD CONSTRAINT overtime_project_minutes_check CHECK
 (requested_minutes > 0 AND approved_minutes BETWEEN 0 AND requested_minutes
 AND performed_minutes BETWEEN 0 AND approved_minutes AND proven_minutes BETWEEN 0 AND performed_minutes
 AND homologated_minutes BETWEEN 0 AND proven_minutes AND break_minutes >= 0 AND estimated_amount >= 0
 AND destination IN ('PECUNIA','BANCO_DE_HORAS')
 AND financial_status IN ('PENDING','REJECTED','CALCULATED','ELIGIBLE','BANK','SENT_TO_PAYROLL'));
ALTER TABLE overtime_salary_history ADD CONSTRAINT overtime_salary_dates_check CHECK
 (valid_until>=valid_from AND base_centavos>0 AND btrim(sei_document)<>'');
ALTER TABLE overtime_salary_rubrics ADD CONSTRAINT overtime_rubric_dates_check CHECK
 (valid_until IS NULL OR valid_until>=valid_from);
ALTER TABLE overtime_extraordinary_credits ADD CONSTRAINT overtime_credit_balance_check CHECK
 (original_minutes>0 AND credited_minutes>0 AND used_minutes BETWEEN 0 AND credited_minutes AND factor IN (1.5,2));
ALTER TABLE overtime_extraordinary_credit_uses ADD CONSTRAINT overtime_credit_use_check CHECK (minutes>0 AND btrim(sei_document)<>'');

CREATE FUNCTION proteger_versao_projeto_he() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Versao de projeto preservada: registre cancelamento.' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['status','is_current','submitted_at','authorized_at','reservation_operation_id','updated_at'])
 IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','is_current','submitted_at','authorized_at','reservation_operation_id','updated_at'])
 THEN RAISE EXCEPTION 'Conteudo da versao imutavel: crie retificacao.' USING ERRCODE='23514'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER overtime_project_version_content_immutable BEFORE UPDATE OR DELETE ON overtime_project_versions
 FOR EACH ROW EXECUTE FUNCTION proteger_versao_projeto_he();
CREATE FUNCTION proteger_item_projeto_he() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Item historico de projeto preservado.' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['approved_minutes','performed_minutes','proven_minutes','homologated_minutes','decision_reason','destination','execution_snapshot','proof_snapshot','calculation_snapshot','financial_status','classification_id'])
 IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['approved_minutes','performed_minutes','proven_minutes','homologated_minutes','decision_reason','destination','execution_snapshot','proof_snapshot','calculation_snapshot','financial_status','classification_id'])
 THEN RAISE EXCEPTION 'Proposta original imutavel: crie retificacao.' USING ERRCODE='23514'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER overtime_project_item_content_immutable BEFORE UPDATE OR DELETE ON overtime_project_items
 FOR EACH ROW EXECUTE FUNCTION proteger_item_projeto_he();
CREATE TRIGGER overtime_project_events_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON overtime_project_events
 FOR EACH STATEMENT EXECUTE FUNCTION impedir_alteracao_razao_orcamentaria_he();
CREATE TRIGGER overtime_salary_history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON overtime_salary_history
 FOR EACH STATEMENT EXECUTE FUNCTION impedir_alteracao_razao_orcamentaria_he();
CREATE TRIGGER overtime_salary_rubrics_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON overtime_salary_rubrics
 FOR EACH STATEMENT EXECUTE FUNCTION impedir_alteracao_razao_orcamentaria_he();
CREATE TRIGGER overtime_project_fundings_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON overtime_project_fundings
 FOR EACH STATEMENT EXECUTE FUNCTION impedir_alteracao_razao_orcamentaria_he();
CREATE TRIGGER overtime_extraordinary_credit_uses_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON overtime_extraordinary_credit_uses
 FOR EACH STATEMENT EXECUTE FUNCTION impedir_alteracao_razao_orcamentaria_he();

-- Preserva a separação dos regimes mesmo em validações ordinárias posteriores à homologação.
CREATE FUNCTION impedir_duplo_credito_extraordinario_he() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE extra integer; worked integer; regular integer; credited integer;
BEGIN
 IF NEW.status <> 'VALIDADO' OR NEW.tipo NOT IN ('CREDITO','COMPENSACAO_DEBITO') THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('horas-extras-servidor:' || NEW.servidor_id::text,0));
 SELECT COALESCE(SUM(i.homologated_minutes),0),MAX((i.execution_snapshot->>'worked')::integer),
 MAX((i.execution_snapshot#>>'{jornada,previsao,cargaPrevistaMinutos}')::integer)
 INTO extra,worked,regular FROM overtime_project_items i JOIN overtime_project_versions v ON v.id=i.version_id
 WHERE i.employee_id=NEW.servidor_id AND i.date=NEW.data_referencia AND v.status NOT IN ('CANCELLED','REJECTED','SUPERSEDED');
 IF extra=0 THEN RETURN NEW; END IF;
 SELECT COALESCE(SUM(minutos),0) INTO credited FROM banco_horas_movimentos
 WHERE servidor_id=NEW.servidor_id AND data_referencia=NEW.data_referencia AND status='VALIDADO'
 AND tipo IN ('CREDITO','COMPENSACAO_DEBITO') AND id IS DISTINCT FROM NEW.id;
 IF worked IS NULL OR regular IS NULL OR credited+NEW.minutos>GREATEST(0,worked-regular-extra)
 THEN RAISE EXCEPTION 'Minutos ja reconhecidos como extraordinarios: concilie os destinos antes de validar credito ordinario.' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER overtime_ordinary_credit_no_double_count BEFORE INSERT OR UPDATE ON banco_horas_movimentos
 FOR EACH ROW EXECUTE FUNCTION impedir_duplo_credito_extraordinario_he();

CREATE FUNCTION impedir_duplo_destino_recesso_he() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.escolha IS DISTINCT FROM OLD.escolha OR NEW.status IS DISTINCT FROM OLD.status)
 AND EXISTS (SELECT 1 FROM overtime_project_items i JOIN overtime_project_versions v ON v.id=i.version_id
 WHERE i.recess_call_id=NEW.id AND v.status NOT IN ('CANCELLED','REJECTED','SUPERSEDED','DRAFT'))
 THEN RAISE EXCEPTION 'Convocacao vinculada a campanha: registre a decisao no projeto para impedir destinos duplicados.' USING ERRCODE='23514'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER overtime_recess_no_double_destination BEFORE UPDATE ON recessos_convocados
 FOR EACH ROW EXECUTE FUNCTION impedir_duplo_destino_recesso_he();

-- Permissões por ação, sem conceder automaticamente competência de RH a perfis financeiros.
INSERT INTO permissoes (id,codigo,recurso,acao,escopo,descricao)
SELECT gen_random_uuid(),'horas-extras:'||a.acao||':'||e.escopo,'horas-extras',a.acao,e.escopo,a.descricao
FROM (VALUES ('validar-remuneracao','Validar historico remuneratorio documentado de horas extras.'),('validar-rubrica','Validar natureza, incidencia e vigencia de rubricas de horas extras.')) AS a(acao,descricao)
CROSS JOIN (VALUES ('seccional'),('global')) AS e(escopo) ON CONFLICT DO NOTHING;
