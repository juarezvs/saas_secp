ALTER TABLE "overtime_request_days"
ADD COLUMN "payment_destination" "OvertimePaymentDestination" NOT NULL DEFAULT 'PECUNIA';

ALTER TABLE "overtime_requests"
DROP COLUMN IF EXISTS "expected_productivity";
