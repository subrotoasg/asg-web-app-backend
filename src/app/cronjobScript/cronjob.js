import cron from "node-cron";
import { deleteOldNotifications } from "./deleteNotifications.js";
import {
  computeAndStoreDailyAyah,
  rotateMediaCredentials,
} from "../modules/superAdmin/utilities/utilities.services.js";
import { deleteOldActiveChats } from "../socket/realtime/chat/activeChat.services.js";

// runs every day at 00:05
// cron.schedule("5 0 * * *", async () => {
//   console.log("Running notification cleanup job...");
//   //   await deleteOldNotifications();
// });
cron.schedule("5 0 * * *", async () => {
  console.log("cron job running Deleted Notification");
  await deleteOldNotifications();
});

//active chat cleanup cron job
cron.schedule("30 9 * * *", async () => {
  try {
    await deleteOldActiveChats();
  } catch (error) {
    console.error("[CRON] chat cleanup failed", error);
  }
});

cron.schedule(
  "06 16 * * *",
  async () => {
    const bd = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
    );
    bd.setDate(bd.getDate() + 1);
    const nextDateKey = bd.toISOString().slice(0, 10);

    try {
      const payload = await computeAndStoreDailyAyah(nextDateKey);
      console.log(
        " Pre-computed for",
        nextDateKey,
        payload.hijriDate.formatted,
        payload.ayahKey,
      );
    } catch (err) {
      console.error(" Daily ayah cron failed:", err.message);
    }
  },
  { timezone: "Asia/Dhaka" },
);

//media server credentials
const isPrimaryInstance =
  process.env.NODE_APP_INSTANCE === "0" ||
  process.env.NODE_APP_INSTANCE === undefined;

if (isPrimaryInstance) {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await rotateMediaCredentials();
    } catch (err) {
      console.error(err);
    }
  });
}
