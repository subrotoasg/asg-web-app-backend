import { adminRoom } from "./room.js";

export default function registerWatchAdmin(io, socket) {
  if (socket.user?.role !== "superAdmin") {
    return;
  }
  socket.join(adminRoom());
}
