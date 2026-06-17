import type { createNodeWebSocket } from "@hono/node-ws";
import type { Hono } from "hono";

import type { HonoAuthVariables } from "@/src/lib/hono-types";
import {
  addRoomConnection,
  handleRoomMessage,
  removeRoomConnection,
} from "@/src/lib/room-realtime";
import {
  authorizeRoomRealtimeConnection,
  getRoomRealtimeBootstrap,
} from "@/src/services/rooms/realtime";

export function registerRoomWebSocketRoute(
  app: Hono<HonoAuthVariables>,
  nodeWebSocket: ReturnType<typeof createNodeWebSocket>
) {
  app.get(
    "/api/rooms/:roomId/ws",
    nodeWebSocket.upgradeWebSocket((c) => {
      const roomId = c.req.param("roomId");
      const user = c.get("user") as HonoAuthVariables["Variables"]["user"];

      return {
        onOpen: (_event, ws) => {
          void (async () => {
            const authorized = await authorizeRoomRealtimeConnection({
              roomId,
              user,
            });

            if (!authorized.ok) {
              ws.close(1008, authorized.reason);
              return;
            }

            addRoomConnection(roomId, ws, authorized.user);

            const bootstrap = await getRoomRealtimeBootstrap(roomId);
            ws.send(
              JSON.stringify({
                type: "queue_state",
                roomId,
                queue: bootstrap.queue,
              })
            );

            if (bootstrap.playback) {
              ws.send(
                JSON.stringify({
                  type: "playback_state",
                  roomId,
                  playback: bootstrap.playback,
                })
              );
            }
          })();
        },
        onMessage: (event, ws) => {
          handleRoomMessage(roomId, ws, event.data);
        },
        onClose: (_event, ws) => {
          removeRoomConnection(roomId, ws);
        },
        onError: (_event, ws) => {
          removeRoomConnection(roomId, ws);
        },
      };
    })
  );
}
