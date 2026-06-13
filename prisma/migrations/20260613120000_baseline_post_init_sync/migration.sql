-- Baseline sync: сводит дрейф после init-миграции в одну миграцию.
-- Содержит весь функционал, добавленный через db push (scope, счета, семьи,
-- долги, refresh-токены, audit log и т.д.). На свежей БД применяется поверх init.
-- На dev отмечена как applied (схема уже актуальна) — данные не трогаются.

-- CreateEnum
CREATE TYPE "Scope" AS ENUM ('personal', 'family');

-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('active', 'used', 'revoked');

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_family_id_fkey";

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_user_id_fkey";

-- DropForeignKey
ALTER TABLE "FamilyInvite" DROP CONSTRAINT "FamilyInvite_created_by_fkey";

-- DropForeignKey
ALTER TABLE "FamilyInvite" DROP CONSTRAINT "FamilyInvite_family_id_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_family_id_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GoalContribution" DROP CONSTRAINT "GoalContribution_goal_id_fkey";

-- DropForeignKey
ALTER TABLE "GoalContribution" DROP CONSTRAINT "GoalContribution_user_id_fkey";

-- DropForeignKey
ALTER TABLE "RecurringTransaction" DROP CONSTRAINT "RecurringTransaction_family_id_fkey";

-- DropForeignKey
ALTER TABLE "RecurringTransaction" DROP CONSTRAINT "RecurringTransaction_user_id_fkey";

-- DropForeignKey
ALTER TABLE "SafetyPillowHistory" DROP CONSTRAINT "SafetyPillowHistory_user_id_fkey";

-- DropForeignKey
ALTER TABLE "SafetyPillowSetting" DROP CONSTRAINT "SafetyPillowSetting_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_family_id_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Wish" DROP CONSTRAINT "Wish_family_id_fkey";

-- DropForeignKey
ALTER TABLE "Wish" DROP CONSTRAINT "Wish_user_id_fkey";

-- DropForeignKey
ALTER TABLE "WishContribution" DROP CONSTRAINT "WishContribution_user_id_fkey";

-- DropForeignKey
ALTER TABLE "WishContribution" DROP CONSTRAINT "WishContribution_wish_id_fkey";

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "limit",
ADD COLUMN     "limit_amount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "scope" "Scope" NOT NULL DEFAULT 'personal',
ADD COLUMN     "type" "BudgetType" NOT NULL DEFAULT 'expense';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "scope" "Scope";

-- AlterTable
ALTER TABLE "FamilyInvite" ADD COLUMN     "status" "InviteStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "used_at" TIMESTAMP(3),
ADD COLUMN     "used_by" INTEGER;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "interest_rate" DECIMAL(5,2),
ADD COLUMN     "scope" "Scope" NOT NULL DEFAULT 'personal';

-- AlterTable
ALTER TABLE "RecurringTransaction" DROP COLUMN "is_private",
ADD COLUMN     "account_id" INTEGER,
ADD COLUMN     "debt_id" INTEGER,
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "goal_id" INTEGER,
ADD COLUMN     "scope" "Scope" NOT NULL DEFAULT 'personal',
ADD COLUMN     "skip_next" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SafetyPillowHistory" ADD COLUMN     "family_id" INTEGER,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SafetyPillowSetting" ADD COLUMN     "family_id" INTEGER,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "is_private",
ADD COLUMN     "account_id" INTEGER,
ADD COLUMN     "scope" "Scope" NOT NULL DEFAULT 'personal';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Wish" DROP COLUMN "is_private",
ADD COLUMN     "scope" "Scope" NOT NULL DEFAULT 'personal';

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "family_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "family_id" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'bank',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_liquid" BOOLEAN NOT NULL DEFAULT true,
    "scope" "Scope" NOT NULL DEFAULT 'personal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyPillowSnapshot" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "family_id" INTEGER,
    "total_income" DECIMAL(12,2) NOT NULL,
    "total_expenses" DECIMAL(12,2) NOT NULL,
    "safety_pillow" DECIMAL(12,2) NOT NULL,
    "monthly_limit" DECIMAL(12,2) NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyPillowSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "rotated_at" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER,
    "changes" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "family_id" INTEGER,
    "name" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "remaining" DECIMAL(12,2) NOT NULL,
    "interest_rate" DECIMAL(5,2),
    "monthly_payment" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'credit',
    "debt_type" TEXT NOT NULL DEFAULT 'loan',
    "scope" "Scope" NOT NULL DEFAULT 'personal',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedJob" (
    "id" SERIAL NOT NULL,
    "job_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_attempt_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWidgetConfig" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "personal_widgets" JSONB NOT NULL,
    "family_widgets" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWidgetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilySettings" (
    "id" SERIAL NOT NULL,
    "family_id" INTEGER NOT NULL,
    "show_personal_in_stats" BOOLEAN NOT NULL DEFAULT false,
    "safety_pillow_months" INTEGER NOT NULL DEFAULT 3,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_user_id_family_id_key" ON "FamilyMember"("user_id", "family_id");

-- CreateIndex
CREATE INDEX "Account_user_id_is_active_idx" ON "Account"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "Account_family_id_is_active_idx" ON "Account"("family_id", "is_active");

-- CreateIndex
CREATE INDEX "SafetyPillowSnapshot_user_id_calculated_at_idx" ON "SafetyPillowSnapshot"("user_id", "calculated_at");

