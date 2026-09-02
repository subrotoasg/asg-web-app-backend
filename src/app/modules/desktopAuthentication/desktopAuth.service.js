import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../constants/index.js";
import AppErrors from "../../../errors/AppErrors.js";
import { OtpService } from "../../../helper/otpService.js";
import config from "../../config/index.js";
import { Enums } from "../../constant/enums.js";
import { verifyUserTokenWithSignature } from "../authentication/auth.utlis.js";
import { helpers } from "../superAdmin/admin/admin.utils.js";
import { DESKTOP_AUTH, DesktopAuthStatus } from "./desktopAuth.constants.js";
import {
  randomBase64Url,
  safeEqual,
  sha256Base64Url,
} from "./desktopAuth.crypto.js";
import { verifyDesktopProviderToken } from "./desktopAuth.provider.js";
import {
  issueDesktopSession,
  logoutDesktopSession,
  refreshDesktopSession,
} from "./desktopAuth.session.js";
import { desktopAuthStore } from "./desktopAuth.store.js";

const nowIso = () => new Date().toISOString();

const requireTransaction = async (transactionId) => {
  const transaction = await desktopAuthStore.getTransaction(transactionId);
  if (!transaction) {
    throw new AppErrors(
      StatusCodes.GONE,
      "Desktop authentication transaction expired",
    );
  }
  return transaction;
};

const verifyHashedToken = (token, expectedHash, message) => {
  if (typeof token !== "string" || typeof expectedHash !== "string") {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, message);
  }
  if (!safeEqual(sha256Base64Url(token), expectedHash)) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, message);
  }
};

const verifyPollingCredential = (transaction, pollToken) =>
  verifyHashedToken(
    pollToken,
    transaction.pollTokenHash,
    "Invalid desktop polling credential",
  );

const requireStatus = (transaction, expectedStatus, message) => {
  if (transaction.status !== expectedStatus) {
    throw new AppErrors(StatusCodes.CONFLICT, message);
  }
};

const normalizePhone = (phone) => helpers.trimBDCountryCode(phone);

const requireStudentAccessToken = async (accessToken) => {
  const decoded = verifyUserTokenWithSignature(accessToken);
  if (
    !decoded?.id ||
    decoded.type !== Enums.tokenType.access ||
    decoded.role !== Enums.roles.STUDENT
  ) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "A verified student login is required to link this account",
    );
  }

  const student = await prisma.student.findFirst({ where: { id: decoded.id } });
  if (!student || student.status !== "ACTIVE") {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "The student account is unavailable or restricted",
    );
  }
  return student;
};

const identityEmail = (transaction) =>
  String(transaction.identity?.email || "")
    .trim()
    .toLowerCase();

const findConflictingAccount = async (email, phone) => {
  const student = await prisma.student.findFirst({
    where: { OR: [{ email }, { phone }] },
  });
  const [admin, superAdmin] = await Promise.all([
    prisma.admin.findFirst({ where: { OR: [{ email }, { phone }] } }),
    prisma.superAdmin.findFirst({ where: { OR: [{ email }, { phone }] } }),
  ]);
  return { student, privileged: admin || superAdmin };
};

const readyTransaction = (transaction, studentId, message) => ({
  ...transaction,
  status: DesktopAuthStatus.READY,
  studentId,
  message,
  registration: undefined,
  updatedAt: nowIso(),
});

const statusMessage = {
  [DesktopAuthStatus.READY]:
    "Authentication succeeded. Return to ACS to finish signing in.",
  [DesktopAuthStatus.ACCOUNT_LINK_REQUIRED]:
    "This email already has an ACS account. Continue in ACS to verify and link it.",
  [DesktopAuthStatus.REGISTRATION_REQUIRED]:
    "No ACS account exists for this identity. Continue in ACS to register and verify your phone.",
  [DesktopAuthStatus.FAILED]: "ACS could not complete this authentication.",
};

const makeDeepLink = (transactionId, status) => {
  const url = new URL(DESKTOP_AUTH.deepLinkBase);
  url.searchParams.set("transactionId", transactionId);
  url.searchParams.set("status", status);
  return url.toString();
};

