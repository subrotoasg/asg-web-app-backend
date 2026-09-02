import { sendToTokens } from "../services/sendFcm.js";
import { helperfn } from "./pushMessaging.helper.js";

export async function handleSingleUser(job) {
  const { uuid, userType, studentId, adminId, title, body, data } = job.data;

  const tokens = await helperfn.getTokensForUser({
    userType,
    studentId,
    adminId,
  });
  if (!tokens.length)
    return { uniqueId: uuid, success: 0, failure: 0, invalid: 0 };

  const res = await sendToTokens(tokens, { title, body, data });

  if (res.invalidTokens?.length) {
    await helperfn.invalidateTokens(res.invalidTokens);
  }

  return {
    uniqueId: uuid,
    sent: res.success || 0,
    failed: res.failure || 0,
    invalid: res.invalid || 0,
  };
}
