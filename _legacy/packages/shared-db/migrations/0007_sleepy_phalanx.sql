ALTER TABLE "plugins" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "plugins" ADD COLUMN "repo_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "plugins" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "plugins" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "plugins" DROP COLUMN "author";--> statement-breakpoint
ALTER TABLE "plugins" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "plugins" DROP COLUMN "icon_url";--> statement-breakpoint
ALTER TABLE "plugins" DROP COLUMN "is_public";--> statement-breakpoint
ALTER TABLE "plugins" ADD CONSTRAINT "plugins_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "plugins" ADD CONSTRAINT "plugins_repo_url_unique" UNIQUE("repo_url");