const publicStatus = (transaction) => ({
  status: transaction.status,
  provider: transaction.provider,
  message:
    transaction.message ||
    statusMessage[transaction.status] ||
    "Authentication is waiting for completion.",
  user:
    transaction.status === DesktopAuthStatus.ACCOUNT_LINK_REQUIRED ||
    transaction.status === DesktopAuthStatus.REGISTRATION_REQUIRED
      ? {
          email: transaction.identity?.email || null,
          name: transaction.identity?.name || null,
          profilePhoto: transaction.identity?.profilePhoto || null,
        }
      : undefined,
});

const requireTransition = (transaction, message) => {
  if (!transaction) {
    throw new AppErrors(StatusCodes.GONE, message);
  }
  return transaction;
};

const start = async ({ payload, requestInfo, publicUrl }) => {
  const transactionId = randomBase64Url(32);
  const browserToken = randomBase64Url(32);
  const pollToken = randomBase64Url(32);
  const createdAt = nowIso();
  const expiresAt = new Date(
    Date.now() + DESKTOP_AUTH.transactionTtlSeconds * 1000,
  ).toISOString();

  const transaction = {
    version: 1,
    status: DesktopAuthStatus.PENDING,
    provider: payload.provider,
    installationId: payload.installationId,
    codeChallenge: payload.codeChallenge,
    codeChallengeMethod: "S256",
    browserTokenHash: sha256Base64Url(browserToken),
    pollTokenHash: sha256Base64Url(pollToken),
    requestInfo,
    createdAt,
    updatedAt: createdAt,
    expiresAt,
  };

  const created = await desktopAuthStore.createTransaction(
    transactionId,
    transaction,
  );
  if (!created) {
    throw new AppErrors(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Could not create desktop authentication transaction",
    );
  }

  const browserUrl = new URL("/desktop-auth", publicUrl);
  browserUrl.hash = new URLSearchParams({
    t: transactionId,
    bt: browserToken,
  }).toString();

  return {
    transactionId,
    pollToken,
    browserUrl: browserUrl.toString(),
    expiresAt,
  };
};

const getBrowserContext = async ({ transactionId, browserToken }) => {
  const transaction = await requireTransaction(transactionId);
  verifyHashedToken(
    browserToken,
    transaction.browserTokenHash,
    "Invalid browser authentication link",
  );

  if (transaction.status !== DesktopAuthStatus.PENDING) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "This authentication transaction is no longer pending",
    );
  }

  return {
    provider: transaction.provider,
    expiresAt: transaction.expiresAt,
  };
};

const complete = async ({ transactionId, browserToken, idToken }) => {
  const transaction = await requireTransaction(transactionId);
  verifyHashedToken(
    browserToken,
    transaction.browserTokenHash,
    "Invalid browser authentication link",
  );

  if (transaction.status !== DesktopAuthStatus.PENDING) {
    return {
      ...publicStatus(transaction),
      deepLink: makeDeepLink(transactionId, transaction.status),
    };
  }

  const identity = await verifyDesktopProviderToken(
    idToken,
    transaction.provider,
  );
  const linkedProvider = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: transaction.provider,
      providerUid: identity.providerUid,
    },
  });

  let student = linkedProvider
    ? await prisma.student.findFirst({
        where: { id: linkedProvider.studentId },
      })
    : null;
  let status;
  let message;

  if (linkedProvider && !student) {
    status = DesktopAuthStatus.FAILED;
    message = "The linked ACS student account no longer exists.";
  } else if (student?.status === "DISABLED") {
    status = DesktopAuthStatus.FAILED;
    message = "Your ACS account is restricted. Please contact administration.";
  } else if (student) {
    status = DesktopAuthStatus.READY;
  } else {
    if (identity.email && identity.emailVerified) {
      student = await prisma.student.findFirst({
        where: { email: identity.email },
      });
    }

    if (student?.status === "DISABLED") {
      status = DesktopAuthStatus.FAILED;
      message =
        "Your ACS account is restricted. Please contact administration.";
    } else {
      status = student
        ? DesktopAuthStatus.ACCOUNT_LINK_REQUIRED
        : DesktopAuthStatus.REGISTRATION_REQUIRED;
    }
  }

  const completed = await desktopAuthStore.setTransactionIfStatus(
    transactionId,
    DesktopAuthStatus.PENDING,
    {
      ...transaction,
      status,
      message,
      studentId:
        status === DesktopAuthStatus.READY
          ? linkedProvider.studentId
          : undefined,
      identity,
      updatedAt: nowIso(),
    },
  );
  if (!completed) {
    throw new AppErrors(
      StatusCodes.GONE,
      "Desktop authentication transaction expired",
    );
  }

  return {
    ...publicStatus(completed),
    deepLink: makeDeepLink(transactionId, completed.status),
  };
};

