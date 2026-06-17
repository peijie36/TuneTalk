import argon2 from "argon2";

import {
  deleteRoomMembership,
  joinRoomIfCapacityAvailable,
} from "@/src/repositories/memberships";
import {
  createRoomWithHostMembership,
  deleteRoom,
  findRoomAccessById,
  findRoomJoinById,
} from "@/src/repositories/rooms";

export async function createRoomForUser(input: {
  userId: string;
  name: string;
  isPublic: boolean;
  password?: string;
}) {
  const roomId = `room_${crypto.randomUUID()}`;
  const passwordHash =
    input.isPublic || !input.password
      ? null
      : await argon2.hash(input.password, { type: argon2.argon2id });

  await createRoomWithHostMembership({
    id: roomId,
    userId: input.userId,
    name: input.name,
    isPublic: input.isPublic,
    passwordHash,
  });

  return { id: roomId };
}

export async function joinRoomForUser(input: {
  roomId: string;
  userId: string;
  password?: string;
}): Promise<
  | { ok: true }
  | { ok: false; error: string; status: 400 | 403 | 404 | 409 | 500 }
> {
  const room = await findRoomJoinById(input.roomId);
  if (!room) {
    return { ok: false as const, error: "Room not found", status: 404 };
  }

  if (!room.isPublic) {
    if (!input.password) {
      return {
        ok: false as const,
        error: "Password is required.",
        status: 400,
      };
    }

    if (!room.passwordHash) {
      return {
        ok: false as const,
        error: "Room password is not configured.",
        status: 500,
      };
    }

    const passwordValid = await argon2.verify(
      room.passwordHash,
      input.password
    );
    if (!passwordValid) {
      return {
        ok: false as const,
        error: "Incorrect password.",
        status: 403,
      };
    }
  }

  return joinRoomIfCapacityAvailable({
    roomId: input.roomId,
    userId: input.userId,
  });
}

export async function leaveRoomForUser(input: {
  roomId: string;
  userId: string;
}) {
  const room = await findRoomAccessById(input.roomId);
  if (!room) return null;

  const isHost = room.createdByUserId === input.userId;
  if (isHost) {
    await deleteRoom(input.roomId);
    return { disbanded: true as const };
  }

  await deleteRoomMembership(input);

  return { left: true as const };
}
