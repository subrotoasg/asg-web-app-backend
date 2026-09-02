const handleCastErrors = (err) => {
  console.log("error trace", err);
  const statusCode = 400;
  //Path And Message
  const errorSource = [
    {
      path: err?.path,
      message: err?.message,
    },
  ];
  //Function Return Values
  return {
    statusCode,
    message: "Invalid ID",
    errorSource,
  };
};
export default handleCastErrors;