const getStatus = async ({ transactionId, pollToken }) => {
  const transaction = await requireTransaction(transactionId);
  verifyHashedToken(
    pollToken,
    transaction.pollTokenHash,
    "Invalid desktop polling credential",
  );
  return publicStatus(transaction);
};

const cancel = async ({ transactionId, pollToken }) => {
  const transaction = await requireTransaction(transactionId);
  verifyHashedToken(
    pollToken,
    transaction.pollTokenHash,
    "Invalid desktop polling credential",
  );

  const cancellableStatuses = new Set([
    DesktopAuthStatus.PENDING,
    DesktopAuthStatus.ACCOUNT_LINK_REQUIRED,
    DesktopAuthStatus.REGISTRATION_REQUIRED,
  ]);
  if (!cancellableStatuses.has(transaction.status)) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "This desktop authentication transaction can no longer be cancelled",
    );
  }

  const updated = await desktopAuthStore.setTransactionIfStatus(
    transactionId,
    transaction.status,
    {
      ...transaction,
      status: DesktopAuthStatus.CANCELLED,
      message: "Authentication was cancelled from ACS.",
      updatedAt: nowIso(),
    },
  );
  if (!updated) {
    throw new AppErrors(
      StatusCodes.GONE,
      "Desktop authentication transaction expired",
    );
  }
  if (updated.status !== DesktopAuthStatus.CANCELLED) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "Desktop authentication transaction changed before it could be cancelled",
    );
  }
  return publicStatus(updated);
};

const linkAccount = async ({ transactionId, pollToken, accessToken }) => {
  const transaction = await requireTransaction(transactionId);
  verifyPollingCredential(transaction, pollToken);
  const linkableStatuses = new Set([
    DesktopAuthStatus.ACCOUNT_LINK_REQUIRED,
    DesktopAuthStatus.REGISTRATION_REQUIRED,
  ]);
  if (!linkableStatuses.has(transaction.status)) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "This desktop authentication transaction is not waiting for account linking",
    );
  }

  const student = await requireStudentAccessToken(accessToken);
  const identity = transaction.identity;
  if (!identity?.providerUid) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "The provider identity is missing from this transaction",
    );
  }

  const existingProvider = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: transaction.provider,
      providerUid: identity.providerUid,
    },
  });

  if (existingProvider && existingProvider.studentId !== student.id) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "This social identity is already linked to another ACS account",
    );
  }

  await prisma.$transaction(async (database) => {
    if (!existingProvider) {
      await database.studentOAuthProvider.create({
        data: {
          studentId: student.id,
          secondaryUid: identity.firebaseUid,
          provider: transaction.provider,
          providerUid: identity.providerUid,
          email: identity.email,
        },
      });
    }

    const providerField =
      transaction.provider === "APPLE" ? "appleId" : "googleId";
    const providerEmailMatchesStudent =
      identity.emailVerified === true &&
      identity.email &&
      student.email.toLowerCase() === identity.email.toLowerCase();

    await database.student.update({
      where: { id: student.id },
      data: {
        [providerField]: identity.providerUid,
        isOAuthUser: true,
        ...(student.uid ? {} : { uid: identity.firebaseUid }),
        ...(providerEmailMatchesStudent ? { emailVerified: true } : {}),
      },
    });
  });

  const updated = await desktopAuthStore.setTransactionIfStatus(
    transactionId,
    transaction.status,
    readyTransaction(
      transaction,
      student.id,
      "Social account linked. Return to ACS to finish signing in.",
    ),
  );

  if (!updated) {
    throw new AppErrors(
      StatusCodes.GONE,
      "Desktop authentication transaction expired",
    );
  }
  if (updated.status !== DesktopAuthStatus.READY) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "Desktop authentication transaction changed while linking",
    );
  }

  return {
    ...publicStatus(updated),
    deepLink: makeDeepLink(transactionId, updated.status),
  };
};

