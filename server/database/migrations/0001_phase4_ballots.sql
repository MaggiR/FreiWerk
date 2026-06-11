DO $$ BEGIN
 CREATE TYPE "public"."ballot_choice" AS ENUM('approve', 'reject', 'abstain');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."motion_outcome" AS ENUM('accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "motions" ADD COLUMN IF NOT EXISTS "ballot_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "motions" ADD COLUMN IF NOT EXISTS "ballot_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "motions" ADD COLUMN IF NOT EXISTS "outcome" "motion_outcome";--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ballots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motion_id" uuid NOT NULL,
	"choice" "ballot_choice" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ballot_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ballots" ADD CONSTRAINT "ballots_motion_id_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."motions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ballot_participants" ADD CONSTRAINT "ballot_participants_motion_id_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."motions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ballot_participants" ADD CONSTRAINT "ballot_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ballots_motion_idx" ON "ballots" USING btree ("motion_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ballot_participants_motion_user_idx" ON "ballot_participants" USING btree ("motion_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ballot_participants_user_idx" ON "ballot_participants" USING btree ("user_id");
