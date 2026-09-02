import { watchRoom } from "../watch/room.js";

import { saveProgress, getAllProgress, removeProgress } from "./redis.js";
import { getCachedProgress, setCachedProgress } from "./utlis.js";

import { validateProgressPayload } from "./validator.js";

export async function update(io, socket, payload = {}) {
  try {
    if (!validateProgressPayload(payload)) {
      return;
    }
    await saveProgress({
      classType: payload.classType,
      classId: payload.classId,
      user: socket.user,
      progress: payload.progress,
    });

    io.to(watchRoom(payload.classType, payload.classId)).emit(
      "watch:user:progress",
      {
        id: socket.user.id,
        progress: payload.progress,
      },
    );
  } catch (err) {
    console.error(err);
  }
}

// export async function sync(io, socket, payload = {}) {
//   try {
//     if (!validateProgressPayload(payload, false)) {
//       return;
//     }
//     const { classType, classId } = payload;

//     const cached = getCachedProgress(classType, classId);
//     if (cached) {
//       socket.emit("watch:progress:list", cached);
//       return;
//     }
//     const users = await getAllProgress({ classType, classId });
//     setCachedProgress(classType, classId, users);
//     socket.emit("watch:progress:list", users);
//   } catch (err) {
//     console.error(err);
//   }
// }
export async function sync(io, socket, payload = {}) {
  try {
    if (!validateProgressPayload(payload, false)) {
      return;
    }

    const users = await getAllProgress({
      classType: payload.classType,
      classId: payload.classId,
    });

    socket.emit("watch:progress:list", users);
  } catch (err) {
    console.error(err);
  }
}
export async function disconnect(socket) {
  const watch = socket.data.watch;

  if (!watch) return;

  await removeProgress({
    classType: watch.classType,
    classId: watch.classId,
    user: socket.user,
  });
}
