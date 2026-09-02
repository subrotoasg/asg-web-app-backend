import AppErrors from "../../../../../../errors/AppErrors.js";

export const normalizePlatform = (p) => {
  const v = String(p || "")
    .trim()
    .toUpperCase();
  if (!v) return "WEB";
  if (v === "WEB" || v === "ANDROID" || v === "IOS") return v;
  throw new AppErrors(400, "Invalid platform. Use WEB | ANDROID | IOS");
};

export const sanitizeToken = (t) => String(t || "").trim();