const requestRegistrationOtp = async ({ transactionId, pollToken, phone }) => {
  const transaction = await requireTransaction(transactionId);
  verifyPollingCredential(transaction, pollToken);
  requireStatus(
    transaction,
    DesktopAuthStatus.REGISTRATION_REQUIRED,
    "This desktop authentication transaction is not waiting for registration",
  );

  const email = identityEmail(transaction);
  if (!email || transaction.identity?.emailVerified !== true) {
    throw new AppErrors(
      StatusCodes.PRECONDITION_REQUIRED,
      "A verified provider email is required to create an ACS account",
    );
  }

  const normalizedPhone = normalizePhone(phone);
  const conflict = await findConflictingAccount(email, normalizedPhone);
  if (conflict.student) {
    const updated = requireTransition(
      await desktopAuthStore.setTransactionIfStatus(
        transactionId,
        DesktopAuthStatus.REGISTRATION_REQUIRED,
        {
          ...transaction,
          status: DesktopAuthStatus.ACCOUNT_LINK_REQUIRED,
          message:
            "An ACS account already uses this email or phone. Verify that account to link it.",
          updatedAt: nowIso(),
        },
      ),
      "Desktop authentication transaction expired",
    );
    return {
      ...publicStatus(updated),
      deepLink: makeDeepLink(transactionId, updated.status),
    };
  }
  if (conflict.privileged) {
    throw new AppErrors(
      StatusCodes.NOT_ACCEPTABLE,
      "This email or phone belongs to a non-student account and cannot be used for student registration",
    );
  }

  const activeAttempt = await prisma.otpAttempts.findFirst({
    where: {
      phone: normalizedPhone,
      otp: { not: null },
      expiresAt: { gt: new Date() },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (activeAttempt?.count >= 4) {
    throw new AppErrors(
      StatusCodes.TOO_MANY_REQUESTS,
      "OTP request limit reached. Please try again later.",
    );
  }
  if (
    activeAttempt &&
    Date.now() - new Date(activeAttempt.updatedAt).getTime() < 2 * 60 * 1000
  ) {
    const remainingSeconds = Math.ceil(
      (2 * 60 * 1000 -
        (Date.now() - new Date(activeAttempt.updatedAt).getTime())) /
        1000,
    );
    throw new AppErrors(
      StatusCodes.TOO_MANY_REQUESTS,
      `Please wait ${remainingSeconds} seconds before requesting another OTP`,
    );
  }

  const { otp, otpExpiry } = await OtpService.sendOtpToPhone(normalizedPhone);
  const otpAttempt = activeAttempt
    ? await prisma.otpAttempts.update({
        where: { id: activeAttempt.id },
        data: {
          otp: String(otp),
          otpExpiry,
          expiresAt: otpExpiry,
          count: { increment: 1 },
        },
      })
    : await prisma.otpAttempts.create({
        data: {
          phone: normalizedPhone,
          otp: String(otp),
          otpExpiry,
          expiresAt: otpExpiry,
        },
      });

  const updated = await desktopAuthStore.setTransactionIfStatus(
    transactionId,
    DesktopAuthStatus.REGISTRATION_REQUIRED,
    {
      ...transaction,
      registration: {
        phone: normalizedPhone,
        otpAttemptId: otpAttempt.id,
        otpExpiresAt: otpExpiry.toISOString(),
        verifyAttempts: 0,
      },
      message: "OTP sent to your phone number.",
      updatedAt: nowIso(),
    },
  );

  if (!updated || updated.status !== DesktopAuthStatus.REGISTRATION_REQUIRED) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "Registration state changed before the OTP could be recorded",
    );
  }

  return {
    status: updated.status,
    message: updated.message,
    expiresAt: updated.registration.otpExpiresAt,
  };
};

const completeRegistration = async ({
  transactionId,
  pollToken,
  phone,
  otp,
  name,
}) => {
  let transaction = await requireTransaction(transactionId);
  verifyPollingCredential(transaction, pollToken);
  requireStatus(
    transaction,
    DesktopAuthStatus.REGISTRATION_REQUIRED,
    "This desktop authentication transaction is not waiting for registration",
  );

  const normalizedPhone = normalizePhone(phone);
  if (
    !transaction.registration?.otpAttemptId ||
    transaction.registration.phone !== normalizedPhone
  ) {
    throw new AppErrors(
      StatusCodes.PRECONDITION_REQUIRED,
      "Request an OTP for this phone number before completing registration",
    );
  }

  const lockToken = randomBase64Url(24);
  const locked = await desktopAuthStore.acquireExchangeLock(
    transactionId,
    lockToken,
  );
  if (!locked) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "Desktop registration is already in progress",
    );
  }

  try {
    transaction = await requireTransaction(transactionId);
    requireStatus(
      transaction,
      DesktopAuthStatus.REGISTRATION_REQUIRED,
      "Desktop registration is no longer available",
    );

    const identity = transaction.identity;
    const email = identityEmail(transaction);
    if (!email || identity?.emailVerified !== true || !identity?.providerUid) {
      throw new AppErrors(
        StatusCodes.PRECONDITION_REQUIRED,
        "A complete, verified provider identity is required for registration",
      );
    }

    const existingProvider = await prisma.studentOAuthProvider.findFirst({
      where: {
        provider: transaction.provider,
        providerUid: identity.providerUid,
      },
    });
    if (existingProvider) {
      const existingStudent = await prisma.student.findFirst({
        where: { id: existingProvider.studentId },
      });
      if (!existingStudent || existingStudent.status !== "ACTIVE") {
        throw new AppErrors(
          StatusCodes.FORBIDDEN,
          "The linked ACS account is unavailable or restricted",
        );
      }
      const updated = requireTransition(
        await desktopAuthStore.setTransactionIfStatus(
          transactionId,
          DesktopAuthStatus.REGISTRATION_REQUIRED,
          readyTransaction(
            transaction,
            existingStudent.id,
            "Account already registered. Return to ACS to finish signing in.",
          ),
        ),
        "Desktop authentication transaction expired",
      );
      return {
        ...publicStatus(updated),
        deepLink: makeDeepLink(transactionId, updated.status),
      };
    }

    const conflict = await findConflictingAccount(email, normalizedPhone);
    if (conflict.student) {
      const updated = requireTransition(
        await desktopAuthStore.setTransactionIfStatus(
          transactionId,
          DesktopAuthStatus.REGISTRATION_REQUIRED,
          {
            ...transaction,
            status: DesktopAuthStatus.ACCOUNT_LINK_REQUIRED,
            message:
              "An ACS account already uses this email or phone. Verify that account to link it.",
            registration: undefined,
            updatedAt: nowIso(),
          },
        ),
        "Desktop authentication transaction expired",
      );
      return {
        ...publicStatus(updated),
        deepLink: makeDeepLink(transactionId, updated.status),
      };
    }
    if (conflict.privileged) {
      throw new AppErrors(
        StatusCodes.NOT_ACCEPTABLE,
        "This email or phone belongs to a non-student account and cannot be used for student registration",
      );
    }

    const otpAttempt = await prisma.otpAttempts.findFirst({
      where: {
        id: transaction.registration.otpAttemptId,
        phone: normalizedPhone,
        otp: { not: null },
      },
    });
    const otpExpired =
      !otpAttempt?.otpExpiry || new Date(otpAttempt.otpExpiry) <= new Date();
    const otpMatches = otpAttempt?.otp === String(otp);

    if (!otpAttempt || otpExpired || !otpMatches) {
      if (otpAttempt) {
        const nextCount = (otpAttempt.count || 0) + 1;
        await prisma.otpAttempts.update({
          where: { id: otpAttempt.id },
          data: {
            count: { increment: 1 },
            ...(nextCount >= 5 ? { otp: null, otpExpiry: null } : {}),
          },
        });
      }
      throw new AppErrors(
        otpAttempt && (otpAttempt.count || 0) + 1 >= 5
          ? StatusCodes.TOO_MANY_REQUESTS
          : StatusCodes.CONFLICT,
        otpAttempt && (otpAttempt.count || 0) + 1 >= 5
          ? "Too many incorrect OTP attempts. Request a new code."
          : "OTP is incorrect or has expired",
      );
    }

    const displayName = String(
      name || identity.name || email.split("@")[0] || "Student",
    )
      .trim()
      .slice(0, 40);
    const password = await bcrypt.hash(
      randomBase64Url(32),
      Number(config.bcrypt_hash_random) || 10,
    );

    const student = await prisma.$transaction(async (database) => {
      const consumedOtp = await database.otpAttempts.updateMany({
        where: {
          id: transaction.registration.otpAttemptId,
          phone: normalizedPhone,
          otp: String(otp),
          otpExpiry: { gt: new Date() },
        },
        data: {
          otp: null,
          otpExpiry: null,
        },
      });

      if (consumedOtp.count !== 1) {
        throw new AppErrors(
          StatusCodes.CONFLICT,
          "OTP is incorrect or has expired",
        );
      }

      const createdStudent = await database.student.create({
        data: {
          name: displayName || "Student",
          phone: normalizedPhone,
          email,
          uid: identity.firebaseUid,
          password,
          profilePhoto: identity.profilePhoto,
          googleId:
            transaction.provider === "GOOGLE" ? identity.providerUid : null,
          appleId:
            transaction.provider === "APPLE" ? identity.providerUid : null,
          leads: "desktop",
          isOAuthUser: true,
          phoneVerified: true,
          emailVerified: true,
        },
      });

      await database.studentOAuthProvider.create({
        data: {
          studentId: createdStudent.id,
          secondaryUid: identity.firebaseUid,
          provider: transaction.provider,
          providerUid: identity.providerUid,
          email,
        },
      });
      return createdStudent;
    });

    const updated = await desktopAuthStore.setTransactionIfStatus(
      transactionId,
      DesktopAuthStatus.REGISTRATION_REQUIRED,
      readyTransaction(
        transaction,
        student.id,
        "Registration complete. Return to ACS to finish signing in.",
      ),
    );
    if (!updated || updated.status !== DesktopAuthStatus.READY) {
      throw new AppErrors(
        StatusCodes.CONFLICT,
        "Registration completed, but the desktop transaction could not be finalized. Start sign-in again.",
      );
    }

    return {
      ...publicStatus(updated),
      deepLink: makeDeepLink(transactionId, updated.status),
    };
  } finally {
    await desktopAuthStore.releaseExchangeLock(transactionId, lockToken);
  }
};

