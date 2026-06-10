ALTER TABLE "motions" ADD COLUMN IF NOT EXISTS "current_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "motion_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motion_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body_html" text NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "motion_working_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motion_id" uuid NOT NULL,
	"base_version" integer NOT NULL,
	"doc_json" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "motion_working_docs_motion_id_unique" UNIQUE("motion_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "motion_versions" ADD CONSTRAINT "motion_versions_motion_id_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."motions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "motion_versions" ADD CONSTRAINT "motion_versions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "motion_working_docs" ADD CONSTRAINT "motion_working_docs_motion_id_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."motions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "motion_versions_motion_number_idx" ON "motion_versions" USING btree ("motion_id","version_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "motion_versions_motion_idx" ON "motion_versions" USING btree ("motion_id");
