DO $$ BEGIN
 CREATE TYPE "public"."track_provider" AS ENUM('audius');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "room_queue_item" ADD COLUMN "provider" "track_provider" DEFAULT 'audius' NOT NULL;
--> statement-breakpoint
ALTER TABLE "room_queue_item" ADD COLUMN "provider_track_id" text;
--> statement-breakpoint
ALTER TABLE "room_queue_item" ADD COLUMN "title" text;
--> statement-breakpoint
ALTER TABLE "room_queue_item" ADD COLUMN "artist_name" text;
--> statement-breakpoint
ALTER TABLE "room_queue_item" ADD COLUMN "artwork_url" text;
--> statement-breakpoint
ALTER TABLE "room_queue_item" ADD COLUMN "duration_sec" integer;
--> statement-breakpoint
UPDATE "room_queue_item" SET "provider_track_id" = "spotify_track_id";
--> statement-breakpoint
ALTER TABLE "room_queue_item" ALTER COLUMN "provider_track_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "room_queue_item" DROP COLUMN "spotify_track_id";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room_playback_state" (
	"room_id" text PRIMARY KEY NOT NULL,
	"queue_item_id" text,
	"provider" "track_provider",
	"provider_track_id" text,
	"position_sec" integer DEFAULT 0 NOT NULL,
	"is_paused" boolean DEFAULT true NOT NULL,
	"controlled_by_user_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_playback_state" ADD CONSTRAINT "room_playback_state_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_playback_state" ADD CONSTRAINT "room_playback_state_queue_item_id_room_queue_item_id_fk" FOREIGN KEY ("queue_item_id") REFERENCES "public"."room_queue_item"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_playback_state" ADD CONSTRAINT "room_playback_state_controlled_by_user_id_user_id_fk" FOREIGN KEY ("controlled_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "room_playback_state_queue_item_id_idx" ON "room_playback_state" USING btree ("queue_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "room_playback_state_controlled_by_user_id_idx" ON "room_playback_state" USING btree ("controlled_by_user_id");
