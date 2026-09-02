import { SOCKET_EVENTS } from "../../events.js";
import { adminRoom } from "./room.js";

export function emitAdminChat(io, message) {
  io.to(adminRoom()).emit(SOCKET_EVENTS.WATCH_SUPER_ADMIN_CHAT, message);
}
