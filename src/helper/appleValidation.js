// import appleSigninAuth from "apple-signin-auth";
// import config from "../app/config/index.js";
// import { StatusCodes } from "http-status-codes";
// import AppErrors from "../errors/AppErrors.js";

// export const validateAppleToken = async (idToken = "") => {
//   if (!idToken)
//     throw new AppErrors(
//       StatusCodes.BAD_REQUEST,
//       "Malformed Idtoken, Please try again",
//     );

//   try {
//     const ticket = await appleSigninAuth.verifyIdToken(idToken, {
//       audience: config.apple_client_id,
//     });

//     console.log(ticket, "hello");

//     const payload = ticket;
//     return {
//       email: payload?.email,
//       sub: payload?.sub,
//       email_verified: payload?.email_verified,
//     };
//   } catch (error) {
//     console.log(error, "error on apple validation");
//     throw new AppErrors(StatusCodes.BAD_REQUEST, "Apple Authentication failed");
//   }
// };

import jwt from "jsonwebtoken";
import appleSigninAuth from "apple-signin-auth";
import config from "../app/config/index.js";
import { StatusCodes } from "http-status-codes";
import AppErrors from "../errors/AppErrors.js";
import { adminConfig } from "../app/modules/student/firebase/configFirebase/admin.js";

export const validateAppleToken = async (idToken = "") => {
  if (!idToken)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Malformed Idtoken, Please try again",
    );

  const decoded = jwt.decode(idToken, { complete: true });

  if (!decoded || typeof decoded.payload === "string") {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Malformed Idtoken, Please try again",
    );
  }

  const issuer = decoded.payload.iss;

  try {
    if (issuer && issuer.startsWith("https://securetoken.google.com/")) {
      adminConfig.initFirebase();

      const decodedFirebase = await adminConfig.admin
        .auth()
        .verifyIdToken(idToken);

      if (decodedFirebase.firebase.sign_in_provider !== "apple.com") {
        throw new AppErrors(
          StatusCodes.BAD_REQUEST,
          "Token is not an Apple sign-in token",
        );
      }

      const appleSub = decodedFirebase.firebase.identities?.["apple.com"]?.[0];

      return {
        email: decodedFirebase.email,
        sub: appleSub || decodedFirebase.uid,
        email_verified: decodedFirebase.email_verified,
      };
    } else {
      const ticket = await appleSigninAuth.verifyIdToken(idToken, {
        audience: config.apple_client_id,
      });

      return {
        email: ticket?.email,
        sub: ticket?.sub,
        email_verified: ticket?.email_verified,
      };
    }
  } catch (error) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Apple Authentication failed");
  }
};
