import crypto from "crypto";

export const signBunnyUrl = ({ fullUrl, secretKey, ttlSeconds = 300, ip }) => {
  const url = new URL(fullUrl);
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const path = url.pathname;
  let hashSource = secretKey + path + expires;
  if (ip) {
    hashSource += ip;
  }
  const md5 = crypto.createHash("md5").update(hashSource, "utf8").digest();
  let token = Buffer.from(md5).toString("base64");
  token = token.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  url.searchParams.set("token", token);
  url.searchParams.set("expires", String(expires));

  return url.toString();
};
