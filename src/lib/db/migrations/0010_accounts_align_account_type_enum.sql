ALTER TABLE "public"."accounts" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
-- Backfill legacy account_type values (from the old 'cash' | 'bank' | 'wallet' |
-- 'credit_card' | 'loan' | 'others' set) onto the canonical, richer app-facing
-- set before the column is narrowed back to an enum. 'bank' rows are split into
-- 'checking' vs 'savings' using a best-effort name heuristic since the legacy
-- schema didn't distinguish them; review/reclassify manually if this guess is wrong.
UPDATE "public"."accounts" SET "type" = CASE
  WHEN "type" = 'bank' AND "name" ILIKE '%saving%' THEN 'savings'
  WHEN "type" = 'bank' THEN 'checking'
  WHEN "type" = 'wallet' THEN 'other'
  WHEN "type" = 'others' THEN 'other'
  ELSE "type"
END
WHERE "type" IN ('bank', 'wallet', 'others');--> statement-breakpoint
DROP TYPE "public"."account_type";--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('checking', 'savings', 'credit_card', 'cash', 'investment', 'loan', 'other');--> statement-breakpoint
ALTER TABLE "public"."accounts" ALTER COLUMN "type" SET DATA TYPE "public"."account_type" USING "type"::"public"."account_type";