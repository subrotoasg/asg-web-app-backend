import assert from "node:assert/strict";
import test from "node:test";
import {
  randomBase64Url,
  safeEqual,
  sha256Base64Url,
} from "../src/app/modules/desktopAuthentication/desktopAuth.crypto.js";
import { renderDesktopAuthPage } from "../src/app/modules/desktopAuthentication/desktopAuth.page.js";
import {
  completeDesktopRegistrationSchema,
  completeDesktopAuthSchema,
  linkDesktopAuthSchema,
  requestDesktopRegistrationOtpSchema,
  startDesktopAuthSchema,
} from "../src/app/modules/desktopAuthentication/desktopAuth.validation.js";
import { getDesktopAuthConfig } from "../src/app/modules/desktopAuthentication/desktopAuth.config.js";
import { prisma } from "../constants/index.js";
import { OtpService } from "../src/helper/otpService.js";
import { Enums } from "../src/app/constant/enums.js";
import { helpers } from "../src/app/modules/superAdmin/admin/admin.utils.js";
import { DesktopAuthStatus } from "../src/app/modules/desktopAuthentication/desktopAuth.constants.js";
import { desktopAuthService } from "../src/app/modules/desktopAuthentication/desktopAuth.service.js";
import { desktopSessionHost } from "../src/app/modules/desktopAuthentication/desktopAuth.session.js";
import { desktopAuthStore } from "../src/app/modules/desktopAuthentication/desktopAuth.store.js";
import { CookieHelper } from "../src/helper/cookieHelper.js";
import config from "../src/app/config/index.js";
import { authorizationMiddleware } from "../src/app/middleware/authorization.js";

test("uses the Varsity API domain as the default public URL", () => {
  const previous = process.env.DESKTOP_AUTH_PUBLIC_URL;
  delete process.env.DESKTOP_AUTH_PUBLIC_URL;

  try {
    assert.equal(
      getDesktopAuthConfig().publicUrl,
      "https://api.varsity.aparsclassroom.com",
    );
  } finally {
    if (previous === undefined) delete process.env.DESKTOP_AUTH_PUBLIC_URL;
    else process.env.DESKTOP_AUTH_PUBLIC_URL = previous;
  }
});

test("creates URL-safe opaque transaction credentials", () => {
  const token = randomBase64Url(32);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
});

