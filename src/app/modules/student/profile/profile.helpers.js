import { allowedUpdatedFields } from "./profile.constants.js";

export const filteredPayload = (payload = {}) => {
  const result = Object.keys(payload)
    ?.filter((key) => allowedUpdatedFields?.includes(key))
    ?.reduce((obj, key) => {
      obj[key] = payload[key];
      return obj;
    }, {});

  return result;
};
