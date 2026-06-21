DO $$ BEGIN
 CREATE TYPE "public"."moderation_action" AS ENUM('post_removed', 'user_banned', 'user_unbanned', 'report_resolved', 'report_dismissed', 'motion_archived', 'motion_unarchived', 'ballot_finalized');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."moderation_target_type" AS ENUM('motion', 'post', 'user', 'report');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banned_by_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_banned_by_id_users_id_fk" FOREIGN KEY ("banned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" "moderation_action" NOT NULL,
	"target_type" "moderation_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_actions_actor_idx" ON "moderation_actions" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_actions_created_idx" ON "moderation_actions" USING btree ("created_at");
