CREATE TYPE "public"."plugin_type" AS ENUM('transformer', 'distributor', 'source', 'rule', 'outcome');--> statement-breakpoint
CREATE TABLE "plugins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "plugin_type" NOT NULL,
	"version" varchar(50) NOT NULL,
	"description" text,
	"author" varchar(255),
	"tags" jsonb,
	"icon_url" text,
	"entry_point" text NOT NULL,
	"schema_definition" jsonb,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
