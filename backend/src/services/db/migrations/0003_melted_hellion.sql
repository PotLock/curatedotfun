CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_provider_id" text NOT NULL,
	"near_account_id" text,
	"near_public_key" text NOT NULL,
	"username" text,
	"email" text,
	"metadata" jsonb,
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_auth_provider_id_unique" UNIQUE("auth_provider_id"),
	CONSTRAINT "users_near_account_id_unique" UNIQUE("near_account_id"),
	CONSTRAINT "users_near_public_key_unique" UNIQUE("near_public_key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_provider_id_idx" ON "users" USING btree ("auth_provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_near_account_id_idx" ON "users" USING btree ("near_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_near_public_key_idx" ON "users" USING btree ("near_public_key");--> statement-breakpoint
CREATE INDEX "metadata_type_idx" ON "users" USING btree (("metadata" ->> 'type'));