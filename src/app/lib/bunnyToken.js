import crypto from "node:crypto";

const MODE = process.env.BUNNY_TOKEN_MODE === "hs256" ? "hs256" : "standard";

function base64url(buffer) {
  return buffer
    ?.toString("base64")
    ?.replace(/\n/g, "")
    ?.replace(/\+/g, "-")
    ?.replace(/\//g, "_")
    ?.replace(/=/g, "");
}

function buildToken({
  securityKey,
  signaturePath,
  expires,
  params,
  userIp,
  mode,
}) {
  const sorted = Object.keys(params)?.sort();
  const signingData = sorted
    ?.filter((key) => params[key] !== "")
    ?.map((key) => `${key}=${params[key]}`)
    ?.join("&");

  if (mode === "hs256") {
    const message = `${signaturePath}${expires}${signingData}${userIp}`;
    return (
      "HS256-" +
      base64url(
        crypto.createHmac("sha256", securityKey).update(message).digest(),
      )
    );
  }

  const message = `${securityKey}${signaturePath}${expires}${userIp}${signingData}`;
  return base64url(crypto.createHash("sha256").update(message).digest());
}

export function signDirectoryUrl({
  host,
  path,
  tokenPath,
  securityKey,
  expiresIn = 7200,
  userIp = "",
  countriesAllowed,
  countriesBlocked,
  speedLimit,
  mode = MODE,
}) {
  const cleanHost = String(host || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  if (!cleanHost) throw new Error("bunny: host missing");
  if (!securityKey) return `https://${cleanHost}${path}`;

  const expires = Math.floor(Date.now() / 1000) + expiresIn;

  const params = {};
  if (countriesAllowed) params.token_countries = countriesAllowed;
  if (countriesBlocked) params.token_countries_blocked = countriesBlocked;
  if (speedLimit) params.limit = String(speedLimit);
  params.token_path = tokenPath;

  const token = buildToken({
    securityKey,
    signaturePath: tokenPath,
    expires,
    params,
    userIp: userIp || "",
    mode,
  });

  const query = Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  return `https://${cleanHost}/bcdn_token=${token}&${query}&expires=${expires}${path}`;
}

export function signHlsUrl({
  host,
  videoId,
  securityKey,
  expiresIn = 7200,
  userIp = "",
  file = "playlist.m3u8",
  mode,
}) {
  return signDirectoryUrl({
    host,
    path: `/${videoId}/${file}`,
    tokenPath: `/${videoId}/`,
    securityKey,
    expiresIn,
    userIp,
    mode,
  });
}

export function signThumbnail({
  host,
  videoId,
  securityKey,
  expiresIn = 7200,
  mode,
}) {
  return signDirectoryUrl({
    host,
    path: `/${videoId}/thumbnail.jpg`,
    tokenPath: `/${videoId}/`,
    securityKey,
    expiresIn,
    mode,
  });
}
