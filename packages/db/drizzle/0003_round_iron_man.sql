ALTER TABLE "room_message" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "room_message" ALTER COLUMN "created_at" SET DEFAULT now();
