import * as chatService from "./chat.js";

import { SOCKET_EVENTS } from "../../events.js";

export default function registerWatchChatHandler(io, socket) {
  socket.on(SOCKET_EVENTS.WATCH_CHAT_SEND, (payload) =>
    chatService.send(io, socket, payload),
  );

  socket.on(SOCKET_EVENTS.WATCH_TYPING, (payload) =>
    chatService.typing(io, socket, payload),
  );

  socket.on(SOCKET_EVENTS.WATCH_STOP_TYPING, (payload) =>
    chatService.stopTyping(io, socket, payload),
  );
}
