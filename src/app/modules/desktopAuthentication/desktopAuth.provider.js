import { StatusCodes } from "http-status-codes";
import AppErrors from "../../../errors/AppErrors.js";
import { adminConfig } from "../student/firebase/configFirebase/admin.js";

const providerConfig = {
  GOOGLE: {
    firebaseProvider: "google.com",
    identityKey: "google.com",
  },
  APPLE: {
    firebaseProvider: "apple.com",
    identityKey: "apple.com",
  },
};

export const verifyDesktopProviderToken = async (idToken, provider) => {
  const expected = providerConfig[provider];
  if (!expected) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Unsupported provider");
  }

  try {
    adminConfig.initFirebase();
    const decoded = await adminConfig.admin.auth().verifyIdToken(idToken);
    const signInProvider = decoded?.firebase?.sign_in_provider;

    if (signInProvider !== expected.firebaseProvider) {
      throw new AppErrors(
        StatusCodes.UNAUTHORIZED,
        `Expected ${expected.firebaseProvider} authentication`,
      );
    }

    const providerUid =
      decoded?.firebase?.identities?.[expected.identityKey]?.[0] || decoded.uid;

    if (!providerUid) {
      throw new AppErrors(
        StatusCodes.UNAUTHORIZED,
        "Provider identity is missing",
      );
    }

    return {
      firebaseUid: decoded.uid,
      providerUid,
      email: decoded.email || null,
      emailVerified: decoded.email_verified === true,
      name: decoded.name || null,
      profilePhoto: decoded.picture || null,
    };
  } catch (error) {
    if (error instanceof AppErrors) throw error;
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Provider authentication failed",
    );
  }
};
