import crypto from "node:crypto";

export function hashSessionHost(hostName) {
  return crypto
    .createHash("sha256")
    .update(String(hostName || "unknown"))
    .digest("hex")
    .slice(0, 24);
}

export const StudentSessionKeys = {
  session(studentId, hostName) {
    const hostHash = hashSessionHost(hostName);
    return [
      "cache",
      "auth",
      "session",
      "v1",
      "student",
      studentId,
      hostHash,
    ].join(":");
  },
};
