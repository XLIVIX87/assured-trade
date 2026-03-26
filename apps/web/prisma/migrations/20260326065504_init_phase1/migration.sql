-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('BUYER', 'SUPPLIER', 'OPS');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrganizationVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrganizationVerificationLevel" AS ENUM ('NONE', 'BASIC', 'ENHANCED');

-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'QUOTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TradeCaseStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'OVERDUE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('REQUIRED', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('COO', 'COA', 'PHYTO', 'PACKING_LIST', 'BILL_OF_LADING', 'FUMIGATION_CERT', 'WEIGHT_CERT', 'QUALITY_CERT', 'INSURANCE_CERT', 'COMMERCIAL_INVOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentReviewAction" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('PASS', 'FAIL', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('DOCUMENT', 'QUALITY', 'LOGISTICS', 'COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageVisibility" AS ENUM ('INTERNAL', 'SHARED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RFQ_SUBMITTED', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'DOCUMENT_UPLOADED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'INSPECTION_RECORDED', 'MILESTONE_UPDATED', 'MILESTONE_OVERDUE', 'ISSUE_CREATED', 'CLOSEOUT_READY', 'GENERAL');

-- CreateEnum
CREATE TYPE "CloseoutPackStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "hashed_password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "registration_number" TEXT,
    "type" TEXT NOT NULL,
    "verification_status" "OrganizationVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verification_level" "OrganizationVerificationLevel" NOT NULL DEFAULT 'NONE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfqs" (
    "id" TEXT NOT NULL,
    "buyer_organization_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
    "commodity" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "incoterm" TEXT,
    "timeline" TEXT,
    "notes" TEXT,
    "ai_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_attachments" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "service_fee_amount" DOUBLE PRECISION NOT NULL,
    "broker_commission_amount" DOUBLE PRECISION,
    "lead_time_days" INTEGER NOT NULL,
    "qc_plan" TEXT NOT NULL,
    "doc_plan" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_cases" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "buyer_organization_id" TEXT NOT NULL,
    "assigned_ops_user_id" TEXT,
    "status" "TradeCaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "reference_code" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "route_summary" TEXT,
    "expected_ship_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "supplier_organization_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "grade" TEXT,
    "batch_number" TEXT,
    "available_quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "storage_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_allocations" (
    "id" TEXT NOT NULL,
    "trade_case_id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "supplier_organization_id" TEXT NOT NULL,
    "quantity_allocated" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lot_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "trade_case_id" TEXT NOT NULL,
    "template_key" TEXT,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "owner_user_id" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "blocked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "trade_case_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'REQUIRED',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "file_key" TEXT,
    "original_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "issued_by" TEXT,
    "issued_at" TIMESTAMP(3),
    "uploaded_by_user_id" TEXT,
    "uploaded_by_organization_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_reviews" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "reviewed_by_user_id" TEXT NOT NULL,
    "action" "DocumentReviewAction" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "trade_case_id" TEXT NOT NULL,
    "lot_id" TEXT,
    "provider" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "result" "InspectionResult",
    "notes" TEXT,
    "attachments_json" JSONB,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "trade_case_id" TEXT NOT NULL,
    "type" "IssueType" NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "resolution_notes" TEXT,
    "owner_user_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "trade_case_id" TEXT,
    "rfq_id" TEXT,
    "author_user_id" TEXT NOT NULL,
    "visibility" "MessageVisibility" NOT NULL DEFAULT 'SHARED',
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "trade_case_id" TEXT,
    "rfq_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload_json" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_organization_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "trade_case_id" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closeout_packs" (
    "id" TEXT NOT NULL,
    "trade_case_id" TEXT NOT NULL,
    "status" "CloseoutPackStatus" NOT NULL DEFAULT 'GENERATING',
    "file_key" TEXT,
    "summary_file_key" TEXT,
    "generated_by_user_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "closeout_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "trade_case_id" TEXT,
    "rfq_id" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER,
    "cost_estimate" DOUBLE PRECISION,
    "status" "AiRunStatus" NOT NULL DEFAULT 'PENDING',
    "error_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "memberships_user_id_status_idx" ON "memberships"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_organization_id_key" ON "memberships"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "rfqs_buyer_organization_id_status_created_at_idx" ON "rfqs"("buyer_organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "rfqs_created_by_user_id_created_at_idx" ON "rfqs"("created_by_user_id", "created_at");

-- CreateIndex
CREATE INDEX "quotes_rfq_id_created_at_idx" ON "quotes"("rfq_id", "created_at");

-- CreateIndex
CREATE INDEX "quotes_status_expires_at_idx" ON "quotes"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "trade_cases_quote_id_key" ON "trade_cases"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_cases_reference_code_key" ON "trade_cases"("reference_code");

-- CreateIndex
CREATE INDEX "trade_cases_buyer_organization_id_status_created_at_idx" ON "trade_cases"("buyer_organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "trade_cases_assigned_ops_user_id_status_updated_at_idx" ON "trade_cases"("assigned_ops_user_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "lots_supplier_organization_id_commodity_created_at_idx" ON "lots"("supplier_organization_id", "commodity", "created_at");

-- CreateIndex
CREATE INDEX "lot_allocations_supplier_organization_id_idx" ON "lot_allocations"("supplier_organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "lot_allocations_trade_case_id_lot_id_key" ON "lot_allocations"("trade_case_id", "lot_id");

-- CreateIndex
CREATE INDEX "milestones_status_due_date_idx" ON "milestones"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_trade_case_id_sequence_key" ON "milestones"("trade_case_id", "sequence");

-- CreateIndex
CREATE INDEX "documents_trade_case_id_document_type_status_idx" ON "documents"("trade_case_id", "document_type", "status");

-- CreateIndex
CREATE INDEX "documents_status_updated_at_idx" ON "documents"("status", "updated_at");

-- CreateIndex
CREATE INDEX "document_reviews_document_id_created_at_idx" ON "document_reviews"("document_id", "created_at");

-- CreateIndex
CREATE INDEX "inspections_trade_case_id_completed_at_idx" ON "inspections"("trade_case_id", "completed_at");

-- CreateIndex
CREATE INDEX "inspections_result_completed_at_idx" ON "inspections"("result", "completed_at");

-- CreateIndex
CREATE INDEX "issues_trade_case_id_status_created_at_idx" ON "issues"("trade_case_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "issues_owner_user_id_status_idx" ON "issues"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_read_at_created_at_idx" ON "notifications"("recipient_user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_created_at_idx" ON "audit_events"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_trade_case_id_created_at_idx" ON "audit_events"("trade_case_id", "created_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyer_organization_id_fkey" FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_attachments" ADD CONSTRAINT "rfq_attachments_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_attachments" ADD CONSTRAINT "rfq_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_cases" ADD CONSTRAINT "trade_cases_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_cases" ADD CONSTRAINT "trade_cases_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_cases" ADD CONSTRAINT "trade_cases_buyer_organization_id_fkey" FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_cases" ADD CONSTRAINT "trade_cases_assigned_ops_user_id_fkey" FOREIGN KEY ("assigned_ops_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_supplier_organization_id_fkey" FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_allocations" ADD CONSTRAINT "lot_allocations_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_allocations" ADD CONSTRAINT "lot_allocations_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_allocations" ADD CONSTRAINT "lot_allocations_supplier_organization_id_fkey" FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_organization_id_fkey" FOREIGN KEY ("uploaded_by_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_organization_id_fkey" FOREIGN KEY ("actor_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closeout_packs" ADD CONSTRAINT "closeout_packs_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closeout_packs" ADD CONSTRAINT "closeout_packs_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_trade_case_id_fkey" FOREIGN KEY ("trade_case_id") REFERENCES "trade_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
