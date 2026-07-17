-- CreateEnum
CREATE TYPE "OvertimePaymentDestination" AS ENUM ('PECUNIA', 'BANCO_DE_HORAS', 'A_DEFINIR');

-- CreateEnum
CREATE TYPE "OvertimeRequestLifecycleStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_WORKFLOW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OvertimeDayDecision" AS ENUM ('REQUESTED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OvertimeDayType" AS ENUM ('DIA_UTIL', 'SABADO', 'DOMINGO', 'FERIADO_NACIONAL', 'FERIADO_ESTADUAL', 'FERIADO_MUNICIPAL', 'FERIADO_REGIMENTAL', 'PONTO_FACULTATIVO', 'RECESSO', 'FOLGA_DE_ESCALA');

-- CreateEnum
CREATE TYPE "OvertimeBudgetReviewResult" AS ENUM ('AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'NEEDS_INFORMATION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OvertimeFinalDecisionResult" AS ENUM ('APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OvertimeAuthorizationStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'CANCELLED', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OvertimePayrollBatchStatus" AS ENUM ('DRAFT', 'CALCULATING', 'PENDING_REVIEW', 'READY_TO_CLOSE', 'CLOSED', 'EXPORTED', 'SENT_TO_PAYROLL', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "overtime_policies" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "code" VARCHAR(120) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_policy_versions" (
  "id" UUID NOT NULL,
  "policy_id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "normative_basis" TEXT,
  "valid_from" DATE NOT NULL,
  "valid_until" DATE,
  "prior_authorization" BOOLEAN NOT NULL DEFAULT true,
  "budget_review_required" BOOLEAN NOT NULL DEFAULT true,
  "minimum_business_days" INTEGER NOT NULL DEFAULT 0,
  "work_plan_required" BOOLEAN NOT NULL DEFAULT true,
  "justification_required" BOOLEAN NOT NULL DEFAULT true,
  "divisor_minutes" INTEGER NOT NULL DEFAULT 12000,
  "monthly_limit_minutes" INTEGER,
  "annual_limit_minutes" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "snapshot" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_rate_rules" (
  "id" UUID NOT NULL,
  "policy_version_id" UUID NOT NULL,
  "day_type" "OvertimeDayType" NOT NULL,
  "rate_percent" DECIMAL(7,4) NOT NULL,
  "daily_limit_minutes" INTEGER,
  "eligibility_threshold_minutes" INTEGER,
  "night_additional_percent" DECIMAL(7,4),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_rate_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_workflow_definitions" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "code" VARCHAR(120) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_workflow_versions" (
  "id" UUID NOT NULL,
  "definition_id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "valid_from" DATE NOT NULL,
  "valid_until" DATE,
  "initial_step_code" VARCHAR(120) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "snapshot" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_workflow_step_definitions" (
  "id" UUID NOT NULL,
  "workflow_version_id" UUID NOT NULL,
  "code" VARCHAR(120) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "order" INTEGER NOT NULL,
  "required_permission" VARCHAR(160),
  "optional" BOOLEAN NOT NULL DEFAULT false,
  "allows_return" BOOLEAN NOT NULL DEFAULT true,
  "allows_rejection" BOOLEAN NOT NULL DEFAULT true,
  "allows_partial_approval" BOOLEAN NOT NULL DEFAULT false,
  "sla_hours" INTEGER,
  "metadata" JSONB,
  CONSTRAINT "overtime_workflow_step_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_workflow_transitions" (
  "id" UUID NOT NULL,
  "workflow_version_id" UUID NOT NULL,
  "from_step_code" VARCHAR(120) NOT NULL,
  "to_step_code" VARCHAR(120) NOT NULL,
  "action_code" VARCHAR(120) NOT NULL,
  "required_permission" VARCHAR(160),
  "metadata" JSONB,
  CONSTRAINT "overtime_workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_responsibility_assignments" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "responsibility_type" VARCHAR(80) NOT NULL,
  "organizational_unit_id" UUID,
  "user_id" UUID,
  "role_id" UUID,
  "scope_unit_id" UUID,
  "valid_from" DATE NOT NULL,
  "valid_until" DATE,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_responsibility_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_requests" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "request_number" VARCHAR(40) NOT NULL,
  "requester_user_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "organizational_unit_id" UUID NOT NULL,
  "work_unit_id" UUID,
  "policy_version_id" UUID NOT NULL,
  "workflow_version_id" UUID NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "justification" TEXT NOT NULL,
  "activities_description" TEXT NOT NULL,
  "expected_productivity" TEXT,
  "payment_destination" "OvertimePaymentDestination" NOT NULL DEFAULT 'A_DEFINIR',
  "current_lifecycle_status" "OvertimeRequestLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
  "current_workflow_step_code" VARCHAR(120),
  "budget_review_result" "OvertimeBudgetReviewResult",
  "final_decision_result" "OvertimeFinalDecisionResult",
  "execution_status" VARCHAR(80),
  "payment_status" VARCHAR(80),
  "submitted_at" TIMESTAMP(3),
  "returned_at" TIMESTAMP(3),
  "approved_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_request_days" (
  "id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "requested_start_time" VARCHAR(5),
  "requested_end_time" VARCHAR(5),
  "requested_minutes" INTEGER NOT NULL,
  "approved_start_time" VARCHAR(5),
  "approved_end_time" VARCHAR(5),
  "approved_minutes" INTEGER,
  "day_type_snapshot" "OvertimeDayType" NOT NULL,
  "rate_percent_snapshot" DECIMAL(7,4),
  "request_decision" "OvertimeDayDecision" NOT NULL DEFAULT 'REQUESTED',
  "approval_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_request_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_request_history" (
  "id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "user_id" UUID,
  "action" VARCHAR(120) NOT NULL,
  "from_status" "OvertimeRequestLifecycleStatus",
  "to_status" "OvertimeRequestLifecycleStatus",
  "from_step_code" VARCHAR(120),
  "to_step_code" VARCHAR(120),
  "reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "overtime_request_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_budget_reviews" (
  "id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "reviewer_user_id" UUID,
  "budget_unit_id" UUID,
  "result" "OvertimeBudgetReviewResult" NOT NULL,
  "estimated_amount" DECIMAL(14,2),
  "available_amount" DECIMAL(14,2),
  "reserved_amount" DECIMAL(14,2),
  "approved_minutes" INTEGER,
  "budget_action_code" VARCHAR(80),
  "budget_plan_code" VARCHAR(80),
  "commitment_reference" VARCHAR(120),
  "sei_process_reference" VARCHAR(120),
  "notes" TEXT,
  "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valid_until" DATE,
  "metadata" JSONB,
  CONSTRAINT "overtime_budget_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_final_decisions" (
  "id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "authority_user_id" UUID NOT NULL,
  "budget_review_id" UUID,
  "result" "OvertimeFinalDecisionResult" NOT NULL,
  "justification" TEXT NOT NULL,
  "requested_minutes" INTEGER NOT NULL,
  "approved_minutes" INTEGER NOT NULL,
  "estimated_amount" DECIMAL(14,2),
  "sei_process_reference" VARCHAR(120),
  "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "policy_snapshot" JSONB,
  "workflow_snapshot" JSONB,
  "metadata" JSONB,
  CONSTRAINT "overtime_final_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_authorizations" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "decision_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "status" "OvertimeAuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',
  "valid_from" DATE NOT NULL,
  "valid_until" DATE NOT NULL,
  "total_approved_minutes" INTEGER NOT NULL,
  "policy_snapshot" JSONB NOT NULL,
  "workflow_snapshot" JSONB NOT NULL,
  "previous_authorization_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_authorization_days" (
  "id" UUID NOT NULL,
  "authorization_id" UUID NOT NULL,
  "request_day_id" UUID,
  "date" DATE NOT NULL,
  "approved_start_time" VARCHAR(5),
  "approved_end_time" VARCHAR(5),
  "approved_minutes" INTEGER NOT NULL,
  "day_type" "OvertimeDayType" NOT NULL,
  "rate_percent" DECIMAL(7,4) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "overtime_authorization_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_payroll_batches" (
  "id" UUID NOT NULL,
  "orgao_id" UUID NOT NULL,
  "competence" VARCHAR(7) NOT NULL,
  "status" "OvertimePayrollBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "filters" JSONB,
  "total_employees" INTEGER NOT NULL DEFAULT 0,
  "total_minutes" INTEGER NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "checksum" VARCHAR(128),
  "created_by_user_id" UUID,
  "closed_by_user_id" UUID,
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_payroll_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_payroll_batch_employees" (
  "id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "registration" VARCHAR(50),
  "employee_name" VARCHAR(200),
  "organizational_unit_label" VARCHAR(200),
  "total_minutes" INTEGER NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "overtime_payroll_batch_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_payroll_batch_lines" (
  "id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "batch_employee_id" UUID NOT NULL,
  "authorization_id" UUID NOT NULL,
  "authorization_day_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "competence" VARCHAR(7) NOT NULL,
  "minutes" INTEGER NOT NULL,
  "rate_percent" DECIMAL(7,4) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "rubrica_code" VARCHAR(80),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "overtime_payroll_batch_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "overtime_policies_orgao_id_code_key" ON "overtime_policies"("orgao_id", "code");
CREATE INDEX "overtime_policies_orgao_id_idx" ON "overtime_policies"("orgao_id");
CREATE INDEX "overtime_policies_active_idx" ON "overtime_policies"("active");

CREATE UNIQUE INDEX "overtime_policy_versions_policy_id_version_key" ON "overtime_policy_versions"("policy_id", "version");
CREATE INDEX "overtime_policy_versions_orgao_id_idx" ON "overtime_policy_versions"("orgao_id");
CREATE INDEX "overtime_policy_versions_valid_from_valid_until_idx" ON "overtime_policy_versions"("valid_from", "valid_until");
CREATE INDEX "overtime_policy_versions_active_idx" ON "overtime_policy_versions"("active");

CREATE UNIQUE INDEX "overtime_rate_rules_policy_version_id_day_type_key" ON "overtime_rate_rules"("policy_version_id", "day_type");
CREATE INDEX "overtime_rate_rules_day_type_idx" ON "overtime_rate_rules"("day_type");
CREATE INDEX "overtime_rate_rules_active_idx" ON "overtime_rate_rules"("active");

CREATE UNIQUE INDEX "overtime_workflow_definitions_orgao_id_code_key" ON "overtime_workflow_definitions"("orgao_id", "code");
CREATE INDEX "overtime_workflow_definitions_orgao_id_idx" ON "overtime_workflow_definitions"("orgao_id");
CREATE INDEX "overtime_workflow_definitions_active_idx" ON "overtime_workflow_definitions"("active");

CREATE UNIQUE INDEX "overtime_workflow_versions_definition_id_version_key" ON "overtime_workflow_versions"("definition_id", "version");
CREATE INDEX "overtime_workflow_versions_orgao_id_idx" ON "overtime_workflow_versions"("orgao_id");
CREATE INDEX "overtime_workflow_versions_valid_from_valid_until_idx" ON "overtime_workflow_versions"("valid_from", "valid_until");
CREATE INDEX "overtime_workflow_versions_active_idx" ON "overtime_workflow_versions"("active");

CREATE UNIQUE INDEX "overtime_workflow_step_definitions_workflow_version_id_code_key" ON "overtime_workflow_step_definitions"("workflow_version_id", "code");
CREATE INDEX "overtime_workflow_step_definitions_workflow_version_id_idx" ON "overtime_workflow_step_definitions"("workflow_version_id");
CREATE INDEX "overtime_workflow_step_definitions_order_idx" ON "overtime_workflow_step_definitions"("order");

CREATE UNIQUE INDEX "overtime_workflow_transitions_workflow_version_id_from_step_code_action_code_key" ON "overtime_workflow_transitions"("workflow_version_id", "from_step_code", "action_code");
CREATE INDEX "overtime_workflow_transitions_workflow_version_id_idx" ON "overtime_workflow_transitions"("workflow_version_id");
CREATE INDEX "overtime_workflow_transitions_from_step_code_idx" ON "overtime_workflow_transitions"("from_step_code");
CREATE INDEX "overtime_workflow_transitions_to_step_code_idx" ON "overtime_workflow_transitions"("to_step_code");

CREATE INDEX "overtime_responsibility_assignments_orgao_id_idx" ON "overtime_responsibility_assignments"("orgao_id");
CREATE INDEX "overtime_responsibility_assignments_responsibility_type_idx" ON "overtime_responsibility_assignments"("responsibility_type");
CREATE INDEX "overtime_responsibility_assignments_scope_unit_id_idx" ON "overtime_responsibility_assignments"("scope_unit_id");
CREATE INDEX "overtime_responsibility_assignments_active_valid_from_valid_until_idx" ON "overtime_responsibility_assignments"("active", "valid_from", "valid_until");

CREATE UNIQUE INDEX "overtime_requests_orgao_id_request_number_key" ON "overtime_requests"("orgao_id", "request_number");
CREATE INDEX "overtime_requests_orgao_id_idx" ON "overtime_requests"("orgao_id");
CREATE INDEX "overtime_requests_employee_id_idx" ON "overtime_requests"("employee_id");
CREATE INDEX "overtime_requests_organizational_unit_id_idx" ON "overtime_requests"("organizational_unit_id");
CREATE INDEX "overtime_requests_period_start_period_end_idx" ON "overtime_requests"("period_start", "period_end");
CREATE INDEX "overtime_requests_current_lifecycle_status_idx" ON "overtime_requests"("current_lifecycle_status");
CREATE INDEX "overtime_requests_current_workflow_step_code_idx" ON "overtime_requests"("current_workflow_step_code");

CREATE UNIQUE INDEX "overtime_request_days_request_id_date_key" ON "overtime_request_days"("request_id", "date");
CREATE INDEX "overtime_request_days_date_idx" ON "overtime_request_days"("date");
CREATE INDEX "overtime_request_days_request_decision_idx" ON "overtime_request_days"("request_decision");

CREATE INDEX "overtime_request_history_request_id_idx" ON "overtime_request_history"("request_id");
CREATE INDEX "overtime_request_history_user_id_idx" ON "overtime_request_history"("user_id");
CREATE INDEX "overtime_request_history_action_idx" ON "overtime_request_history"("action");
CREATE INDEX "overtime_request_history_created_at_idx" ON "overtime_request_history"("created_at");

CREATE INDEX "overtime_budget_reviews_request_id_idx" ON "overtime_budget_reviews"("request_id");
CREATE INDEX "overtime_budget_reviews_reviewer_user_id_idx" ON "overtime_budget_reviews"("reviewer_user_id");
CREATE INDEX "overtime_budget_reviews_budget_unit_id_idx" ON "overtime_budget_reviews"("budget_unit_id");
CREATE INDEX "overtime_budget_reviews_result_idx" ON "overtime_budget_reviews"("result");
CREATE INDEX "overtime_budget_reviews_valid_until_idx" ON "overtime_budget_reviews"("valid_until");

CREATE INDEX "overtime_final_decisions_request_id_idx" ON "overtime_final_decisions"("request_id");
CREATE INDEX "overtime_final_decisions_authority_user_id_idx" ON "overtime_final_decisions"("authority_user_id");
CREATE INDEX "overtime_final_decisions_budget_review_id_idx" ON "overtime_final_decisions"("budget_review_id");
CREATE INDEX "overtime_final_decisions_result_idx" ON "overtime_final_decisions"("result");
CREATE INDEX "overtime_final_decisions_decided_at_idx" ON "overtime_final_decisions"("decided_at");

CREATE INDEX "overtime_authorizations_orgao_id_idx" ON "overtime_authorizations"("orgao_id");
CREATE INDEX "overtime_authorizations_request_id_idx" ON "overtime_authorizations"("request_id");
CREATE INDEX "overtime_authorizations_decision_id_idx" ON "overtime_authorizations"("decision_id");
CREATE INDEX "overtime_authorizations_employee_id_idx" ON "overtime_authorizations"("employee_id");
CREATE INDEX "overtime_authorizations_status_idx" ON "overtime_authorizations"("status");
CREATE INDEX "overtime_authorizations_valid_from_valid_until_idx" ON "overtime_authorizations"("valid_from", "valid_until");

CREATE UNIQUE INDEX "overtime_authorization_days_authorization_id_date_key" ON "overtime_authorization_days"("authorization_id", "date");
CREATE INDEX "overtime_authorization_days_request_day_id_idx" ON "overtime_authorization_days"("request_day_id");
CREATE INDEX "overtime_authorization_days_date_idx" ON "overtime_authorization_days"("date");

CREATE INDEX "overtime_payroll_batches_orgao_id_idx" ON "overtime_payroll_batches"("orgao_id");
CREATE INDEX "overtime_payroll_batches_competence_idx" ON "overtime_payroll_batches"("competence");
CREATE INDEX "overtime_payroll_batches_status_idx" ON "overtime_payroll_batches"("status");
CREATE INDEX "overtime_payroll_batches_created_by_user_id_idx" ON "overtime_payroll_batches"("created_by_user_id");
CREATE INDEX "overtime_payroll_batches_closed_at_idx" ON "overtime_payroll_batches"("closed_at");

CREATE UNIQUE INDEX "overtime_payroll_batch_employees_batch_id_employee_id_key" ON "overtime_payroll_batch_employees"("batch_id", "employee_id");
CREATE INDEX "overtime_payroll_batch_employees_batch_id_idx" ON "overtime_payroll_batch_employees"("batch_id");
CREATE INDEX "overtime_payroll_batch_employees_employee_id_idx" ON "overtime_payroll_batch_employees"("employee_id");

CREATE UNIQUE INDEX "overtime_payroll_batch_lines_batch_id_authorization_day_id_key" ON "overtime_payroll_batch_lines"("batch_id", "authorization_day_id");
CREATE INDEX "overtime_payroll_batch_lines_batch_id_idx" ON "overtime_payroll_batch_lines"("batch_id");
CREATE INDEX "overtime_payroll_batch_lines_batch_employee_id_idx" ON "overtime_payroll_batch_lines"("batch_employee_id");
CREATE INDEX "overtime_payroll_batch_lines_employee_id_idx" ON "overtime_payroll_batch_lines"("employee_id");
CREATE INDEX "overtime_payroll_batch_lines_authorization_id_idx" ON "overtime_payroll_batch_lines"("authorization_id");
CREATE INDEX "overtime_payroll_batch_lines_authorization_day_id_idx" ON "overtime_payroll_batch_lines"("authorization_day_id");
CREATE INDEX "overtime_payroll_batch_lines_competence_idx" ON "overtime_payroll_batch_lines"("competence");

ALTER TABLE "overtime_policy_versions" ADD CONSTRAINT "overtime_policy_versions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "overtime_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overtime_rate_rules" ADD CONSTRAINT "overtime_rate_rules_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "overtime_policy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "overtime_workflow_versions" ADD CONSTRAINT "overtime_workflow_versions_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "overtime_workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overtime_workflow_step_definitions" ADD CONSTRAINT "overtime_workflow_step_definitions_workflow_version_id_fkey" FOREIGN KEY ("workflow_version_id") REFERENCES "overtime_workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overtime_workflow_transitions" ADD CONSTRAINT "overtime_workflow_transitions_workflow_version_id_fkey" FOREIGN KEY ("workflow_version_id") REFERENCES "overtime_workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "overtime_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_workflow_version_id_fkey" FOREIGN KEY ("workflow_version_id") REFERENCES "overtime_workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "overtime_request_days" ADD CONSTRAINT "overtime_request_days_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "overtime_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overtime_request_history" ADD CONSTRAINT "overtime_request_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "overtime_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overtime_budget_reviews" ADD CONSTRAINT "overtime_budget_reviews_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "overtime_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overtime_final_decisions" ADD CONSTRAINT "overtime_final_decisions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "overtime_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "overtime_authorizations" ADD CONSTRAINT "overtime_authorizations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "overtime_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "overtime_authorization_days" ADD CONSTRAINT "overtime_authorization_days_authorization_id_fkey" FOREIGN KEY ("authorization_id") REFERENCES "overtime_authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "overtime_payroll_batch_employees" ADD CONSTRAINT "overtime_payroll_batch_employees_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "overtime_payroll_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overtime_payroll_batch_lines" ADD CONSTRAINT "overtime_payroll_batch_lines_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "overtime_payroll_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overtime_payroll_batch_lines" ADD CONSTRAINT "overtime_payroll_batch_lines_batch_employee_id_fkey" FOREIGN KEY ("batch_employee_id") REFERENCES "overtime_payroll_batch_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