-- CreateIndex
CREATE INDEX "SafetyPillowSnapshot_family_id_calculated_at_idx" ON "SafetyPillowSnapshot"("family_id", "calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken"("user_id");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");

-- CreateIndex
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- CreateIndex
CREATE INDEX "Debt_user_id_is_active_idx" ON "Debt"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "Debt_family_id_is_active_idx" ON "Debt"("family_id", "is_active");

-- CreateIndex
CREATE INDEX "FailedJob_job_type_next_retry_at_idx" ON "FailedJob"("job_type", "next_retry_at");

-- CreateIndex
CREATE INDEX "FailedJob_completed_next_retry_at_idx" ON "FailedJob"("completed", "next_retry_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserWidgetConfig_user_id_key" ON "UserWidgetConfig"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "FamilySettings_family_id_key" ON "FamilySettings"("family_id");

-- CreateIndex
CREATE INDEX "Budget_category_id_idx" ON "Budget"("category_id");

-- CreateIndex
CREATE INDEX "Category_user_id_idx" ON "Category"("user_id");

-- CreateIndex
CREATE INDEX "Category_family_id_idx" ON "Category"("family_id");

-- CreateIndex
CREATE INDEX "FamilyInvite_family_id_idx" ON "FamilyInvite"("family_id");

-- CreateIndex
CREATE INDEX "FamilyInvite_created_by_idx" ON "FamilyInvite"("created_by");

-- CreateIndex
CREATE INDEX "FamilyInvite_used_by_idx" ON "FamilyInvite"("used_by");

-- CreateIndex
CREATE INDEX "Goal_user_id_is_archived_idx" ON "Goal"("user_id", "is_archived");

-- CreateIndex
CREATE INDEX "Goal_family_id_is_archived_idx" ON "Goal"("family_id", "is_archived");

-- CreateIndex
CREATE INDEX "Goal_category_id_idx" ON "Goal"("category_id");

-- CreateIndex
CREATE INDEX "GoalContribution_goal_id_idx" ON "GoalContribution"("goal_id");

-- CreateIndex
CREATE INDEX "GoalContribution_user_id_idx" ON "GoalContribution"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "GoalContribution_goal_id_transaction_id_key" ON "GoalContribution"("goal_id", "transaction_id");

-- CreateIndex
CREATE INDEX "Notification_user_id_read_idx" ON "Notification"("user_id", "read");

-- CreateIndex
CREATE INDEX "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_user_id_idx" ON "PasswordResetToken"("user_id");

-- CreateIndex
CREATE INDEX "RecurringTransaction_debt_id_idx" ON "RecurringTransaction"("debt_id");

-- CreateIndex
CREATE INDEX "RecurringTransaction_account_id_idx" ON "RecurringTransaction"("account_id");

-- CreateIndex
CREATE INDEX "RecurringTransaction_user_id_idx" ON "RecurringTransaction"("user_id");

-- CreateIndex
CREATE INDEX "RecurringTransaction_family_id_idx" ON "RecurringTransaction"("family_id");

-- CreateIndex
CREATE INDEX "RecurringTransaction_category_id_idx" ON "RecurringTransaction"("category_id");

-- CreateIndex
CREATE INDEX "RecurringTransaction_goal_id_idx" ON "RecurringTransaction"("goal_id");

-- CreateIndex
CREATE INDEX "SafetyPillowHistory_user_id_calculated_at_idx" ON "SafetyPillowHistory"("user_id", "calculated_at");

-- CreateIndex
CREATE INDEX "SafetyPillowHistory_family_id_calculated_at_idx" ON "SafetyPillowHistory"("family_id", "calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyPillowSetting_family_id_key" ON "SafetyPillowSetting"("family_id");

-- CreateIndex
CREATE INDEX "Transaction_user_id_type_date_idx" ON "Transaction"("user_id", "type", "date");

-- CreateIndex
CREATE INDEX "Transaction_family_id_type_date_idx" ON "Transaction"("family_id", "type", "date");

-- CreateIndex
CREATE INDEX "Transaction_user_id_family_id_idx" ON "Transaction"("user_id", "family_id");

-- CreateIndex
CREATE INDEX "Transaction_category_id_type_idx" ON "Transaction"("category_id", "type");

-- CreateIndex
CREATE INDEX "Transaction_account_id_date_idx" ON "Transaction"("account_id", "date");

-- CreateIndex
CREATE INDEX "User_family_id_idx" ON "User"("family_id");

-- CreateIndex
CREATE INDEX "Wish_user_id_archived_idx" ON "Wish"("user_id", "archived");

-- CreateIndex
CREATE INDEX "Wish_family_id_archived_idx" ON "Wish"("family_id", "archived");

-- CreateIndex
CREATE INDEX "WishContribution_wish_id_idx" ON "WishContribution"("wish_id");

-- CreateIndex
CREATE INDEX "WishContribution_user_id_idx" ON "WishContribution"("user_id");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishContribution" ADD CONSTRAINT "WishContribution_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishContribution" ADD CONSTRAINT "WishContribution_wish_id_fkey" FOREIGN KEY ("wish_id") REFERENCES "Wish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wish" ADD CONSTRAINT "Wish_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wish" ADD CONSTRAINT "Wish_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyPillowSetting" ADD CONSTRAINT "SafetyPillowSetting_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyPillowSetting" ADD CONSTRAINT "SafetyPillowSetting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyPillowSnapshot" ADD CONSTRAINT "SafetyPillowSnapshot_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyPillowSnapshot" ADD CONSTRAINT "SafetyPillowSnapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyPillowHistory" ADD CONSTRAINT "SafetyPillowHistory_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyPillowHistory" ADD CONSTRAINT "SafetyPillowHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWidgetConfig" ADD CONSTRAINT "UserWidgetConfig_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilySettings" ADD CONSTRAINT "FamilySettings_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
