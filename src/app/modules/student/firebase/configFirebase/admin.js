import admin from "firebase-admin";
import AppErrors from "../../../../../errors/AppErrors.js";
import config from "../../../../config/index.js";

export const initFirebase = () => {
  if (admin.apps.length) return;

  const raw = JSON.parse(config.fcm_service_account_json);

  if (!raw) throw new AppErrors(405, "FCM_SERVICE_ACCOUNT_JSON missing");

  admin.initializeApp({
    credential: admin.credential.cert(raw),
  });
};

export const adminConfig = {
  admin,
  initFirebase,
};

// const getUserData = async (uid) => {
//   try {
//     // 2. Ensure Firebase is initialized first
//     initFirebase();

//     // 3. Fetch the user safely
//     const userRecord = await admin.auth().getUser(uid);
//     console.log(userRecord);
//     console.log("Successfully fetched user data:");
//     console.log("Email:", userRecord.email);
//     console.log("Phone Number:", userRecord.phoneNumber);
//     console.log(
//       "Providers:",
//       userRecord.providerData.map((p) => p.providerId),
//     );

//     return userRecord;
//   } catch (error) {
//     console.error("Error fetching user data:", error);
//     throw error;
//   }
// };

// // 4. Run it safely
// const uid = "XIN2LUk7sTeOLoCByP5pNttUmZB2";
// getUserData(uid);
