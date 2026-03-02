import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";

export const REALTIME_CHANGE_EVENT = "domain:changed";
export const REALTIME_READY_EVENT = "realtime:ready";
export const REALTIME_SUBSCRIBED_EVENT = "realtime:subscribed";
export const REALTIME_UNSUBSCRIBED_EVENT = "realtime:unsubscribed";
export const REALTIME_GLOBAL_ROOM = "scope:global";

export type RealtimeScope = {
  projetoId?: number | null;
  formId?: number | null;
  formVersionId?: number | null;
};

export type RealtimeChangePayload = RealtimeScope & {
  action: "created" | "updated" | "deleted";
  entity: "form" | "formVersion" | "formField" | "formResponse";
  entityId: number;
  occurredAt: string;
};

type EmitOptions = {
  additionalScopes?: RealtimeScope[];
};

export function buildRealtimeRooms(scope: RealtimeScope): string[] {
  const rooms = new Set<string>();

  if (typeof scope.projetoId === "number") {
    rooms.add(`projeto:${scope.projetoId}`);
  }

  if (typeof scope.formId === "number") {
    rooms.add(`form:${scope.formId}`);
  }

  if (typeof scope.formVersionId === "number") {
    rooms.add(`form-version:${scope.formVersionId}`);
  }

  return [...rooms];
}

class RealtimeGateway {
  private io?: Server;

  initialize(server: HttpServer) {
    if (this.io) {
      return this.io;
    }

    this.io = new Server(server, {
      cors: {
        origin: true,
        credentials: true,
      },
    });

    this.io.on("connection", (socket) => {
      this.attachSocket(socket);
    });

    return this.io;
  }

  emitChange(payload: RealtimeChangePayload, options?: EmitOptions) {
    if (!this.io) {
      return;
    }

    const rooms = new Set<string>([
      REALTIME_GLOBAL_ROOM,
      ...buildRealtimeRooms(payload),
    ]);

    for (const scope of options?.additionalScopes ?? []) {
      for (const room of buildRealtimeRooms(scope)) {
        rooms.add(room);
      }
    }

    const [firstRoom, ...remainingRooms] = [...rooms];

    if (!firstRoom) {
      this.io.emit(REALTIME_CHANGE_EVENT, payload);
      return;
    }

    let emitter = this.io.to(firstRoom);
    for (const room of remainingRooms) {
      emitter = emitter.to(room);
    }

    emitter.emit(REALTIME_CHANGE_EVENT, payload);
  }

  private attachSocket(socket: Socket) {
    socket.join(REALTIME_GLOBAL_ROOM);
    socket.emit(REALTIME_READY_EVENT, {
      event: REALTIME_CHANGE_EVENT,
      rooms: [REALTIME_GLOBAL_ROOM],
    });

    socket.on("subscribe", (scope: RealtimeScope = {}) => {
      const rooms = buildRealtimeRooms(scope);
      if (!rooms.length) {
        return;
      }

      socket.join(rooms);
      socket.emit(REALTIME_SUBSCRIBED_EVENT, { rooms });
    });

    socket.on("unsubscribe", (scope: RealtimeScope = {}) => {
      const rooms = buildRealtimeRooms(scope);
      if (!rooms.length) {
        return;
      }

      for (const room of rooms) {
        socket.leave(room);
      }
      socket.emit(REALTIME_UNSUBSCRIBED_EVENT, { rooms });
    });
  }
}

export const realtimeGateway = new RealtimeGateway();
