import axios from "axios";
import config from "../app/config/index.js";

// Helper to extract path from full BunnyCDN URL
const extractFilePath = (fileUrl) => {
  try {
    const parsed = new URL(fileUrl);
    return parsed.pathname.startsWith("/")
      ? parsed.pathname.slice(1)
      : parsed.pathname;
  } catch {
    // If it's already a relative path, just return as-is
    return fileUrl;
  }
};

const isValidFilePath = (filePath) => {
  if (!filePath) return false;
  if (typeof filePath !== "string") return false;
  if (filePath.trim() === "") return false;
  if (filePath.endsWith("/")) return false;
  if (filePath === config.bunny_storage_zone_name) return false;
  if (!filePath.includes(".") && !filePath.includes("-")) return false;
  return true;
};

// const deleteFromBunnyCDN = async (fileUrl) => {
//   try {
//     if (!fileUrl) {
//       console.error("deleteFromBunnyCDN: fileUrl is empty or null");
//       return false;
//     }

//     const filePath = extractFilePath(fileUrl);

//     if (!isValidFilePath(filePath)) {
//       console.error(
//         `deleteFromBunnyCDN: BLOCKED dangerous path → "${filePath}"`,
//       );
//       return false;
//     }

//     const response = await axios({
//       method: "DELETE",
//       url: `https://${config.base_host_name}/${config.bunny_storage_zone_name}/${filePath}`,
//       headers: {
//         AccessKey: config.bunny_storage_api_key,
//       },
//     });
//     return true;
//   } catch (error) {
//     console.log(`Failed to delete from BunnyCDN: ${error.message}`);
//     return false;
//   }
// };

export const removeFiles = {
  // deleteFromBunnyCDN,
};
