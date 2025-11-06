ALTER TABLE "users" ALTER COLUMN "near_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "near_public_key" DROP NOT NULL;