import { StatusCodes } from "http-status-codes";
import AppErrors from "../errors/AppErrors.js";
import { OAuth2Client } from "google-auth-library";
import google_client from "../app/utlis/googleClient.js";

export const validateGoogleToken = async (idToken = "") => {
  //   const client = new OAuth2Client(googleClientId);
  if (!idToken)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Malformed Idtoken, Please try again",
    );

  try {
    const ticket = await google_client.verifyIdToken({
      idToken: idToken,
    });
    const payload = ticket.getPayload();
    return {
      email: payload?.email,
      sub: payload?.sub,
      email_verified: payload?.email_verified,
    };
  } catch (error) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "G-Token Authentication failed",
    );
  }
};
