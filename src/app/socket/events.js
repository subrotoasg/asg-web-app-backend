export const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  CLASS_INIT: "presence:init",
  CLASS_JOIN: "presence:class:join",
  CLASS_LEAVE: "presence:class:leave",
  CLASS_HEARTBEAT: "presence:class:heartbeat",
  CLASS_ONLINE: "class:online",

  CHAPTER_JOIN: "chapter:join",
  CHAPTER_LEAVE: "chapter:leave",
  CHAPTER_HEARTBEAT: "chapter:heartbeat",
  CHAPTER_ONLINE: "chapter:online",

  WATCH_INIT: "watch:init",
  WATCH_JOIN: "watch:join",
  WATCH_HEARTBEAT: "watch:heartbeat",
  WATCH_LEAVE: "watch:leave",
  WATCH_ONLINE: "watch:online",

  WATCH_USER_LIST: "watch:user:list",
  WATCH_USER_LIST_RESULT: "watch:user:list:result",

  WATCH_CHAT_SEND: "watch:chat:send",
  WATCH_CHAT_MESSAGE: "watch:chat:message",

  //একাধিক মেসেজ একসাথে গেলে এই event
  WATCH_CHAT_BATCH: "watch:chat:batch",

  //rate limit এ আটকালে client কে জানানো
  WATCH_CHAT_THROTTLED: "watch:chat:throttled",

  WATCH_TYPING: "watch:typing",
  WATCH_STOP_TYPING: "watch:stopTyping",
  WATCH_CHAT_BLOCKED: "watch:chat:blocked",
  CHAT_SEND: "chat:send",
  CHAT_NEW: "chat:new",

  WATCH_PROGRESS_UPDATE: "watch:progress:update",
  WATCH_PROGRESS_REQUEST: "watch:progress:request",
  WATCH_PROGRESS_LIST: "watch:progress:list",
  WATCH_USER_PROGRESS: "watch:user:progress",

  WATCH_PROGRESS_HISTOGRAM: "watch:progress:histogram",
  WATCH_PROGRESS_HISTOGRAM_REQUEST: "watch:progress:histogram:request",

  SUPERADMIN_WATCH_ROOM: "watch:chat:superAdmin",
  WATCH_SUPER_ADMIN_CHAT: "watch:admin:chat",

  WORKER_CHAT_MESSAGE: "stream:watch-chat",
  CHAT_GROUP: "chat-group",

  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
};
