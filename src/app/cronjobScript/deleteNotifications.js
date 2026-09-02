import { prisma } from "../../../constants/index.js";
import { bumpNotificationGlobalVersion } from "../modules/student/firebase/messaging/pushMessaging/pushMessaging.cache.js";

export async function deleteOldNotifications() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  try {
    const deletedCount = await prisma.$transaction(async (tx) => {
      const deletedStatuses = await tx.notificationUserStatus.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      });
      const deletedNotifications = await tx.notificationLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      });

      return deletedStatuses.count + deletedNotifications.count;
    });

    if (deletedCount > 0) {
      await bumpNotificationGlobalVersion();
    }
    console.log("Old notifications deleted");
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}
