import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const ROOM_MEMBER_ROLES = ["host", "member"] as const;
export const roomMemberRole = pgEnum("room_member_role", ROOM_MEMBER_ROLES);

export const TRACK_PROVIDERS = ["audius"] as const;
export const trackProvider = pgEnum("track_provider", TRACK_PROVIDERS);

export const room = pgTable(
  "room",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    passwordHash: text("password_hash"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("room_isPublic_idx").on(table.isPublic),
    index("room_createdByUserId_idx").on(table.createdByUserId),
  ]
);

export type RoomRow = typeof room.$inferSelect;
export type RoomInsert = typeof room.$inferInsert;

export const roomMember = pgTable(
  "room_member",
  {
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: roomMemberRole("role").default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.userId] }),
    index("room_member_roomId_idx").on(table.roomId),
    index("room_member_userId_idx").on(table.userId),
  ]
);

export const roomQueueItem = pgTable(
  "room_queue_item",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    provider: trackProvider("provider").default("audius").notNull(),
    providerTrackId: text("provider_track_id").notNull(),
    title: text("title"),
    artistName: text("artist_name"),
    artworkUrl: text("artwork_url"),
    durationSec: integer("duration_sec"),
    position: integer("position").notNull(),
    addedByUserId: text("added_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("room_queue_item_roomId_position_unique").on(
      table.roomId,
      table.position
    ),
    index("room_queue_item_roomId_idx").on(table.roomId),
  ]
);

export const roomPlaybackState = pgTable(
  "room_playback_state",
  {
    roomId: text("room_id")
      .primaryKey()
      .references(() => room.id, { onDelete: "cascade" }),
    queueItemId: text("queue_item_id").references(() => roomQueueItem.id, {
      onDelete: "set null",
    }),
    provider: trackProvider("provider"),
    providerTrackId: text("provider_track_id"),
    positionSec: integer("position_sec").default(0).notNull(),
    isPaused: boolean("is_paused").default(true).notNull(),
    controlledByUserId: text("controlled_by_user_id").references(
      () => user.id,
      {
        onDelete: "set null",
      }
    ),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("room_playback_state_queue_item_id_idx").on(table.queueItemId),
    index("room_playback_state_controlled_by_user_id_idx").on(
      table.controlledByUserId
    ),
  ]
);

export const roomMessage = pgTable(
  "room_message",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("room_message_roomId_createdAt_idx").on(
      table.roomId,
      table.createdAt
    ),
    index("room_message_userId_idx").on(table.userId),
  ]
);

export const roomRelations = relations(room, ({ many, one }) => ({
  createdByUser: one(user, {
    fields: [room.createdByUserId],
    references: [user.id],
  }),
  members: many(roomMember),
  queue: many(roomQueueItem),
  messages: many(roomMessage),
  playbackState: one(roomPlaybackState),
}));

export const roomMemberRelations = relations(roomMember, ({ one }) => ({
  room: one(room, {
    fields: [roomMember.roomId],
    references: [room.id],
  }),
  user: one(user, {
    fields: [roomMember.userId],
    references: [user.id],
  }),
}));

export const roomQueueItemRelations = relations(roomQueueItem, ({ one }) => ({
  room: one(room, {
    fields: [roomQueueItem.roomId],
    references: [room.id],
  }),
  addedByUser: one(user, {
    fields: [roomQueueItem.addedByUserId],
    references: [user.id],
  }),
}));

export const roomPlaybackStateRelations = relations(
  roomPlaybackState,
  ({ one }) => ({
    room: one(room, {
      fields: [roomPlaybackState.roomId],
      references: [room.id],
    }),
    queueItem: one(roomQueueItem, {
      fields: [roomPlaybackState.queueItemId],
      references: [roomQueueItem.id],
    }),
    controlledByUser: one(user, {
      fields: [roomPlaybackState.controlledByUserId],
      references: [user.id],
    }),
  })
);

export const roomMessageRelations = relations(roomMessage, ({ one }) => ({
  room: one(room, {
    fields: [roomMessage.roomId],
    references: [room.id],
  }),
  user: one(user, {
    fields: [roomMessage.userId],
    references: [user.id],
  }),
}));
