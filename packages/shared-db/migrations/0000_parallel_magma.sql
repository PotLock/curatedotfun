CREATE TABLE "feed_plugins" (
	"feed_id" text NOT NULL,
	"plugin_id" text NOT NULL,
	"config" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "feed_plugins_feed_id_plugin_id_pk" PRIMARY KEY("feed_id","plugin_id")
);
--> statement-breakpoint
CREATE TABLE "feeds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tweet_id" text NOT NULL,
	"feed_id" text NOT NULL,
	"admin_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "submission_counts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_reset_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "submission_feeds" (
	"submission_id" text NOT NULL,
	"feed_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderation_response_tweet_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "submission_feeds_submission_id_feed_id_pk" PRIMARY KEY("submission_id","feed_id")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"tweet_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"curator_id" text NOT NULL,
	"curator_username" text NOT NULL,
	"curator_tweet_id" text NOT NULL,
	"content" text NOT NULL,
	"curator_notes" text,
	"submitted_at" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "twitter_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "twitter_cookies" (
	"username" text PRIMARY KEY NOT NULL,
	"cookies" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "feed_plugins" ADD CONSTRAINT "feed_plugins_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_history" ADD CONSTRAINT "moderation_history_tweet_id_submissions_tweet_id_fk" FOREIGN KEY ("tweet_id") REFERENCES "public"."submissions"("tweet_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_history" ADD CONSTRAINT "moderation_history_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_feeds" ADD CONSTRAINT "submission_feeds_submission_id_submissions_tweet_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("tweet_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_feeds" ADD CONSTRAINT "submission_feeds_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_plugins_feed_idx" ON "feed_plugins" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "feed_plugins_plugin_idx" ON "feed_plugins" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "moderation_history_tweet_idx" ON "moderation_history" USING btree ("tweet_id");--> statement-breakpoint
CREATE INDEX "moderation_history_admin_idx" ON "moderation_history" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "moderation_history_feed_idx" ON "moderation_history" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "submission_counts_date_idx" ON "submission_counts" USING btree ("last_reset_date");--> statement-breakpoint
CREATE INDEX "submission_feeds_feed_idx" ON "submission_feeds" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "submissions_user_id_idx" ON "submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_submitted_at_idx" ON "submissions" USING btree ("submitted_at");