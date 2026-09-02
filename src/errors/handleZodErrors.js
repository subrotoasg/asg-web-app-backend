//Zod Error Handler
export const handleZodError = (err) => {
  const statusCode = 400;
  //Path And Message Find in ZOdError
  const errorSource = err?.issues?.map((issue) => {
    return {
      //Zod Last Index is path so length -1 means last index of issue
      path: issue.path[issue.path.length - 1],
      message: issue.message,
    };
  });

  //Function Return Values
  return {
    statusCode,
    message: "Validation Error",
    errorSource,
  };
};
