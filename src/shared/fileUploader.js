import multer from "multer";
import path from "path";
import fs from "fs";
import config from "../app/config/index.js";
import axios from "axios";
import AppErrors from "../errors/AppErrors.js";
import { StatusCodes } from "http-status-codes";
import mime from "mime-types";
import sharp from "sharp";
import { prisma } from "../../constants/index.js";
import crypto from "crypto";
import { s3 } from "./s3Uploader.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_IMAGE_SIZE = 500 * 1024;
const MIN_QUALITY = 50;
const MAX_QUALITY = 85;

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), "src/uploads");

    // Check if the directory exists, and create it if it doesn't
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    let ext = path.extname(file.originalname);
    if (!ext) {
      const guessed = mime.extension(file.mimetype);
      ext = guessed ? `.${guessed}` : "";
    }
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Allowed file types (images & videos)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/mkv",
    "application/pdf",
    "audio/webm",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/ogg",
    "audio/mpeg",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed!"), false);
  }
};

// Define Single and Multiple Upload
const upload = multer({
  storage,
  fileFilter,
});

const singleUpload = upload.single("file"); // For single file upload
const multipleUpload = upload.array("files", 2); // For multiple file upload (max 2)

const compressImageIfNeeded = async (filePath, mimetype) => {
  try {
    const stats = await fs.promises.stat(filePath);

    if (stats.size <= MAX_IMAGE_SIZE) {
      return filePath;
    }

    const originalSize = stats.size;
    const ext = path.extname(filePath).toLowerCase();
    const compressedPath = filePath.replace(ext, `-compressed${ext}`);

    const ratio = MAX_IMAGE_SIZE / originalSize;

    let quality = Math.max(60, Math.min(85, Math.floor(100 * ratio)));

    if (mimetype === "image/png") {
      await sharp(filePath).png({ compressionLevel: 6 }).toFile(compressedPath);
    } else if (mimetype === "image/webp") {
      await sharp(filePath).webp({ quality }).toFile(compressedPath);
    } else {
      await sharp(filePath).jpeg({ quality }).toFile(compressedPath);
    }

    const compressedStats = await fs.promises.stat(compressedPath);

    let currentQuality = quality;

    while (compressedStats.size > MAX_IMAGE_SIZE && currentQuality > 55) {
      currentQuality -= 5;

      await sharp(filePath)
        .jpeg({ quality: currentQuality })
        .toFile(compressedPath);

      const newStats = await fs.promises.stat(compressedPath);
      if (newStats.size <= MAX_IMAGE_SIZE) break;
    }

    await fs.promises.unlink(filePath);
    return compressedPath;
  } catch (error) {
    console.error("Compression error:", error);
    return filePath;
  }
};

const compressImageIfNeededForProfile = async (filePath, mimetype) => {
  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.size <= MAX_IMAGE_SIZE) return filePath;

    const ext = path.extname(filePath).toLowerCase();
    const compressedPath = filePath.replace(ext, `-compressed${ext}`);

    // Get metadata first
    const metadata = await sharp(filePath).metadata();

    // First, let's create a properly oriented image by applying rotation
    // and then get a buffer to work with
    const orientedBuffer = await sharp(filePath)
      .rotate() // This applies EXIF orientation
      .toBuffer();

    // Get dimensions of the oriented image
    const orientedMetadata = await sharp(orientedBuffer).metadata();
    const width = orientedMetadata.width;
    const height = orientedMetadata.height;

    // Calculate square crop for the oriented image
    const squareSize = Math.min(width, height);
    const left = Math.floor((width - squareSize) / 2);
    const top = Math.floor((height - squareSize) / 2);

    // Validate crop coordinates
    if (
      left < 0 ||
      top < 0 ||
      left + squareSize > width ||
      top + squareSize > height
    ) {
      throw new Error(
        `Invalid crop area: ${left},${top} for ${width}x${height}`,
      );
    }

    let quality = MAX_QUALITY;
    let compressedSize = stats.size;
    let currentSize = squareSize;

    while (compressedSize > MAX_IMAGE_SIZE && quality >= MIN_QUALITY) {
      // Calculate target size based on compression ratio
      const targetWidth = Math.max(
        1,
        Math.floor(currentSize * Math.sqrt(MAX_IMAGE_SIZE / compressedSize)),
      );

      // Start from the oriented buffer each time
      let pipeline = sharp(orientedBuffer)
        .extract({ left, top, width: squareSize, height: squareSize })
        .resize(targetWidth, targetWidth, {
          fit: "cover",
          withoutEnlargement: true,
        });

      // Apply format-specific compression
      if (mimetype === "image/png") {
        pipeline = pipeline.png({ compressionLevel: 9 });
      } else if (mimetype === "image/webp") {
        pipeline = pipeline.webp({ quality });
      } else {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      }

      await pipeline.toFile(compressedPath);
      compressedSize = (await fs.promises.stat(compressedPath)).size;

      if (compressedSize <= MAX_IMAGE_SIZE) break;

      quality -= 5;
      if (quality < MIN_QUALITY) break;

      currentSize = targetWidth;
    }

    // Check result
    if (compressedSize <= MAX_IMAGE_SIZE) {
      await fs.promises.unlink(filePath); // delete original
      return compressedPath;
    } else {
      await fs.promises.unlink(compressedPath).catch(() => {});
      return filePath;
    }
  } catch (error) {
    console.error("Compression error:", error);
    return filePath;
  }
};

