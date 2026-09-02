import catchAsync from "../utlis/catchAsync.js";

const validationRequest = (validationSchemaName) => {
  return catchAsync(async (req, res, next) => {
    //Zod validation
    await validationSchemaName.parseAsync({
      body: req.body,
      cookies: req.cookies,
    });
    return next();
  });
};

export default validationRequest;
