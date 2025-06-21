CREATE TABLE "auth_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"state" text,
	"account_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "auth_requests_nonce_unique" UNIQUE("nonce"),
	CONSTRAINT "auth_requests_state_unique" UNIQUE("state")
);
--> statement-breakpoint
CREATE INDEX "auth_requests_account_id_created_at_idx" ON "auth_requests" USING btree ("account_id","created_at");