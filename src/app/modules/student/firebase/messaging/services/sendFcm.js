import { adminConfig } from "../../configFirebase/admin.js";
import { chunk } from "../utils/batch.js";

adminConfig.initFirebase();

export const sendToTokens = async (tokens, { title, body, data }) => {
  let success = 0;
  let failure = 0;
  const invalidTokens = [];

  for (const part of chunk(tokens, 500)) {
    const res = await adminConfig.admin.messaging().sendEachForMulticast({
      tokens: part,
      data: Object.fromEntries(
        Object.entries({
          ...data,
          title,
          body,
          deepLink: data?.deepLink || "https://aparsclassroom.com",
          icon:
            data?.icon ||
            // "https://apars.b-cdn.net/fcm%20icon/192x192%20icon%20without%20bg.png",
            // "https://apars.b-cdn.net/Apars%20Logo.png",
            "https://apars.b-cdn.net/icon%2096x96.png",
          badge:
            data?.badge ||
            // "https://apars.b-cdn.net/fcm%20icon/badge%20without%20bg%2072x72.png",
            // "https://apars.b-cdn.net/Apars%20Logo.png",
            "https://apars.b-cdn.net/badge%2072x72.png",
          image:
            data?.image ||
            // "https://apars.b-cdn.net/fcm%20icon/1200%20x%20600%20without%20bg.png",
            // "https://apars.b-cdn.net/lightlogo.eaa3af05.png",
            "https://apars.b-cdn.net/banner%201200%20x%20600.png",
        }).map(([k, v]) => [k, String(v)]),
      ),

      webpush: {
        headers: { TTL: "300" },
        fcmOptions: {
          link: data?.deepLink
            ? String(data.deepLink)
            : "http://localhost:3000/",
        },
      },

      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    });

    success += res.successCount;
    failure += res.failureCount;

    for (let i = 0; i < res.responses.length; i++) {
      const r = res.responses[i];
      if (!r.success) {
        const code = r?.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(part[i]);
        }
      }
    }
  }

  return { success, failure, invalidTokens };
};
