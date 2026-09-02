export const DESKTOP_AUTH = Object.freeze({
  transactionTtlSeconds: 10 * 60,
  consumedTtlSeconds: 60,
  exchangeLockTtlSeconds: 2 * 60,
  redisPrefix: "desktop-auth",
  deepLinkBase: "acs://auth/callback",
});

export const DesktopAuthStatus = Object.freeze({
  PENDING: "PENDING",
  READY: "READY",
  ACCOUNT_LINK_REQUIRED: "ACCOUNT_LINK_REQUIRED",
  REGISTRATION_REQUIRED: "REGISTRATION_REQUIRED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  CONSUMED: "CONSUMED",
});

export const desktopAuthTerminalStatuses = new Set([
  DesktopAuthStatus.FAILED,
  DesktopAuthStatus.CANCELLED,
  DesktopAuthStatus.CONSUMED,
]);
