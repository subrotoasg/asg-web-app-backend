import { classRoomKey } from "./room.js";

import { isStudentUser } from "./validator.js";

import { markClassActive, removeClassMember } from "./redis.js";

import { shouldAcceptHeartbeat, scheduleCountEmit } from "./throttle.js";

export async function join(io, socket, payload) {
  const { classType, classId } = payload;

  const user = socket.data.user;

  const room = classRoomKey(classType, classId);

  socket.join(room);

  socket.data.currentClass = {
    classType,
    classId,
    joinedAt: Date.now(),
  };

  if (isStudentUser(user)) {
    await markClassActive({
      classType,
      classId,
      user,
    });
  }

  socket.emit("presence:class:joined", {
    classType,
    classId,
    room,
    countsStudent: isStudentUser(user),
  });

  scheduleCountEmit(io, classType, classId);
}

export async function heartbeat(io, socket, payload) {
  const { classType, classId } = payload;

  const user = socket.data.user;

  if (!isStudentUser(user)) {
    return;
  }

  if (!shouldAcceptHeartbeat(socket, classType, classId)) {
    return;
  }

  await markClassActive({
    classType,
    classId,
    user,
  });

  scheduleCountEmit(io, classType, classId);
}

export async function leave(io, socket, payload) {
  const { classType, classId } = payload;

  const room = classRoomKey(classType, classId);

  socket.leave(room);

  if (
    socket.data.currentClass?.classType === classType &&
    socket.data.currentClass?.classId === classId
  ) {
    socket.data.currentClass = null;
  }

  if (isStudentUser(socket.data.user)) {
    await removeClassMember({
      classType,
      classId,
      user: socket.data.user,
    });
  }

  socket.emit("presence:class:left", {
    classType,
    classId,
  });

  scheduleCountEmit(io, classType, classId);
}

export async function disconnect(io, socket) {
  const current = socket.data.currentClass;

  if (!current) {
    return;
  }

  if (isStudentUser(socket.data.user)) {
    await removeClassMember({
      classType: current.classType,
      classId: current.classId,
      user: socket.data.user,
    });
  }

  scheduleCountEmit(io, current.classType, current.classId);
}
