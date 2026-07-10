CREATE TYPE "public"."family_invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."family_activity_action" AS ENUM('family_created', 'family_updated', 'member_invited', 'member_joined', 'member_removed', 'member_left', 'member_role_changed', 'invite_revoked', 'invite_resent');--> statement-breakpoint
CREATE TABLE "family_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "family_member_role" DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"status" "family_invite_status" DEFAULT 'pending' NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" "family_activity_action" NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "family_id" uuid;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_activity_log" ADD CONSTRAINT "family_activity_log_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_activity_log" ADD CONSTRAINT "family_activity_log_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "family_invites_family_id_idx" ON "family_invites" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "family_invites_token_idx" ON "family_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "family_invites_email_idx" ON "family_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "family_invites_family_id_status_idx" ON "family_invites" USING btree ("family_id","status");--> statement-breakpoint
CREATE INDEX "family_activity_log_family_id_created_at_idx" ON "family_activity_log" USING btree ("family_id","created_at");--> statement-breakpoint
CREATE INDEX "family_activity_log_family_id_idx" ON "family_activity_log" USING btree ("family_id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_family_id_idx" ON "accounts" USING btree ("family_id");