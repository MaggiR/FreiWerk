ALTER TABLE "motions" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "motion_watches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "motion_watches" ADD CONSTRAINT "motion_watches_motion_id_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."motions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "motion_watches" ADD CONSTRAINT "motion_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "motion_watches_motion_user_idx" ON "motion_watches" USING btree ("motion_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "motion_watches_user_idx" ON "motion_watches" USING btree ("user_id");
