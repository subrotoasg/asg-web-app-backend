const sendResponse = (res, data) => {
  return res.status(data?.statusCodes).json({
    success: data?.success,
    message: data?.message,
    data: data?.data,
    meta: data?.meta || null,
  });
};
export default sendResponse;
