export function syncIsActiveWithIsDefault(data) {
  let isDefaultBoolean;
  if (typeof data.isDefault === "string") {
    const lowered = data.isDefault.trim().toLowerCase();
    if (lowered === "true") isDefaultBoolean = true;
    else if (lowered === "false") isDefaultBoolean = false;
  } else if (typeof data.isDefault === "boolean") {
    isDefaultBoolean = data.isDefault;
  }

  if (typeof isDefaultBoolean === "boolean") {
    data.isDefault = isDefaultBoolean;
    data.isActive = isDefaultBoolean;
  }
  if (typeof data.isActive === "string") {
    const lowered = data.isActive.trim().toLowerCase();
    data.isActive = lowered === "true";
  }

  return data;
}
