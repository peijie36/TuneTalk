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

export const roomMemberRole = pgEnum("room_member_role", ["host", "member"]);

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
    spotifyTrackId: text("spotify_track_id").notNull(),
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
