import crypto from "crypto";

export const randomBase64Url = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("base64url");

export const sha256Base64Url = (value) =>
  crypto.createHash("sha256").update(value, "utf8").digest("base64url");

export const safeEqual = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string") return false;

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const hashInstallationId = (installationId) =>
  crypto
    .createHash("sha256")
    .update(installationId, "utf8")
    .digest("hex")
    .slice(0, 32);
