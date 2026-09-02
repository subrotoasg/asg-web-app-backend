import { S3Client } from "@aws-sdk/client-s3";
import config from "../app/config/index.js";

export const s3 = new S3Client({
  region: "sg",
  endpoint: `https://${config.bunny_s3_base_url}`,
  credentials: {
    accessKeyId: config.bunny_s3_access_key,
    secretAccessKey: config.bunny_s3_secret_access_key,
  },
  forcePathStyle: true,
});
