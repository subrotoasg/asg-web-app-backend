import { StatusCodes } from "http-status-codes";
import config from "../config/index.js";
import AppErrors from "../../errors/AppErrors.js";
import { handleZodError } from "../../errors/handleZodErrors.js";
import { handleMongooseValidationError } from "../../errors/handleMongooseValidationError.js";
import handleCastErrors from "./handleCastErrors.js";
import handleDuplicateError from "./handleDuplicateError.js";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import handlePrismaError from "./handlePrismaError.js";

const globalErrorHandler = (err, req, res, next) => {
  //Default Values
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong";

  //Defaul Error Sources
  let errorSourses = [
    {
      path: "",
      message: "Something went wrong",
    },
  ];

  //Checking Error Where The error occurs
  if (err instanceof ZodError) {
    //Zod Error Validation Error
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSourses = simplifiedError.errorSource;
  } else if (err?.name === "ValidationError") {
    //Mongoose Error
    const simplifiedError = handleMongooseValidationError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSourses = simplifiedError.errorSource;
  } else if (err.name === "CastError") {
    //Cast error want to string not assign string as like as
    const simplifiedError = handleCastErrors(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSourses = simplifiedError.errorSource;
  } else if (err.code === 11000) {
    //Duplicated Value Error for Unique Key
    const simplifiedError = handleDuplicateError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSourses = simplifiedError.errorSource;
  } else if (err instanceof AppErrors) {
    //Custome AppErrors Class
    statusCode = err?.statusCode;
    message = err?.message;
    errorSourses = [
      {
        path: "",
        message: err?.message,
      },
    ];
  } else if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError
  ) {
    //prisma Error Handle
    const simplifiedError = handlePrismaError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSourses = simplifiedError.errorSource;
  } else if (err instanceof Error) {
    //Throw new Error
    message = err?.message;
    errorSourses = [
      {
        path: "",
        message: err?.message,
      },
    ];
  }

  return res.status(statusCode).json({
    success: false,
    message: message || err.message,
    erroSourses: errorSourses,
    stack: config.node_env === "development" ? err?.stack : null,
  });
};

export default globalErrorHandler;
