import { StatusCodes } from "http-status-codes";

const notFoundRoute = (req, res, next) => {
  return res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: "API Not Found !",
    error: "",
  });
};
export default notFoundRoute;
