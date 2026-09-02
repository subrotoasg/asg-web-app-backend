import { z } from "zod";

const provider = z.enum(["GOOGLE", "APPLE"]);
const opaqueToken = z
  .string()
  .min(32)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

export const startDesktopAuthSchema = z.object({
  body: z.object({
    provider,
    installationId: z.string().trim().min(16).max(200),
    codeChallenge: z
      .string()
      .min(43)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
    codeChallengeMethod: z.literal("S256").default("S256"),
  }),
});

export const completeDesktopAuthSchema = z.object({
  body: z.object({
    transactionId: opaqueToken,
    browserToken: opaqueToken,
    idToken: z.string().min(100),
  }),
});

export const exchangeDesktopAuthSchema = z.object({
  body: z.object({
    transactionId: opaqueToken,
    codeVerifier: z
      .string()
      .min(43)
      .max(128)
      .regex(/^[A-Za-z0-9._~-]+$/),
  }),
});

export const cancelDesktopAuthSchema = z.object({
  body: z.object({
    transactionId: opaqueToken,
    pollToken: opaqueToken,
  }),
});

const transactionCredential = z.object({
  transactionId: opaqueToken,
  pollToken: opaqueToken,
});

export const linkDesktopAuthSchema = z.object({
  body: transactionCredential,
});

export const requestDesktopRegistrationOtpSchema = z.object({
  body: transactionCredential.extend({
    phone: z
      .string()
      .trim()
      .regex(
        /^(?:\+?88)?01[3-9]\d{8}$/,
        "Provide a valid Bangladeshi phone number",
      ),
  }),
});

export const completeDesktopRegistrationSchema = z.object({
  body: transactionCredential.extend({
    phone: z
      .string()
      .trim()
      .regex(
        /^(?:\+?88)?01[3-9]\d{8}$/,
        "Provide a valid Bangladeshi phone number",
      ),
    otp: z.string().regex(/^\d{5}$/, "OTP must be exactly 5 digits"),
    name: z.string().trim().min(1).max(40).optional(),
  }),
});

export const refreshDesktopSessionSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(100),
    installationId: z.string().trim().min(16).max(200),
  }),
});

export const logoutDesktopSessionSchema = refreshDesktopSessionSchema;
