import catchAsync from "../../utlis/catchAsync.js";
import { helpers } from "../superAdmin/admin/admin.utils.js";

const validatePhone = catchAsync(async (req, res, next) => {
  const { isValid, type } = helpers.distinguisePhoneAndEmail(
    req?.body?.emailOrPhone
  );
  if (type === "phone") {
    req.body.emailOrPhone = helpers.trimBDCountryCode(req?.body?.emailOrPhone);
  }
  // console.log(req.body.emailOrPhone);
  next();
});

export const authMiddleware = {
  validatePhone,
};
