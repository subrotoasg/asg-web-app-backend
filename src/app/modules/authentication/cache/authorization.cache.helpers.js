export function getAuthorizationEntityId(req, extraExcludedKeys = []) {
  const body = req?.body || {};
  const query = req?.query || {};
  const params = req?.params || {};
  const excludedKeys = new Set([
    "adminid",
    "superadminid",
    "studentid",
    "solverid",
    "videoid",
    "tsid",
    "libraryid",
    "bunnyvideoid",
    ...extraExcludedKeys?.map((key) => key.toLowerCase()),
  ]);

  const idKey = Object.keys(body)?.find((key) => {
    const normalized = key.toLowerCase();

    return normalized.includes("id") && !excludedKeys.has(normalized);
  });

  return params?.id || (idKey ? body[idKey] : undefined) || query?.id;
}
