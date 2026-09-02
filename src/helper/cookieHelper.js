import * as dotenv from "dotenv";
import config from "../app/config/index.js";
import crypto from "node:crypto";
dotenv.config();

const setCookie = (res, key, value) => {
  res.cookie(key, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

const clearTheCookie = (res, key) => {
  res.clearCookie(key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    path: "/",
  });
};

const getFrontendHost = (req) => {
  const platform = String(req.headers.platform || "").toLowerCase();
  const installationId = String(
    req.headers["x-acs-installation-id"] || "",
  ).trim();

  if (
    ["mac", "linux", "windows"].includes(platform) &&
    installationId.length >= 16 &&
    installationId.length <= 200
  ) {
    const installationHash = crypto
      .createHash("sha256")
      .update(installationId, "utf8")
      .digest("hex")
      .slice(0, 32);
    return `acs-desktop:${installationHash}`;
  }

  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  return hostName;
};

const refreshCookieName = (host) => `rt_${host.replace(/[^a-z0-9]/gi, "_")}`;

export const CookieHelper = {
  setCookie,
  clearTheCookie,
  getFrontendHost,
  refreshCookieName,
};
