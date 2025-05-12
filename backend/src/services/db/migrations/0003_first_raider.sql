CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"sub_id" text NOT NULL,
	"near_account_id" text,
	"near_public_key" text NOT NULL,
	"username" text,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_sub_id_unique" UNIQUE("sub_id"),
	CONSTRAINT "users_near_account_id_unique" UNIQUE("near_account_id"),
	CONSTRAINT "users_near_public_key_unique" UNIQUE("near_public_key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_sub_id_idx" ON "users" USING btree ("sub_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_near_account_id_idx" ON "users" USING btree ("near_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_near_public_key_idx" ON "users" USING btree ("near_public_key");