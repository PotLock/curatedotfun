ALTER TABLE "submissions" ALTER COLUMN "submitted_at" SET DATA TYPE timestamp USING "submitted_at"::timestamp without time zone;
