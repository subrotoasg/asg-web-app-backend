import AppErrors from "../../../../../../errors/AppErrors.js";
import { PushMessagingServices } from "../pushMessaging/pushMessaging.services.js";

export const sendNotification = async ({
  type,
  courseId,
  cycleId,
  title,
  body,
  deepLink,
  image,
  eventKey,
}) => {
  if (!type) throw new AppErrors(422, "Notification type is required.");
  if (!title || !body || !eventKey) {
    throw new AppErrors(422, "Missing required notification fields.");
  }

  if (courseId && cycleId) {
    throw new AppErrors(409, "Provide either courseId or cycleId, not both.");
  }

  if (!courseId && !cycleId) {
    throw new AppErrors(422, "Either courseId or cycleId is required.");
  }

  const payload = {
    ...(courseId ? { courseId } : { cycleId }),
    title,
    body,
    data: {
      type,
      deepLink,
      image,
    },
    eventKey,
  };

  PushMessagingServices.broadcastPushMessageIntoDb(payload).catch((err) => {
    console.error("Notification send failed:", err);
  });

  return true;
};

// //usees example
// const test = async () => {
//   try {
//     await sendNotification({
//       type: "LIVE_CLASS_SCHEDULE_REMINDER",
//       courseId: "058afdd1-bf43-4866-b945-99cd2ca70c11",
//       title: `তোমার লাইভ ক্লাস শুরু হবে`,
//       body: `লাইভ ক্লাসে তোমার সাথে থাকবেন`,
//       //   deepLink: `https://${hostName}`,
//       eventKey: "LIVE_CLASS_SCHEDULE_REMINDER1",
//     });
//   } catch (err) {
//     console.error("Notification preparation failed:", err);
//   }
// };
