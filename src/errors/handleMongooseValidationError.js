export const handleMongooseValidationError = (err) => {
  const statusCode = 404;
  //Path And Message Find in ZOdError
  const errorSource = Object.values(err?.errors).map((val) => {
    return {
      path: val?.path,
      message: val?.message,
    };
  });

  //Function Return Values
  return {
    statusCode,
    message: "Validation Error",
    errorSource,
  };
};