const uploadToBunnyCDN = async (filePath, fileName) => {
  const HOSTNAME = config.base_host_name;
  const STORAGE_ZONE_NAME = config.bunny_storage_zone_name;
  const ACCESS_KEY = config.bunny_storage_api_key;
  const CDN_URL = `https://apars.b-cdn.net/varsity`;

  try {
    const cdnPath = `${fileName}`;
    const fileData = fs.readFileSync(filePath);

    const upload = await axios.put(
      `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/varsity/${cdnPath}`,
      fileData,
      {
        headers: {
          AccessKey: ACCESS_KEY,
          "Content-Type": "application/octet-stream",
        },
      },
    );
    return `${CDN_URL}/${cdnPath}`;
  } catch (error) {
    console.error("Upload failed:", error.message);
  }
};

const uploadToBunnyCDNforProfile = async (filePath, fileName) => {
  const HOSTNAME = config.base_host_name;
  const STORAGE_ZONE_NAME = config.bunny_storage_zone_name;
  const ACCESS_KEY = config.bunny_storage_api_key;
  const CDN_URL = `https://cdn.aparsclassroom.com/dp`;

  try {
    const cdnPath = `${fileName}`;
    const fileData = fs.readFileSync(filePath);

    await axios.put(
      `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/dp/${cdnPath}`,
      fileData,
      {
        headers: {
          AccessKey: ACCESS_KEY,
          "Content-Type": "application/octet-stream",
        },
      },
    );
    return `${CDN_URL}/${cdnPath}`;
  } catch (error) {
    console.error("Upload failed:", error.message);
  }
};

// Process Uploads (Handle Both Single & Multiple)
const processFileUploads = async (req, res, next) => {
  try {
    if (!req.file && !req.files) {
      return next();
    }

    let uploadedFiles = [];

    if (req.file) {
      // Single file
      let filePath = req.file.path;
      const fileName = req.file.filename;

      if (req.file.mimetype.startsWith("image/")) {
        filePath = await compressImageIfNeeded(filePath, req.file.mimetype);
      }

      const fileUrl = await uploadToBunnyCDN(filePath, fileName);
      if (fileUrl) {
        req.photoUrl = fileUrl;
        fs.promises.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error removing temp file:`, err);
          } else {
            console.log("File deleted successfully!");
          }
        });
      }
    } else if (req.files) {
      // Multiple files
      for (let file of req.files) {
        let filePath = file.path;
        const fileName = file.filename;

        if (file.mimetype.startsWith("image/")) {
          filePath = await compressImageIfNeeded(filePath, file.mimetype);
        }

        const fileUrl = await uploadToBunnyCDN(filePath, fileName);
        if (fileUrl) {
          uploadedFiles.push(fileUrl);
          fs.promises.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error removing temp file:`, err);
            } else {
              console.log("File deleted successfully!");
            }
          });
        }
      }
    }
    req.uploadedFiles = uploadedFiles;
    return next();
  } catch (error) {
    next(error);
  }
};

