import { SOCKET_EVENTS } from "../../events.js";

export function adminRoom() {
  return SOCKET_EVENTS.SUPERADMIN_WATCH_ROOM;
}
