CREATE TYPE "public"."room_member_role" AS ENUM('host', 'member');--> statement-breakpoint
CREATE TABLE "room" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"password_hash" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_member" (
	"room_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "room_member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "room_member_room_id_user_id_pk" PRIMARY KEY("room_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "room_queue_item" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"spotify_track_id" text NOT NULL,
	"position" integer NOT NULL,
	"added_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_member" ADD CONSTRAINT "room_member_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_member" ADD CONSTRAINT "room_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue_item" ADD CONSTRAINT "room_queue_item_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue_item" ADD CONSTRAINT "room_queue_item_added_by_user_id_user_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_isPublic_idx" ON "room" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "room_createdByUserId_idx" ON "room" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "room_member_roomId_idx" ON "room_member" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "room_member_userId_idx" ON "room_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_queue_item_roomId_position_unique" ON "room_queue_item" USING btree ("room_id","position");--> statement-breakpoint
CREATE INDEX "room_queue_item_roomId_idx" ON "room_queue_item" USING btree ("room_id");