function generateSecureRandomString(length = 28) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;

  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
    // Map each byte to a character in `characters`
    result += characters[randomBytes[i] % charactersLength];
  }

  return result;
}

const processFileUploadsForProfile = async (req, res, next) => {
  try {
    if (!req.file && !req.files) {
      return next();
    }

    let uploadedFiles = [];

    if (req.file) {
      // Single file
      let filePath = req.file.path;
      // console.log(req?.body, "the body");
      const getUser = await prisma.student.findFirst({
        where: {
          id: req?.body?.studentId,
        },
      });

      const uid = getUser?.uid ? getUser?.uid : generateSecureRandomString();

      const fileName = `${uid}/${req.file.filename}`;

      if (req.file.mimetype.startsWith("image/")) {
        filePath = await compressImageIfNeededForProfile(
          filePath,
          req.file.mimetype,
        );
      }

      const fileUrl = await uploadToBunnyCDNforProfile(filePath, fileName);
      if (fileUrl) {
        req.photoUrl = fileUrl;
        fs.promises.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error removing temp file:`, err);
          } else {
            console.log("File deleted successfully!");
          }
        });
      }
    } else if (req.files) {
      // Multiple files
      for (let file of req.files) {
        let filePath = file.path;
        const fileName = file.filename;

        if (file.mimetype.startsWith("image/")) {
          filePath = await compressImageIfNeeded(filePath, file.mimetype);
        }

        const fileUrl = await uploadToBunnyCDN(filePath, fileName);
        if (fileUrl) {
          uploadedFiles.push(fileUrl);
          fs.promises.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error removing temp file:`, err);
            } else {
              console.log("File deleted successfully!");
            }
          });
        }
      }
    }
    req.uploadedFiles = uploadedFiles;
    return next();
  } catch (error) {
    next(error);
  }
};

// File & Data Parser (Convert JSON)
const fileAndDataParser = async (req, res, next) => {
  try {
    if (!req?.body?.data) {
      return next();
    }
    // If `data` is a string, try to parse it
    if (typeof req.body.data === "string") {
      const parsedData = JSON.parse(req.body.data);
      req.body = { ...parsedData };
    }
    return next();
  } catch (err) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid JSON in data field");
  }
};

// Process Uploads for Notification
const uploadToBunnyCDNForNotification = async (filePath, fileName) => {
  try {
    const key = `notification/${fileName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: config.bunny_s3_access_key,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: "application/octet-stream",
      }),
    );
    return `https://marketing.cdn.aparsclassroom.com/${key}`;
  } catch (error) {
    console.error("Upload failed:", error.message);
  }
};

const processFileUploadsForNotification = async (req, res, next) => {
  try {
    if (!req.file && !req.files) {
      return next();
    }

    let uploadedFiles = [];

    if (req.file) {
      // Single file
      let filePath = req.file.path;
      const fileName = req.file.filename;

      if (req.file.mimetype.startsWith("image/")) {
        filePath = await compressImageIfNeeded(filePath, req.file.mimetype);
      }

      const fileUrl = await uploadToBunnyCDNForNotification(filePath, fileName);
      if (fileUrl) {
        req.photoUrl = fileUrl;
        fs.promises.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error removing temp file:`, err);
          } else {
            console.log("File deleted successfully!");
          }
        });
      }
    } else if (req.files) {
      // Multiple files
      for (let file of req.files) {
        let filePath = file.path;
        const fileName = file.filename;

        if (file.mimetype.startsWith("image/")) {
          filePath = await compressImageIfNeeded(filePath, file.mimetype);
        }

        const fileUrl = await uploadToBunnyCDNForNotification(
          filePath,
          fileName,
        );
        if (fileUrl) {
          uploadedFiles.push(fileUrl);
          fs.promises.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error removing temp file:`, err);
            } else {
              console.log("File deleted successfully!");
            }
          });
        }
      }
    }
    req.uploadedFiles = uploadedFiles;
    return next();
  } catch (error) {
    next(error);
  }
};

export const fileUploader = {
  singleUpload,
  multipleUpload,
  fileAndDataParser,
  processFileUploads,
  processFileUploadsForNotification,
  processFileUploadsForProfile,
};
