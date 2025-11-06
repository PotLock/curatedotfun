DROP INDEX "metadata_type_idx";--> statement-breakpoint
DROP INDEX "platform_identities_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_image" text;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "data";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "platform_identities";