test("creates the RFC 7636 S256 PKCE challenge", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  assert.equal(
    sha256Base64Url(verifier),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("compares secrets without accepting different lengths", () => {
  assert.equal(safeEqual("same-secret", "same-secret"), true);
  assert.equal(safeEqual("same-secret", "other-secret"), false);
  assert.equal(safeEqual("short", "much-longer"), false);
});

test("accepts a valid desktop start payload", () => {
  const result = startDesktopAuthSchema.safeParse({
    body: {
      provider: "GOOGLE",
      installationId: "installation-id-12345",
      codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      codeChallengeMethod: "S256",
    },
  });
  assert.equal(result.success, true);
});

test("rejects a completion payload with a short browser credential", () => {
  const result = completeDesktopAuthSchema.safeParse({
    body: {
      transactionId: randomBase64Url(32),
      browserToken: "short",
      idToken: "x".repeat(200),
    },
  });
  assert.equal(result.success, false);
});

test("browser bridge escapes configuration embedded in HTML", () => {
  const html = renderDesktopAuthPage({
    firebaseConfig: {
      apiKey: "<unsafe>",
      authDomain: "auth.example.com",
      projectId: "project",
      appId: "app",
    },
    apiBaseUrl: "https://auth.example.com/api/v1/desktop-auth",
    nonce: "test-nonce",
  });

  assert.match(html, /nonce="test-nonce"/);
  assert.doesNotMatch(html, /"apiKey":"<unsafe>"/);
  assert.match(html, /\\u003cunsafe\\u003e/);
  assert.match(html, /signInWithPopup/);
  assert.match(html, /location\.hash/);
  assert.match(html, /X-Desktop-Auth-Browser-Token/);
});

test("accepts the transaction-bound linking and registration payloads", () => {
  const transactionId = randomBase64Url(32);
  const pollToken = randomBase64Url(32);

  assert.equal(
    linkDesktopAuthSchema.safeParse({
      body: { transactionId, pollToken },
    }).success,
    true,
  );
  assert.equal(
    requestDesktopRegistrationOtpSchema.safeParse({
      body: { transactionId, pollToken, phone: "+8801712345678" },
    }).success,
    true,
  );
  assert.equal(
    completeDesktopRegistrationSchema.safeParse({
      body: {
        transactionId,
        pollToken,
        phone: "01712345678",
        otp: "12345",
      },
    }).success,
    true,
  );
});

test("maps authenticated desktop requests to the same installation session", () => {
  const installationId = "stable-installation-id-12345";
  const request = {
    headers: {
      platform: "mac",
      "x-acs-installation-id": installationId,
      host: "127.0.0.1:3000",
    },
  };

  assert.equal(
    CookieHelper.getFrontendHost(request),
    desktopSessionHost(installationId),
  );
});

test("keeps existing web and mobile host resolution unchanged", () => {
  const host = "localhost:3000";
  const origin = "https://varsity.aparsclassroom.com";
  const expected = config.node_env === "development" ? host : origin;

  assert.equal(
    CookieHelper.getFrontendHost({
      headers: { host, origin },
    }),
    expected,
  );
  assert.equal(
    CookieHelper.getFrontendHost({
      headers: {
        host,
        origin,
        platform: "android",
        "x-acs-installation-id": "mobile-installation-id-12345",
      },
    }),
    expected,
  );
});

test("cancels a transaction while registration is waiting", async (t) => {
  const pollToken = randomBase64Url(32);
  const transaction = transactionFixture(
    DesktopAuthStatus.REGISTRATION_REQUIRED,
    pollToken,
  );
  let expectedStatus;

  t.mock.method(desktopAuthStore, "getTransaction", async () => transaction);
  t.mock.method(
    desktopAuthStore,
    "setTransactionIfStatus",
    async (_id, status, next) => {
      expectedStatus = status;
      return next;
    },
  );

  const result = await desktopAuthService.cancel({
    transactionId: randomBase64Url(32),
    pollToken,
  });

  assert.equal(expectedStatus, DesktopAuthStatus.REGISTRATION_REQUIRED);
  assert.equal(result.status, DesktopAuthStatus.CANCELLED);
});

const studentFixture = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "student@example.com",
  phone: "01712345678",
  name: "Student",
  status: "ACTIVE",
  role: Enums.roles.STUDENT,
  uid: "firebase-student-id",
  isOAuthUser: true,
};

const transactionFixture = (status, pollToken) => ({
  version: 1,
  status,
  provider: "GOOGLE",
  installationId: "installation-id-12345",
  codeChallenge: sha256Base64Url("v".repeat(43)),
  codeChallengeMethod: "S256",
  browserTokenHash: sha256Base64Url(randomBase64Url(32)),
  pollTokenHash: sha256Base64Url(pollToken),
  requestInfo: {},
  identity: {
    firebaseUid: "firebase-provider-id",
    providerUid: "google-provider-id",
    email: "student@example.com",
    emailVerified: true,
    name: "Student",
    profilePhoto: null,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 600000).toISOString(),
});

const stubPrismaMethod = (t, target, methodName, implementation) => {
  const descriptor = Object.getOwnPropertyDescriptor(target, methodName);
  Object.defineProperty(target, methodName, {
    configurable: true,
    enumerable: true,
    writable: true,
    value: implementation,
  });
  t.after(() => Object.defineProperty(target, methodName, descriptor));
};

const runMiddleware = (middleware, request, response = {}) =>
  new Promise((resolve, reject) => {
    middleware(request, response, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

test("keeps refresh-cookie validation for authenticated web students", async (t) => {
  const host = "localhost:3000";
  const origin = "https://varsity.aparsclassroom.com";
  const hostName = config.node_env === "development" ? host : origin;
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  const accessToken = helpers.generateAuthToken({
    id: studentFixture.id,
    role: studentFixture.role,
    type: Enums.tokenType.access,
  });

  stubPrismaMethod(t, prisma.student, "findFirst", async () => studentFixture);
  stubPrismaMethod(t, prisma.studentAuthLog, "findFirst", async () => ({
    refreshToken: "web-refresh-token",
  }));

  const request = {
    headers: {
      host,
      origin,
      "x-access-token": accessToken,
    },
    cookies: { [cookieKey]: "web-refresh-token" },
    body: {},
  };

  await runMiddleware(
    authorizationMiddleware.authorize([Enums.roles.STUDENT]),
    request,
    { clearCookie() {} },
  );
  assert.equal(request.body.studentId, studentFixture.id);
});

test("does not grant the desktop cookie exemption to a web request", async (t) => {
  const accessToken = helpers.generateAuthToken({
    id: studentFixture.id,
    role: studentFixture.role,
    type: Enums.tokenType.access,
  });

  stubPrismaMethod(t, prisma.student, "findFirst", async () => studentFixture);
  stubPrismaMethod(t, prisma.studentAuthLog, "findFirst", async () => ({
    refreshToken: "web-refresh-token",
  }));

  await assert.rejects(
    runMiddleware(
      authorizationMiddleware.authorize([Enums.roles.STUDENT]),
      {
        headers: {
          host: "localhost:3000",
          origin: "https://varsity.aparsclassroom.com",
          "x-access-token": accessToken,
        },
        cookies: {},
        body: {},
      },
      { clearCookie() {} },
    ),
    (error) => error.statusCode === 300,
  );
});

test("authorizes a bound desktop session without a browser cookie", async (t) => {
  const accessToken = helpers.generateAuthToken({
    id: studentFixture.id,
    role: studentFixture.role,
    type: Enums.tokenType.access,
  });

  stubPrismaMethod(t, prisma.student, "findFirst", async () => studentFixture);
  stubPrismaMethod(t, prisma.studentAuthLog, "findFirst", async () => ({
    refreshToken: "desktop-refresh-token",
  }));

  const request = {
    headers: {
      platform: "windows",
      "x-acs-installation-id": "stable-installation-id-12345",
      "x-access-token": accessToken,
    },
    cookies: {},
    body: {},
  };

  await runMiddleware(
    authorizationMiddleware.authorize([Enums.roles.STUDENT]),
    request,
    { clearCookie() {} },
  );
  assert.equal(request.body.studentId, studentFixture.id);
});

test("links a verified student to the provider stored in the transaction", async (t) => {
  const pollToken = randomBase64Url(32);
  const transaction = transactionFixture(
    DesktopAuthStatus.ACCOUNT_LINK_REQUIRED,
    pollToken,
  );
  const oauthCreates = [];
  const studentUpdates = [];

  t.mock.method(desktopAuthStore, "getTransaction", async () => transaction);
  t.mock.method(
    desktopAuthStore,
    "setTransactionIfStatus",
    async (_id, _status, next) => next,
  );
  stubPrismaMethod(t, prisma.student, "findFirst", async () => studentFixture);
  stubPrismaMethod(
    t,
    prisma.studentOAuthProvider,
    "findFirst",
    async () => null,
  );
  stubPrismaMethod(t, prisma, "$transaction", async (operation) =>
    operation({
      studentOAuthProvider: {
        create: async (payload) => oauthCreates.push(payload),
      },
      student: {
        update: async (payload) => studentUpdates.push(payload),
      },
    }),
  );

  const accessToken = helpers.generateAuthToken({
    id: studentFixture.id,
    role: studentFixture.role,
    type: Enums.tokenType.access,
  });
  const result = await desktopAuthService.linkAccount({
    transactionId: randomBase64Url(32),
    pollToken,
    accessToken,
  });

  assert.equal(result.status, DesktopAuthStatus.READY);
  assert.equal(oauthCreates.length, 1);
  assert.equal(studentUpdates.length, 1);
  assert.equal(oauthCreates[0].data.providerUid, "google-provider-id");
});

test("requests a registration OTP and binds it to the transaction", async (t) => {
  const pollToken = randomBase64Url(32);
  const transaction = transactionFixture(
    DesktopAuthStatus.REGISTRATION_REQUIRED,
    pollToken,
  );

  t.mock.method(desktopAuthStore, "getTransaction", async () => transaction);
  t.mock.method(
    desktopAuthStore,
    "setTransactionIfStatus",
    async (_id, _status, next) => next,
  );
  stubPrismaMethod(t, prisma.student, "findFirst", async () => null);
  stubPrismaMethod(t, prisma.admin, "findFirst", async () => null);
  stubPrismaMethod(t, prisma.superAdmin, "findFirst", async () => null);
  stubPrismaMethod(t, prisma.otpAttempts, "findFirst", async () => null);
  stubPrismaMethod(t, prisma.otpAttempts, "create", async ({ data }) => ({
    id: "22222222-2222-4222-8222-222222222222",
    ...data,
  }));
  t.mock.method(OtpService, "sendOtpToPhone", async () => ({
    otp: 12345,
    otpExpiry: new Date(Date.now() + 300000),
  }));

  const result = await desktopAuthService.requestRegistrationOtp({
    transactionId: randomBase64Url(32),
    pollToken,
    phone: "+8801712345678",
  });

  assert.equal(result.status, DesktopAuthStatus.REGISTRATION_REQUIRED);
  assert.match(result.expiresAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("completes a transaction-bound social registration", async (t) => {
  const pollToken = randomBase64Url(32);
  const transaction = {
    ...transactionFixture(DesktopAuthStatus.REGISTRATION_REQUIRED, pollToken),
    registration: {
      phone: "01712345678",
      otpAttemptId: "22222222-2222-4222-8222-222222222222",
      otpExpiresAt: new Date(Date.now() + 300000).toISOString(),
      verifyAttempts: 0,
    },
  };
  const createdStudent = {
    ...studentFixture,
    id: "33333333-3333-4333-8333-333333333333",
  };
  const studentCreates = [];
  const providerCreates = [];

  t.mock.method(desktopAuthStore, "getTransaction", async () => transaction);
  t.mock.method(desktopAuthStore, "acquireExchangeLock", async () => true);
  t.mock.method(desktopAuthStore, "releaseExchangeLock", async () => {});
  t.mock.method(
    desktopAuthStore,
    "setTransactionIfStatus",
    async (_id, _status, next) => next,
  );
  stubPrismaMethod(
    t,
    prisma.studentOAuthProvider,
    "findFirst",
    async () => null,
  );
  stubPrismaMethod(t, prisma.student, "findFirst", async () => null);
  stubPrismaMethod(t, prisma.admin, "findFirst", async () => null);
  stubPrismaMethod(t, prisma.superAdmin, "findFirst", async () => null);
  stubPrismaMethod(t, prisma.otpAttempts, "findFirst", async () => ({
    id: transaction.registration.otpAttemptId,
    phone: transaction.registration.phone,
    otp: "12345",
    otpExpiry: new Date(Date.now() + 300000),
    count: 0,
  }));
  stubPrismaMethod(t, prisma, "$transaction", async (operation) =>
    operation({
      otpAttempts: {
        updateMany: async () => ({ count: 1 }),
      },
      student: {
        create: async (payload) => {
          studentCreates.push(payload);
          return createdStudent;
        },
      },
      studentOAuthProvider: {
        create: async (payload) => providerCreates.push(payload),
      },
    }),
  );

  const result = await desktopAuthService.completeRegistration({
    transactionId: randomBase64Url(32),
    pollToken,
    phone: "01712345678",
    otp: "12345",
    name: "New Student",
  });

  assert.equal(result.status, DesktopAuthStatus.READY);
  assert.equal(studentCreates.length, 1);
  assert.equal(studentCreates[0].data.email, "student@example.com");
  assert.equal(studentCreates[0].data.phoneVerified, true);
  assert.equal(providerCreates.length, 1);
  assert.equal(providerCreates[0].data.studentId, createdStudent.id);
});

test("rejects an already consumed desktop exchange", async (t) => {
  const transaction = transactionFixture(
    DesktopAuthStatus.CONSUMED,
    randomBase64Url(32),
  );
  t.mock.method(desktopAuthStore, "getTransaction", async () => transaction);

  await assert.rejects(
    desktopAuthService.exchange({
      transactionId: randomBase64Url(32),
      codeVerifier: "v".repeat(43),
    }),
    /already used/,
  );
});

test("rotates a desktop refresh token atomically", async (t) => {
  const refreshToken = helpers.generateRefreshToken({
    id: studentFixture.id,
    role: studentFixture.role,
    type: Enums.tokenType.refresh,
  });
  let rotatedWhere;

  stubPrismaMethod(t, prisma.student, "findFirst", async () => studentFixture);
  stubPrismaMethod(t, prisma.studentAuthLog, "findFirst", async () => ({
    id: "44444444-4444-4444-8444-444444444444",
    refreshToken,
  }));
  stubPrismaMethod(
    t,
    prisma.studentAuthLog,
    "updateMany",
    async ({ where }) => {
      rotatedWhere = where;
      return { count: 1 };
    },
  );

  const result = await desktopAuthService.refreshSession({
    refreshToken,
    installationId: "stable-installation-id-12345",
  });

  assert.ok(result.authToken);
  assert.ok(result.refreshToken);
  assert.notEqual(result.refreshToken, refreshToken);
  assert.equal(rotatedWhere.refreshToken, refreshToken);
});

test("exchanges a ready transaction once and marks it consumed", async (t) => {
  const verifier = "v".repeat(43);
  const transaction = {
    ...transactionFixture(DesktopAuthStatus.READY, randomBase64Url(32)),
    codeChallenge: sha256Base64Url(verifier),
    studentId: studentFixture.id,
  };
  let getCount = 0;
  let consumed;

  t.mock.method(desktopAuthStore, "getTransaction", async () => {
    getCount += 1;
    return transaction;
  });
  t.mock.method(desktopAuthStore, "acquireExchangeLock", async () => true);
  t.mock.method(desktopAuthStore, "releaseExchangeLock", async () => {});
  t.mock.method(desktopAuthStore, "saveTransaction", async (_id, next) => {
    consumed = next;
    return next;
  });
  stubPrismaMethod(t, prisma.student, "findFirst", async () => studentFixture);
  let authLogLookup = 0;
  stubPrismaMethod(t, prisma.studentAuthLog, "findFirst", async () => {
    authLogLookup += 1;
    return null;
  });
  stubPrismaMethod(t, prisma.studentAuthLog, "updateMany", async () => ({
    count: 0,
  }));
  stubPrismaMethod(
    t,
    prisma.studentAuthLog,
    "create",
    async ({ data }) => data,
  );

  const result = await desktopAuthService.exchange({
    transactionId: randomBase64Url(32),
    codeVerifier: verifier,
  });

  assert.ok(result.authToken);
  assert.ok(result.refreshToken);
  assert.equal(getCount, 2);
  assert.equal(authLogLookup, 2);
  assert.equal(consumed.status, DesktopAuthStatus.CONSUMED);
});
