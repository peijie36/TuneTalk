import { z } from "zod";

export const trackProviderSchema = z.enum(["audius"]);

export const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Room name must be at least 3 characters.")
    .max(60, "Room name must be at most 60 characters."),
  isPublic: z.boolean().default(true),
  password: z.string().trim().min(8).max(128).optional(),
});

export const joinRoomSchema = z.object({
  password: z.string().trim().min(8).max(128).optional(),
});

export const addQueueItemSchema = z.object({
  provider: trackProviderSchema,
  providerTrackId: z.string().trim().min(1).max(128),
  title: z.string().trim().max(300).nullable().optional(),
  artistName: z.string().trim().max(300).nullable().optional(),
  artworkUrl: z.string().trim().url().max(2048).nullable().optional(),
  durationSec: z.number().int().positive().max(86_400).nullable().optional(),
});

export const updatePlaybackSchema = z.object({
  queueItemId: z.string().trim().min(1).max(128).nullable().optional(),
  provider: trackProviderSchema.nullable().optional(),
  providerTrackId: z.string().trim().min(1).max(128).nullable().optional(),
  positionSec: z.number().min(0).max(86_400).optional(),
  isPaused: z.boolean().optional(),
});
