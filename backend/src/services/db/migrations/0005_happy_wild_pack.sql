CREATE TABLE "connected_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform" text NOT NULL,
	"platform_user_id" text NOT NULL,
	"auth_provider_id" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"data" jsonb,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "platform_user_id" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_platform_user_id_unique_idx" ON "connected_accounts" USING btree ("platform","platform_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_id_platform_unique_idx" ON "connected_accounts" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "ca_user_id_idx" ON "connected_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ca_platform_user_id_idx" ON "connected_accounts" USING btree ("platform_user_id");--> statement-breakpoint
CREATE INDEX "submissions_platform_user_id_idx" ON "submissions" USING btree ("platform","platform_user_id");
