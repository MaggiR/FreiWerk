DO $$ BEGIN
 CREATE TYPE "public"."mood_choice" AS ENUM('approve', 'reject', 'abstain', 'undecided');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."motion_status" AS ENUM('draft', 'debate', 'ballot', 'decided');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('member', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"fn" text,
	"division_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "motions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body_html" text NOT NULL,
	"status" "motion_status" DEFAULT 'draft' NOT NULL,
	"topic" text NOT NULL,
	"division_id" uuid,
	"debate_ends_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"current_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "motion_watches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motion_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body_html" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mood_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"choice" "mood_choice" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mood_vote_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"choice" "mood_choice" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
 ALTER TABLE "users" ADD CONSTRAINT "users_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "motions" ADD CONSTRAINT "motions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "motions" ADD CONSTRAINT "motions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "motion_watches" ADD CONSTRAINT "motion_watches_motion_id_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."motions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "motion_watches" ADD CONSTRAINT "motion_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_motion_id_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."motions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mood_votes" ADD CONSTRAINT "mood_votes_motion_id_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."motions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mood_votes" ADD CONSTRAINT "mood_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mood_vote_events" ADD CONSTRAINT "mood_vote_events_motion_id_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."motions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mood_vote_events" ADD CONSTRAINT "mood_vote_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "motions_status_idx" ON "motions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "motions_author_idx" ON "motions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "motions_topic_idx" ON "motions" USING btree ("topic");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "motion_watches_motion_user_idx" ON "motion_watches" USING btree ("motion_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "motion_watches_user_idx" ON "motion_watches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_motion_idx" ON "posts" USING btree ("motion_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mood_votes_motion_user_idx" ON "mood_votes" USING btree ("motion_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mood_vote_events_motion_idx" ON "mood_vote_events" USING btree ("motion_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "motion_versions_motion_number_idx" ON "motion_versions" USING btree ("motion_id","version_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "motion_versions_motion_idx" ON "motion_versions" USING btree ("motion_id");
