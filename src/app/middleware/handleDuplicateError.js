const handleDuplicateError = (err) => {
  console.log("error trace", err);
  const statusCode = 400;

  const match = err?.message?.match(/"([^"]*)"/);
  const extractValueFromMessage = match && match[1];
  //Path And Message Find in ZOdError
  const errorSource = [
    {
      path: "",
      message: `${extractValueFromMessage} is already exists`,
    },
  ];
  //Function Return Values
  return {
    statusCode,
    message: "Duplicate Value Assigned",
    errorSource,
  };
};
export default handleDuplicateError;