const refreshSession = (payload) => refreshDesktopSession(payload);
const logoutSession = (payload) => logoutDesktopSession(payload);

const exchange = async ({ transactionId, codeVerifier }) => {
  let transaction = await requireTransaction(transactionId);

  if (transaction.status === DesktopAuthStatus.CONSUMED) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "This desktop authentication transaction was already used",
    );
  }
  if (transaction.status !== DesktopAuthStatus.READY) {
    throw new AppErrors(
      StatusCodes.PRECONDITION_REQUIRED,
      "Desktop authentication is not ready for exchange",
    );
  }

  if (!safeEqual(sha256Base64Url(codeVerifier), transaction.codeChallenge)) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Invalid desktop PKCE verifier",
    );
  }

  const lockToken = randomBase64Url(24);
  const locked = await desktopAuthStore.acquireExchangeLock(
    transactionId,
    lockToken,
  );
  if (!locked) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "Desktop authentication exchange is already in progress",
    );
  }

  try {
    transaction = await requireTransaction(transactionId);
    if (transaction.status !== DesktopAuthStatus.READY) {
      throw new AppErrors(
        StatusCodes.CONFLICT,
        "Desktop authentication transaction is no longer exchangeable",
      );
    }

    const session = await issueDesktopSession({
      studentId: transaction.studentId,
      installationId: transaction.installationId,
      requestInfo: transaction.requestInfo,
      provider: transaction.provider,
      providerUid: transaction.identity.providerUid,
    });

    await desktopAuthStore.saveTransaction(
      transactionId,
      {
        version: transaction.version,
        status: DesktopAuthStatus.CONSUMED,
        provider: transaction.provider,
        createdAt: transaction.createdAt,
        updatedAt: nowIso(),
      },
      DESKTOP_AUTH.consumedTtlSeconds,
    );

    return session;
  } finally {
    await desktopAuthStore.releaseExchangeLock(transactionId, lockToken);
  }
};

export const desktopAuthService = {
  start,
  getBrowserContext,
  complete,
  getStatus,
  cancel,
  linkAccount,
  requestRegistrationOtp,
  completeRegistration,
  refreshSession,
  logoutSession,
  exchange,
};
