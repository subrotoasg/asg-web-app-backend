import multer from "multer";
import { fileUploader } from "../../shared/fileUploader.js";

// Middleware to handle file upload or text-only form-data
export const handleFileUpload = (req, res, next) => {
  const uploadTextOnly = multer().none();
  const previousBody = req?.body;

  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    return fileUploader.singleUpload(req, res, (err) => {
      //Set Auth Access User Info
      req.user = { ...previousBody };
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return next();
    });
  } else {
    return uploadTextOnly(req, res, next);
  }
};

// Middleware to handle file upload or text-only form-data
export const handleMultipuleFileUpload = (req, res, next) => {
  const uploadTextOnly = multer().none();
  const previousBody = req?.body;

  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    return fileUploader.multipleUpload(req, res, (err) => {
      req.user = { ...previousBody };
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return next();
    });
  } else {
    return uploadTextOnly(req, res, next);
  }
};
