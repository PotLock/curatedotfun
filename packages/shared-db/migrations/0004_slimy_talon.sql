CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"feed_id" text,
	"submission_id" text,
	"data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feed_user_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"feed_id" text NOT NULL,
	"submissions_count" integer DEFAULT 0 NOT NULL,
	"approvals_count" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"curator_rank" integer,
	"approver_rank" integer,
	"data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"total_submissions" integer DEFAULT 0 NOT NULL,
	"total_approvals" integer DEFAULT 0 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_submission_id_submissions_tweet_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("tweet_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_user_stats" ADD CONSTRAINT "feed_user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_user_stats" ADD CONSTRAINT "feed_user_stats_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_user_id_idx" ON "activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activities_type_idx" ON "activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "activities_timestamp_idx" ON "activities" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "activities_feed_id_idx" ON "activities" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "activities_submission_id_idx" ON "activities" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "activities_metadata_type_idx" ON "activities" USING btree (("metadata" ->> 'type'));--> statement-breakpoint
CREATE INDEX "feed_user_stats_user_feed_idx" ON "feed_user_stats" USING btree ("user_id","feed_id");--> statement-breakpoint
CREATE INDEX "feed_user_stats_curator_rank_idx" ON "feed_user_stats" USING btree ("feed_id","curator_rank");--> statement-breakpoint
CREATE INDEX "feed_user_stats_approver_rank_idx" ON "feed_user_stats" USING btree ("feed_id","approver_rank");