ALTER TABLE "feeds" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "admins" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "platform_identities" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "feeds" ADD CONSTRAINT "feeds_created_by_users_near_account_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("near_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_identities_idx" ON "users" USING btree ("platform_identities");
