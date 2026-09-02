import { StatusCodes } from "http-status-codes";
import { Prisma } from "@prisma/client";

const handlePrismaError = (err) => {
  console.log(err);
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong with the database";
  let errorSource = [
    {
      path: "",
      message: message,
    },
  ];

  // Handle known Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        // Unique constraint failed
        statusCode = StatusCodes.BAD_REQUEST;
        message = "Duplicate Value Assigned";
        errorSource = [
          {
            path: err.meta?.target?.join(", ") || "",
            message: `${err.meta?.target?.join(", ") || "Field"} is already taken`,
          },
        ];
        break;

      case "P2003":
        // Foreign key constraint failed
        statusCode = StatusCodes.BAD_REQUEST;
        message = "Invalid Reference ID";
        errorSource = [
          {
            path: "",
            message: err.message,
          },
        ];
        break;

      case "P2025":
        // Record not found
        statusCode = StatusCodes.NOT_FOUND;
        message = "Record not found";
        errorSource = [
          {
            path: "",
            message: "Data not found for the given ID",
          },
        ];
        break;

      default:
        message = err.message;
        errorSource = [
          {
            path: "",
            message: err.message,
          },
        ];
        break;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Validation failed in Prisma query";
    errorSource = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  return {
    statusCode,
    message,
    errorSource,
  };
};

export default handlePrismaError;
