export function buildActiveChatData(data) {
  return {
    id: data.id,
    message: data.message,
    messageCreatedAt: BigInt(data.createdAt),

    classContentId: data.classType === "CLASS_CONTENT" ? data.classId : null,

    cycleContentId: data.classType === "CYCLE_CONTENT" ? data.classId : null,

    studentId: data.sender.role === "student" ? data.sender.id : null,

    adminId: data.sender.role === "admin" ? data.sender.id : null,

    superAdminId: data.sender.role === "superAdmin" ? data.sender.id : null,
  };
}
