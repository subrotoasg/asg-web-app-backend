import axios from "axios";
import qs from "qs";
import { prisma } from "./constants/index.js";
// import fs from "fs";
import path from "path";
import config from "./src/app/config/index.js";
import crypto from "crypto";
import https from "https";
import { pipeline } from "stream/promises";
import pLimit from "p-limit";
import { spawn } from "child_process";
import util from "util";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import fsPromises from "fs/promises";
import fs from "fs/promises";
// const execPromise = util.promisify(exec);
import {
  findCourseByCourseSubjectChapter,
  findCourseByCycle,
  findCourseByCycleSubjectChapter,
  findCycleByCycleSubjectChapter,
  logCycleLookUpTable,
  logLookUpTable,
  newfindCourseByAnyHierarchyId,
} from "./src/app/middleware/handleCourseAuth.js";

// const DRY_RUN = false;
// const CONCURRENCY = 10;

// const dbHelper = async () => {
//   const stats = {
//     totalStudents: 0,
//     processed: 0,
//     updated: 0,
//     skipped: 0,
//     failed: 0,
//   };

//   console.log("[START] Institution update job started");

//   const getCourse = await prisma.course.findFirst({
//     where: { productId: "621" },
//   });

//   if (!getCourse) {
//     console.error("[ABORT] Course not found");
//     return;
//   }

//   const getStudents = await prisma.courseStudent.findMany({
//     where: { courseId: getCourse.id },
//   });

//   stats.totalStudents = getStudents.length;

//   const limit = pLimit(CONCURRENCY);

//   await Promise.all(
//     getStudents.map((student, index) =>
//       limit(async () => {
//         const logBase = {
//           index: index + 1,
//           courseStudentId: student.id,
//           studentId: student.studentId,
//           accessCode: student.accessCode,
//         };

//         try {
//           stats.processed++;

//           if (!student?.accessCode || student.accessCode.length <= 3) {
//             stats.skipped++;
//             console.warn("[SKIP_INVALID_ACCESS_CODE]", logBase);
//             return;
//           }

//           const tranId = student.accessCode.slice(0, -3);

//           const response = await axios.post(
//             "https://secure.apars.shop/query/transaction",
//             new URLSearchParams({ tran_id: tranId }),
//             {
//               headers: {
//                 "Content-Type": "application/x-www-form-urlencoded",
//               },
//               timeout: 15000,
//             },
//           );

//           const tranx = response?.data?.tranx;

//           const isValid =
//             response?.data?.status === 200 &&
//             tranx &&
//             ["VALID", "VALIDATED"].includes(tranx.status);

//           if (!isValid) {
//             stats.skipped++;
//             console.warn("[SKIP_INVALID_TRANSACTION]", {
//               ...logBase,
//               tranId,
//               apiStatus: response?.data?.status,
//               transactionStatus: tranx?.status,
//             });
//             return;
//           }

//           if (!tranx?.Institution) {
//             stats.skipped++;
//             console.warn("[SKIP_NO_INSTITUTION]", {
//               ...logBase,
//               tranId,
//             });
//             return;
//           }

//           if (DRY_RUN) {
//             console.log("[DRY_RUN_UPDATE]", {
//               studentId: student.studentId,
//               institution: tranx.Institution,
//             });
//           } else {
//             await prisma.student.update({
//               where: { id: student.studentId },
//               data: { institution: tranx.Institution },
//             });

//             console.log("[DB_UPDATE_SUCCESS]", {
//               studentId: student.studentId,
//               institution: tranx.Institution,
//             });
//           }

//           stats.updated++;
//         } catch (error) {
//           stats.failed++;

//           console.error("[ERROR_PROCESSING_STUDENT]", {
//             ...logBase,
//             message: error?.message,
//             status: error?.response?.status,
//             responseData: error?.response?.data,
//           });
//         }
//       }),
//     ),
//   );

//   console.log("[FINISH] Institution update job completed", stats);
// };

// dbHelper()
//   .catch((error) => {
//     console.error("[FATAL_ERROR]", {
//       message: error?.message,
//       stack: error?.stack,
//     });
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

// const dbHelper = async () => {
//   const getCourse = await prisma.course.findFirst({
//     where: {
//       productId: "621",
//     },
//   });

//   const getStudents = await prisma.courseStudent.findMany({
//     where: {
//       courseId: getCourse?.id,
//     },
//   });

//   for (const student of getStudents) {
//     try {
//       const acc = student?.accessCode.slice(0, -3);

//       const response = await axios.post(
//         "https://secure.apars.shop/query/transaction",
//         { tran_id: acc },
//         {
//           headers: {
//             "Content-Type": "application/x-www-form-urlencoded",
//           },
//         },
//       );

//       if (
//         response?.data?.status === 200 &&
//         response?.data?.tranx &&
//         (response?.data?.tranx?.status === "VALID" ||
//           response?.data?.tranx?.status === "VALIDATED")
//       ) {
//         const updateStudent = await prisma.student.update({
//           where: {
//             id: student?.studentId,
//           },
//           data: {
//             institution: response?.data?.tranx?.Institution,
//           },
//         });
//       }
//     } catch (error) {
//       console.log(error, "error on getting transaction");
//     }
//   }
// };

// dbHelper();

// const dbHelper = async () => {
//   const getAllStudents = await prisma.student.findMany({
//     where: {
//       uid: null,
//     },
//   });

//   const getCount = await prisma.student.count({
//     where: {
//       uid: null,
//     },
//   });

//   console.log(getCount, "the count");

//   for (const s of getAllStudents) {
//     const getAccessCode = await prisma.courseStudent.findMany({
//       where: {
//         studentId: s?.id,
//       },
//     });

//     if (getAccessCode?.length <= 0) continue;

//     console.log(getAccessCode[0]);

//     const accessCodes = [];

//     accessCodes.push(getAccessCode[0].accessCode?.substring(0, 33));
//     accessCodes.push(getAccessCode[0].accessCode?.substring(0, 34));
//     accessCodes.push(getAccessCode[0].accessCode?.substring(0, 35));

//     for (const acc of accessCodes) {
//       const data = qs.stringify({
//         tran_id: acc,
//       });

//       try {
//         const response = await axios.post(
//           "https://secure.apars.shop/query/transaction",
//           data,
//           {
//             headers: {
//               "Content-Type": "application/x-www-form-urlencoded",
//             },
//           }
//         );

//         console.log(response?.data?.status, "status");

//         if (
//           response?.data?.status === 200 &&
//           response?.data?.tranx &&
//           (response?.data?.tranx?.status === "VALID" ||
//             response?.data?.tranx?.status === "VALIDATED")
//         ) {
//           const updateUid = await prisma.student.update({
//             where: {
//               id: s?.id,
//             },
//             data: {
//               uid: response?.data?.tranx?.uid,
//             },
//           });

//           console.log(
//             s?.name,
//             "---uid update to---",
//             response?.data?.tranx?.uid
//           );
//         }
//       } catch (error) {
//         console.log(error, "error");
//       }
//     }
//   }
// };

// dbHelper();

// const HOSTNAME = config.base_host_name;
// const STORAGE_ZONE_NAME = config.bunny_storage_zone_name;
// const ACCESS_KEY = config.bunny_storage_api_key;
// const CDN_URL = `https://apars.b-cdn.net/varsity`;

// const tableFieldMap = {
//   classContent: ["thumbneil", "lectureSheet", "practiceSheet", "solutionSheet"],
//   cycleContent: ["thumbneil", "lectureSheet", "practiceSheet", "solutionSheet"],
//   student: ["profilePhoto"],
//   admin: ["photo"],
//   chapter: ["chapterImage"],
//   subject: ["subjectImage"],
//   course: ["courseImage", "ProductImage"],
//   liveClass: [
//     "thumbnail",
//     "thumbnailPath",
//     "thumbnail256x144Path",
//     "slidesUrl",
//   ],
//   quoraImage: ["imageUrl"],
//   featured: ["image"],
//   noticeORroutine: ["image"],
//   answer: ["answerFile", "audioFile"],
//   answerComment: ["commentFile", "audioFile"],
// };

// async function migrateColumn(table, column) {
//   console.log(`Migrating ${table}.${column}...`);

//   const records = await prisma[table].findMany({
//     where: {
//       [column]: {
//         startsWith: "https://apars.b-cdn.net/varsity/chapter_chapterImage", // change this to your old CDN prefix
//       },
//     },
//   });

//   for (const record of records) {
//     const oldUrl = record[column];
//     if (!oldUrl) continue;

//     try {
//       // Download the file
//       const response = await axios.get(oldUrl, { responseType: "arraybuffer" });
//       const buffer = Buffer.from(response.data, "binary");

//       // Generate unique file name
//       const fileName = `${table}_${column}_${record.id}_${path.basename(oldUrl)}`;

//       // Upload to BunnyCDN
//       const uploadUrl = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/varsity/${fileName}`;
//       await axios.put(uploadUrl, buffer, {
//         headers: {
//           AccessKey: ACCESS_KEY,
//           "Content-Type": "application/octet-stream",
//         },
//       });

//       // Update DB
//       await prisma[table].update({
//         where: { id: record.id },
//         data: { [column]: `${CDN_URL}/${fileName}` },
//       });

//       console.log(
//         `Migrated ${table}.${column}: ${oldUrl} → ${CDN_URL}/${fileName}`
//       );
//     } catch (err) {
//       console.error(
//         `Error migrating ${table}.${column} for ID ${record.id}:`,
//         err.message
//       );
//     }
//   }
// }

// async function migrateAll() {
//   for (const table of Object.keys(tableFieldMap)) {
//     const columns = tableFieldMap[table];
//     for (const column of columns) {
//       await migrateColumn(table, column);
//     }
//   }
//   console.log("Migration complete!");
// }

// migrateAll()
//   .then(() => prisma.$disconnect())
//   .catch((err) => {
//     console.error(err);
//     prisma.$disconnect();
//   });

// const newLibraryId = "533594";

// const videoMigration = async () => {
//   for (const el of datas) {
//     try {
//       const update = await prisma.classContent.update({
//         where: {
//           id: el?.id,
//           videoUrl: el?.oldVideoId,
//         },
//         data: {
//           videoUrl: el?.newVideoId,
//           libraryId: newLibraryId,
//         },
//       });
//       console.log("done updating", update);
//     } catch (error) {
//       console.log("error updating", el?.id);
//     }
//   }
// };

// videoMigration();
// console.log("hello");

// const libraryId = "192949";

// const classContents = [];

// const bulkUpload = async () => {
//   for (const course of classContents) {
//     if (!course?.cycleSubjectChapterId) continue;
//     const getCycle = await findCycleByCycleSubjectChapter(
//       course?.cycleSubjectChapterId,
//     );

//     const getCouse = await findCourseByCycle(getCycle?.id);

//     for (const content of course?.content) {
//       const data = {
//         cycleSubjectChapterId: course?.cycleSubjectChapterId,
//         classTitle: content?.Video_Description,
//         classNo: content?.Class,
//         hostingType: content?.bunny ? "bunny" : "premyt",
//         libraryId: content?.bunny ? libraryId : null,
//         videoUrl: content?.bunny
//           ? content?.bunny
//           : content?.yt
//             ? content?.yt
//             : content?.Video_Id,
//         description: content?.Video_Description,
//         lectureSheet: content?.Slides,
//         instructor: content?.Instructor,
//         thumbneil: content?.thumbnail_path,
//       };

//       const upload = await prisma.cycleContent.create({ data: data });

//       await logLookUpTable(upload?.id, getCouse?.id);

//       await logCycleLookUpTable(upload?.id, getCycle?.id);
//     }
//   }
// };

// bulkUpload();

// const migrateToClient = async () => {
//   const romboshCourses = ["Math27", "Math26", "decoder_26", "decoder_27"];
//   const getCourses = await prisma.course.findMany({
//     where: {
//       isDeleted: false,
//       markAsArchieve: false,
//       productName: {
//         notIn: romboshCourses,
//       },
//       // pullzoneId: null,
//     },
//   });

//   const webhookUrl =
//     "https://api.varsity.aparsclassroom.com/api/v1/media/live-class/status/change";

//   const mediaToken =
//     "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiYWRtaW4iLCJ1c2VybmFtZSI6IjQwNCIsImlzQWRtaW4iOnRydWUsImlhdCI6MTc3MjA3NDU4NiwiZXhwIjoxNzcyMTYwOTg2fQ.-zM0R3KyT0mRxeXG7bECqET2jInlH6Fv_MfDkqICxLo";

//   for (const courses of getCourses) {
//     try {
//       const data = {
//         Name: courses?.productName,
//         OriginUrl: "https://streaming.aparsclassroom.com:5443/Flow/streams",
//         AllowedReferrers: ["*.aparsclassroom"],
//         BlockNoneReferrer: true,
//         VerifyOriginSSL: true,
//         Type: 1,
//         EnableSmartCache: true,
//         BlockRootPathAccess: true,
//         BlockPostRequests: true,
//         EnableAutoSSL: true,
//       };

//       const createBunnyPullZone = await axios.post(
//         "https://api.bunny.net/pullzone",
//         data,
//         {
//           headers: {
//             AccessKey: config.bunny_main_api_key,
//           },
//         },
//       );

//       console.log(createBunnyPullZone?.data, "the create pullzone");

//       const pullZoneId = createBunnyPullZone?.data?.Id;
//       const cdnwithouthttp = createBunnyPullZone?.data?.Hostnames[0].Value;
//       const cdnConfig = `https://${createBunnyPullZone?.data?.Hostnames[0].Value}`;

//       const sslData = {
//         Hostname: cdnwithouthttp,
//         ForceSSL: true,
//       };

//       const forcessl = await axios.post(
//         `https://api.bunny.net/pullzone/${pullZoneId}/setForceSSL`,
//         sslData,
//         {
//           headers: {
//             AccessKey: config.bunny_main_api_key,
//           },
//         },
//       );

//       const m3u8Data = {
//         Description: ".m3u8 playlist",
//         OrderIndex: 1,
//         Enabled: true,
//         ActionType: 5,
//         ActionParameter1: "Access-Control-Allow-Origin",
//         ActionParameter2: "*",
//         ActionParameter3: null,
//         ExtraActions: [
//           {
//             ActionType: 5,
//             ActionParameter1: "Access-Control-Allow-Methods",
//             ActionParameter2: "GET, HEAD, OPTIONS",
//             ActionParameter3: null,
//           },
//           {
//             ActionType: 5,
//             ActionParameter1: "Access-Control-Allow-Headers",
//             ActionParameter2: "Range, Content-Type",
//             ActionParameter3: null,
//           },
//           {
//             ActionType: 5,
//             ActionParameter1: "Access-Control-Expose-Headers",
//             ActionParameter2: "Content-Length, Content-Range",
//             ActionParameter3: null,
//           },
//           {
//             ActionType: 3,
//             ActionParameter1: 3,
//             ActionParameter2: null,
//           },
//           {
//             ActionType: 16,
//             ActionParameter1: 0,
//             ActionParameter2: null,
//           },
//         ],
//         TriggerMatchingType: 0,
//         Triggers: [
//           {
//             Type: 0,
//             PatternMatchingType: 0,
//             PatternMatches: ["*.m3u8"],
//             Parameter1: null,
//           },
//         ],
//       };

//       const m3u8EdgeRule = await axios.post(
//         `https://api.bunny.net/pullzone/${pullZoneId}/edgerules/addOrUpdate`,
//         m3u8Data,
//         {
//           headers: {
//             AccessKey: config.bunny_main_api_key,
//           },
//         },
//       );

//       const tsData = {
//         Description: ".ts segments",
//         OrderIndex: 2,
//         Enabled: true,
//         ActionType: 5,
//         ActionParameter1: "Access-Control-Allow-Origin",
//         ActionParameter2: "*",
//         ActionParameter3: null,
//         ExtraActions: [
//           {
//             ActionType: 5,
//             ActionParameter1: "Access-Control-Allow-Methods",
//             ActionParameter2: "GET, HEAD, OPTIONS",
//             ActionParameter3: null,
//           },
//           {
//             ActionType: 5,
//             ActionParameter1: "Access-Control-Allow-Headers",
//             ActionParameter2: "Range, Content-Type",
//             ActionParameter3: null,
//           },
//           {
//             ActionType: 5,
//             ActionParameter1: "Access-Control-Expose-Headers",
//             ActionParameter2: "Content-Length, Content-Range",
//             ActionParameter3: null,
//           },
//           {
//             ActionType: 3,
//             ActionParameter1: 86400,
//             ActionParameter2: null,
//           },
//           {
//             ActionType: 16,
//             ActionParameter1: 3600,
//             ActionParameter2: null,
//           },
//         ],
//         TriggerMatchingType: 0,
//         Triggers: [
//           {
//             Type: 0,
//             PatternMatchingType: 0,
//             PatternMatches: ["*.ts"],
//             Parameter1: null,
//           },
//         ],
//       };

//       const tsEdgeRule = await axios.post(
//         `https://api.bunny.net/pullzone/${pullZoneId}/edgerules/addOrUpdate`,
//         tsData,
//         {
//           headers: {
//             AccessKey: config.bunny_main_api_key,
//           },
//         },
//       );

//       const mediaClientData = {
//         name: `${courses?.productName}.aparsclassroom.com`,
//         cdnConfig: {
//           cdnUrl: cdnConfig,
//           bunnyApiKey: config.bunny_main_api_key,
//           bunnyPullZoneId: pullZoneId,
//         },
//         webhookConfig: {
//           url: webhookUrl,
//           secret: crypto.randomBytes(32).toString("hex"),
//           enabled: true,
//         },
//       };

//       const createClient = await axios.post(
//         "https://media.aparsclassroom.com/api/admin/clients",
//         mediaClientData,
//         {
//           headers: {
//             Authorization: mediaToken,
//           },
//         },
//       );

//       console.log(createClient?.data, "create client id log");

//       const clientId = createClient?.data?.data?.clientId;
//       const authKey = createClient?.data?.data?.authKey;

//       const updateCourse = await prisma.course.update({
//         where: {
//           id: courses?.id,
//         },
//         data: {
//           pullzoneId: `${pullZoneId}`,
//           clientId: clientId,
//           authKey: authKey,
//           cdnConfig: cdnConfig,
//           bunnyApiKey: config.bunny_main_api_key,
//         },
//       });
//     } catch (error) {
//       console.log(error, "error creating new client");
//     }
//   }
// };

// migrateToClient();

// const migrateToCdn = async () => {
//   const romboshCourses = [
//     "Math27",
//     "Math26",
//     "decoder_26",
//     "decoder_27",
//     "medimath25",
//     "FREE ARCHIVE",
//   ];

//   const getCourses = await prisma.course.findMany({
//     where: {
//       isDeleted: false,
//       markAsArchieve: false,
//       productName: {
//         notIn: romboshCourses,
//       },
//       libraryId: null,
//     },
//   });

//   for (const course of getCourses) {
//     try {
//       const data = {
//         productName: course?.productName,
//       };
//       const doit = await axios.post(
//         "https://api.varsity.aparsclassroom.com/api/v1/utils/add-bunny-storage-services",
//         data,
//       );
//       console.log(doit?.data?.message, "do it response");
//     } catch (error) {
//       console.log(error, "error adding storage");
//     }
//   }
// };

// migrateToCdn();

// const migrateFromCycleToCourse = async () => {
//   const romboshCourses = [
//     "Math27",
//     "Math26",
//     "decoder_26",
//     "decoder_27",
//     "medimath25",
//     "FREE ARCHIVE",
//   ];

//   const getCourses = await prisma.course.findMany({
//     where: {
//       isDeleted: false,
//       markAsArchieve: false,
//       productName: {
//         notIn: romboshCourses,
//       },
//       libraryId: {
//         not: null,
//       },
//       cycleAvailable: true,
//     },
//   });

//   for (const course of getCourses) {
//     const data = {
//       libraryId: course?.libraryId,
//     };

//     const updateCycles = await prisma.cycle.updateMany({
//       where: {
//         courseId: course?.id,
//       },
//       data: data,
//     });
//   }
// };

// migrateFromCycleToCourse();

// const LOG_FILE = "./migratedVideos.json";
// const CONCURRENCY = 1;

// const limit = pLimit(CONCURRENCY);
// // const SOURCE_PULLZONE = "vz-eb59df21-3f5";

// const SOURCE_PULLZONE = "vz-3017b1d3-c56";

// function delay(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// function loadMigrated() {
//   if (!fs.existsSync(LOG_FILE)) return new Set();
//   return new Set(JSON.parse(fs.readFileSync(LOG_FILE)));
// }

// function saveMigrated(set) {
//   fs.writeFileSync(LOG_FILE, JSON.stringify([...set], null, 2));
// }

// async function retry(fn, attempts = 3) {
//   try {
//     return await fn();
//   } catch (err) {
//     if (attempts <= 1) throw err;
//     console.log("Retrying...", err.message);
//     await delay(3000);
//     return retry(fn, attempts - 1);
//   }
// }

// const libraryCache = new Map();
// const storageCache = new Map();

// async function getLibraryInfo(libraryId) {
//   if (libraryCache.has(libraryId)) return libraryCache.get(libraryId);

//   const res = await axios.get(
//     `https://api.bunny.net/videolibrary/${libraryId}`,
//     {
//       headers: { AccessKey: config.bunny_main_api_key },
//     },
//   );

//   libraryCache.set(libraryId, res.data);
//   return res.data;
// }

// async function getStorageInfo(zoneId) {
//   if (storageCache.has(zoneId)) return storageCache.get(zoneId);

//   const res = await axios.get(`https://api.bunny.net/storagezone/${zoneId}`, {
//     headers: { AccessKey: config.bunny_main_api_key },
//   });

//   storageCache.set(zoneId, res.data);
//   return res.data;
// }

// async function uploadFromHls(videoId, uploadReq) {
//   const hlsUrl = `https://${SOURCE_PULLZONE}.b-cdn.net/${videoId}/720p/video.m3u8`;
//   console.log("recovering from HLS:", hlsUrl);

//   return new Promise((resolve, reject) => {
//     const ytDlp = spawn("yt-dlp", ["-f", "best", "-o", "-", hlsUrl]);

//     ytDlp.stdout.pipe(uploadReq);

//     ytDlp.stderr.on("data", (data) => {
//       const output = data.toString();
//       const match = output.match(/(\d+\.\d+)%/);
//       if (match) {
//         process.stdout.write(`\rDownload & upload progress: ${match[1]}%`);
//       } else if (!output.includes("WARNING")) {
//         console.log("yt-dlp:", output.trim());
//       }
//     });

//     ytDlp.on("close", (code) => {
//       console.log();

//       if (code === 0) {
//         resolve();
//       } else {
//         reject(new Error(`yt-dlp failed with code ${code}`));
//       }
//     });

//     uploadReq.on("error", (err) => {
//       ytDlp.kill();
//       reject(err);
//     });

//     ytDlp.on("error", (err) => {
//       reject(err);
//     });
//   });
// }

// async function uploadFromHls(videoId, uploadReq) {
//   const hlsUrl = `https://${SOURCE_PULLZONE}.b-cdn.net/${videoId}/720p/video.m3u8`;
//   console.log("recovering from HLS:", hlsUrl);

//   const tempDir = path.join(os.tmpdir(), "hls-" + videoId);
//   fs.mkdirSync(tempDir, { recursive: true });

//   return new Promise((resolve, reject) => {
//     const ytDlp = spawn("yt-dlp", [
//       "-f",
//       "best",
//       "--paths",
//       `temp:${tempDir}`,
//       "-o",
//       "-",
//       hlsUrl,
//     ]);

//     ytDlp.stdout.pipe(uploadReq);

//     ytDlp.stderr.on("data", (data) => {
//       const output = data.toString();
//       const match = output.match(/(\d+\.\d+)%/);
//       if (match) {
//         process.stdout.write(`\rDownload & upload progress: ${match[1]}%`);
//       } else if (!output.includes("WARNING")) {
//         console.log("yt-dlp:", output.trim());
//       }
//     });

//     ytDlp.on("close", (code) => {
//       console.log();

//       fs.rmSync(tempDir, { recursive: true, force: true });

//       if (code === 0) {
//         resolve();
//       } else {
//         reject(new Error(`yt-dlp failed with code ${code}`));
//       }
//     });

//     uploadReq.on("error", (err) => {
//       ytDlp.kill();
//       reject(err);
//     });

//     ytDlp.on("error", (err) => {
//       reject(err);
//     });
//   });
// }

// async function migrateSingleVideo(
//   classId,
//   videoId,
//   title,
//   destinationLib,
//   destinationApi,
//   storageZone,
//   storagePass,
// ) {
//   console.log(`\nStarting: ${title}`);

//   const createRes = await axios.post(
//     `https://video.bunnycdn.com/library/${destinationLib}/videos`,
//     { title },
//     {
//       headers: {
//         AccessKey: destinationApi,
//         "Content-Type": "application/json",
//       },
//     },
//   );

//   const newVideoId = createRes.data.guid;

//   const uploadReq = https.request(
//     `https://video.bunnycdn.com/library/${destinationLib}/videos/${newVideoId}`,
//     {
//       method: "PUT",
//       headers: {
//         AccessKey: destinationApi,
//         "Content-Type": "application/octet-stream",
//       },
//     },
//     (res) => {
//       console.log("Upload status:", res.statusCode);
//     },
//   );

//   let downloadStream;
//   let useHls = false;

//   try {
//     const download = await axios({
//       method: "GET",
//       url: `https://storage.bunnycdn.com/${storageZone}/${videoId}/original`,
//       headers: { AccessKey: storagePass },
//       responseType: "stream",
//       timeout: 0,
//     });

//     console.log("Original found");

//     downloadStream = download.data;
//   } catch (err) {
//     if (err?.response?.status === 404) {
//       console.log("Original missing → using HLS");
//       useHls = true;
//     } else {
//       throw err;
//     }
//   }

//   if (!useHls) {
//     await pipeline(downloadStream, uploadReq);
//   } else {
//     await uploadFromHls(videoId, uploadReq);
//   }

//   try {
//     // await prisma.cycleContent.update({
//     //   where: { id: classId },
//     //   data: {
//     //     videoUrl: newVideoId,
//     //     libraryId: destinationLib,
//     //   },
//     // });

//     await prisma.classContent.update({
//       where: { id: classId },
//       data: {
//         videoUrl: newVideoId,
//         libraryId: destinationLib,
//       },
//     });
//   } catch (error) {
//     console.log(error);
//   }

//   console.log("Migrated:", title);
// }

// async function migrateAllVideos() {
//   const migrated = loadMigrated();

//   // const theLibrary = "173049";
//   const theLibrary = "533594";

//   // const contents = await prisma.cycleContent.findMany({
//   //   where: {
//   //     hostingType: "bunny",
//   //     isDeleted: false,
//   //     libraryId: theLibrary,
//   //   },
//   // });

//   // const contents = await prisma.classContent.findMany({
//   //   where: {
//   //     hostingType: "bunny",
//   //     isDeleted: false,
//   //     libraryId: theLibrary,
//   //   },
//   // });

//   const contents = [];

//   const tasks = contents.map((classes) =>
//     limit(async () => {
//       if (migrated.has(classes.videoUrl)) {
//         console.log("Skipping:", classes.classTitle);
//         return;
//       }

//       try {
//         // const course = await findCourseByCycleSubjectChapter(
//         //   classes.cycleSubjectChapterId,
//         // );
//         const course = await findCourseByCourseSubjectChapter(
//           classes.courseSubjectChapterId,
//         );

//         if (!course) return;

//         console.log(course, "course info");

//         const courseInfo = await prisma.course.findFirst({
//           where: {
//             id: course.id,
//             isDeleted: false,
//           },
//         });

//         const sourceLibraryId = classes.libraryId;

//         const sourceLibraryInfo = await getLibraryInfo(sourceLibraryId);
//         const sourceStorageInfo = await getStorageInfo(
//           sourceLibraryInfo.StorageZoneId,
//         );

//         const destinationLibraryId = courseInfo.libraryId;

//         const destLibraryInfo = await getLibraryInfo(destinationLibraryId);

//         await retry(() =>
//           migrateSingleVideo(
//             classes.id,
//             classes.videoUrl,
//             classes.classTitle || classes.videoUrl,
//             destinationLibraryId,
//             destLibraryInfo.ApiKey,
//             sourceStorageInfo.Name,
//             sourceStorageInfo.Password,
//           ),
//         );

//         migrated.add(classes.videoUrl);
//         saveMigrated(migrated);
//       } catch (err) {
//         console.log("Failed:", classes.classTitle, err.message);
//       }
//     }),
//   );

//   await Promise.all(tasks);

//   console.log("\nMigration completed");
// }

// migrateAllVideos();

// const LOG_FILE = "./migratedVideos.json";

// const getInfo = async () => {
//   const products = [
//     "545",
//     "534",
//     "529",
//     "530",
//     "540",
//     "549",
//     "547",
//     "546",
//     "535",
//   ];

//   const courses = await prisma.course.findMany({
//     where: {
//       productName: "varsitybangla24",
//       isDeleted: false,
//     },
//     include: {
//       courseSubject: {
//         where: {
//           isDeleted: false,
//         },
//         include: {
//           courseSubjectChapter: {
//             where: {
//               isDeleted: false,
//             },
//             include: {
//               chapter: true,
//               classContent: {
//                 where: {
//                   isDeleted: false,
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   });

//   const linearData = courses.flatMap(
//     (course) =>
//       course.courseSubject?.flatMap(
//         (subject) =>
//           subject.courseSubjectChapter?.flatMap(
//             (chapter) =>
//               chapter.classContent?.map((cls) => ({
//                 productName: course.productName,
//                 subjectTitle: subject.title,
//                 chapterTitle:
//                   chapter.title ||
//                   chapter.chapter?.chapterName ||
//                   "Untitled Chapter",

//                 classNo: cls.classNo,
//                 classTitle: cls.classTitle,
//                 videoUrl: cls.videoUrl,
//                 thumbneil: cls.thumbneil,
//                 lectureSheet: cls.lectureSheet,
//                 practiceSheet: cls.practiceSheet,
//                 solutionSheet: cls.solutionSheet,
//                 hostingType: cls.hostingType,
//                 description: cls.description,
//                 libraryId: cls.libraryId,
//                 instructor: cls.instructor,
//                 markedBook: cls.markedBook,
//                 videoId: cls.videoId,
//               })) || [],
//           ) || [],
//       ) || [],
//   );

//   fs.writeFileSync(LOG_FILE, JSON.stringify(linearData, null, 2), "utf-8");
//   console.log(`✅ Migrated video data saved to ${LOG_FILE}`);

//   console.log(linearData);
// };

// getInfo().catch((err) => console.error(err));

// const cleanVideoId = (videoId = "") => {
//   return videoId.split(/[?&]/)[0].trim();
// };

// const helper = async () => {
//   const bunnyApiKey2 =
//     "5b110e01-501e-4780-b962-beb75221f15ac6d44e77-5403-446f-8a83-a17be050e566";
//   const bunnyApiKey1 =
//     "0ecceb1d-9250-44fb-bafb-519f207e1d04414f4fee-c101-4169-8f1e-c6906a13bcac";

//   const getAllClassContent = await prisma.classContent.findMany({
//     where: {
//       isDeleted: false,
//     },
//     select: {
//       id: true,
//       videoUrl: true,
//       thumbneil: true,
//       libraryId: true,
//       hostingType: true,
//     },
//   });

//   for (const content of getAllClassContent) {
//     if (content?.thumbneil) {
//       try {
//         const response = await axios.get(content?.thumbneil);
//         if (response?.status == 404) {
//           let thumb = null;
//           if (content?.hostingType === "bunny") {
//             try {
//               const getPullZone = await axios.get(
//                 `https://api.bunny.net/pullzone/${content?.libraryId}`,
//                 {
//                   headers: {
//                     AccessKey: bunnyApiKey2,
//                   },
//                 },
//               );

//               thumb = `https://${getPullZone?.data?.Name}.b-cdn.net/${content?.videoUrl}/thumbnail.jpg`;
//             } catch (error) {
//               const getPullZone = await axios.get(
//                 `https://api.bunny.net/pullzone/${content?.libraryId}`,
//                 {
//                   headers: {
//                     AccessKey: bunnyApiKey1,
//                   },
//                 },
//               );
//               thumb = `https://${getPullZone?.data?.Name}.b-cdn.net/${content?.videoUrl}/thumbnail.jpg`;
//             }
//           } else {
//             thumb = `https://img.youtube.com/vi/${cleanVideoId(content?.videoUrl)}/hqdefault.jpg`;
//           }

//           //now update the thumbneil
//           const updateThumb = await prisma.classContent.update({
//             where: {
//               id: content?.id,
//             },
//             data: {
//               thumbneil: thumb,
//             },
//           });
//           console.log("Thumbnail change to:=", thumb);
//         }
//       } catch (error) {
//         console.log(error?.message);
//       }
//     }
//   }
// };

// helper();

// const cleanVideoId = (videoId = "") => {
//   return videoId.split(/[?&]/)[0].trim();
// };

// const uploadBufferToBunnyStorage = async (
//   fileBuffer,
//   fileName,
//   contentType = "image/jpeg",
// ) => {
//   const HOSTNAME = config.base_host_name; // e.g. storage.bunnycdn.com or region endpoint
//   const STORAGE_ZONE_NAME = config.bunny_storage_zone_name;
//   const ACCESS_KEY = config.bunny_storage_api_key;
//   const CDN_URL = `https://apars.b-cdn.net/varsity`;

//   const cdnPath = fileName;

//   await axios.put(
//     `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/varsity/${cdnPath}`,
//     fileBuffer,
//     {
//       headers: {
//         AccessKey: ACCESS_KEY,
//         "Content-Type": contentType,
//       },
//       maxBodyLength: Infinity,
//     },
//   );

//   return `${CDN_URL}/${cdnPath}`;
// };

// const bunnyApiKeys = [
//   "5b110e01-501e-4780-b962-beb75221f15ac6d44e77-5403-446f-8a83-a17be050e566",
//   "0ecceb1d-9250-44fb-bafb-519f207e1d04414f4fee-c101-4169-8f1e-c6906a13bcac",
// ];

// const getPullZoneNameWithFallback = async (libraryId) => {
//   let lastError;

//   for (const apiKey of bunnyApiKeys) {
//     try {
//       const response = await axios.get(
//         `https://api.bunny.net/videolibrary/${libraryId}`,
//         {
//           headers: {
//             AccessKey: apiKey,
//           },
//         },
//       );

//       const getZoneName = await axios.get(
//         `https://api.bunny.net/pullzone/${response?.data?.PullZoneId}`,
//         {
//           headers: {
//             AccessKey: apiKey,
//           },
//         },
//       );

//       if (getZoneName?.data?.Name) {
//         return getZoneName.data.Name;
//       }
//     } catch (error) {
//       lastError = error;
//       console.log(`Bunny key failed: ${apiKey?.slice(0, 8)}...`);
//     }
//   }

//   throw lastError || new Error("All Bunny API keys failed");
// };

// const helper = async () => {
//   const getAllClassContent = await prisma.cycleContent.findMany({
//     where: {
//       isDeleted: false,
//     },
//     orderBy: {
//       createdAt: "asc",
//     },
//     select: {
//       id: true,
//       videoUrl: true,
//       thumbneil: true,
//       libraryId: true,
//       hostingType: true,
//     },
//   });

//   for (const content of getAllClassContent) {
//     if (!content?.thumbneil) {
//       try {
//         let uploadedUrl = null;
//         let thumb = null;
//         if (content.hostingType === "bunny") {
//           const pullZoneName = await getPullZoneNameWithFallback(
//             content.libraryId,
//           );
//           thumb = `https://${pullZoneName}.b-cdn.net/${content.videoUrl}/thumbnail.jpg`;

//           const thumbRes = await axios.get(thumb, {
//             responseType: "arraybuffer",
//             validateStatus: () => true,
//             headers: {
//               Referer: "https://aparsclassroom.com/",
//             },
//           });

//           if (thumbRes.status !== 200) {
//             throw new Error(
//               `Thumbnail download failed with status ${thumbRes.status}`,
//             );
//           }

//           const contentType = thumbRes.headers["content-type"] || "image/jpeg";
//           const ext = contentType.includes("png")
//             ? "png"
//             : contentType.includes("webp")
//               ? "webp"
//               : "jpg";

//           uploadedUrl = await uploadBufferToBunnyStorage(
//             thumbRes.data,
//             `thumbnails/${content?.videoUrl}.${ext}`,
//             contentType,
//           );

//           console.log(uploadedUrl, "upload url");
//         } else {
//           uploadedUrl = `https://img.youtube.com/vi/${cleanVideoId(content.videoUrl)}/hqdefault.jpg`;
//         }

//         await prisma.cycleContent.update({
//           where: {
//             id: content.id,
//           },
//           data: {
//             thumbneil: uploadedUrl,
//           },
//         });

//         console.log("Thumbnail changed to:", uploadedUrl);
//       } catch (error) {
//         console.log(`Failed for content ${content?.id}:`, error?.message);
//       }
//     }
//     //  else {
//     //   try {
//     //     // Prevent axios from throwing on 404
//     //     const response = await axios.get(content.thumbneil, {
//     //       validateStatus: () => true,
//     //     });

//     //     if (response.status !== 404 && response.status !== 403) continue;

//     //     let thumb = null;
//     //     let uploadedUrl = null;

//     //     if (content.hostingType === "bunny") {
//     //       const pullZoneName = await getPullZoneNameWithFallback(
//     //         content.libraryId,
//     //       );
//     //       thumb = `https://${pullZoneName}.b-cdn.net/${content.videoUrl}/thumbnail.jpg`;

//     //       const thumbRes = await axios.get(thumb, {
//     //         responseType: "arraybuffer",
//     //         validateStatus: () => true,
//     //         headers: {
//     //           Referer: "https://aparsclassroom.com/",
//     //         },
//     //       });

//     //       if (thumbRes.status !== 200) {
//     //         throw new Error(
//     //           `Thumbnail download failed with status ${thumbRes.status}`,
//     //         );
//     //       }

//     //       const contentType = thumbRes.headers["content-type"] || "image/jpeg";
//     //       const ext = contentType.includes("png")
//     //         ? "png"
//     //         : contentType.includes("webp")
//     //           ? "webp"
//     //           : "jpg";

//     //       uploadedUrl = await uploadBufferToBunnyStorage(
//     //         thumbRes.data,
//     //         `thumbnails/${content?.videoUrl}.${ext}`,
//     //         contentType,
//     //       );

//     //       console.log(uploadedUrl, "upload url");
//     //     } else {
//     //       uploadedUrl = `https://img.youtube.com/vi/${cleanVideoId(content.videoUrl)}/hqdefault.jpg`;
//     //     }

//     //     await prisma.cycleContent.update({
//     //       where: {
//     //         id: content.id,
//     //       },
//     //       data: {
//     //         thumbneil: uploadedUrl,
//     //       },
//     //     });

//     //     console.log("Thumbnail changed to:", uploadedUrl);
//     //   } catch (error) {
//     //     console.log(`Failed for content ${content?.id}:`, error?.message);
//     //   }
//     // }
//   }
// };

// helper();

// const help = async () => {
//   const sourceUrl =
//     "https://vz-a24b8c3a-b8e.b-cdn.net/23089ffd-1833-49c5-87eb-f1c131dfa014/thumbnail.jpg";
//   const thumbRes = await axios.get(sourceUrl, {
//     responseType: "arraybuffer",
//     validateStatus: () => true,
//     headers: {
//       Referer: "https://aparsclassroom.com/",
//     },
//   });
//   if (thumbRes.status !== 200) {
//     throw new Error(`Thumbnail download failed with status ${thumbRes.status}`);
//   }

//   const contentType = thumbRes.headers["content-type"] || "image/jpeg";
//   const ext = contentType.includes("png")
//     ? "png"
//     : contentType.includes("webp")
//       ? "webp"
//       : "jpg";

//   const uploadedUrl = await uploadBufferToBunnyStorage(
//     thumbRes.data,
//     `thumbnails.${ext}`,
//     contentType,
//   );

//   console.log(uploadedUrl, "upload url");
// };
// help();

// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const Main_Api_key =
//   "0ecceb1d-9250-44fb-bafb-519f207e1d04414f4fee-c101-4169-8f1e-c6906a13bcac";

// const reencode = async () => {
//   const getAllLibraries = await axios.get(
//     `https://api.bunny.net/videolibrary`,
//     {
//       headers: {
//         AccessKey: Main_Api_key,
//       },
//     },
//   );

//   for (const lib of getAllLibraries?.data) {
//     const libraryId = lib?.Id;
//     const apiKey = lib?.ApiKey;

//     console.log(`\n=== Library: ${lib?.Name} (${libraryId}) ===`);

//     //list all videos of library

//     const getAllVideos = await axios.get(
//       `https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=1000`,
//       {
//         headers: {
//           AccessKey: apiKey,
//         },
//       },
//     );

//     for (const videos of getAllVideos?.data?.items) {
//       const videoId = videos?.guid;

//       console.log(videos?.title);

//       //hit reencode and forget
//       try {
//         const apiResponse = await axios.post(
//           `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}/reencode`,
//           {},
//           {
//             headers: {
//               AccessKey: apiKey,
//             },
//           },
//         );
//         await delay(500);
//       } catch (error) {
//         console.log(error, "error on calling reencode");
//       }
//     }
//   }
// };

// reencode();

// const sajdahAyahs = new Set([
//   "7:206",
//   "13:15",
//   "16:50",
//   "17:109",
//   "19:58",
//   "22:18",
//   "22:77",
//   "25:60",
//   "27:26",
//   "32:15",
//   "38:24",
//   "41:38",
//   "53:62",
//   "84:21",
//   "96:19",
// ]);

// const inputFile = "./quran.json";
// const outputFile = "./quran-enriched.json";

// async function sleep(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// function transformAudio(audio = {}) {
//   return Object.values(audio).map((item) => ({
//     reciter: item.reciter,
//     url: item.url,
//   }));
// }

// async function fetchAyahData(surah, ayah) {
//   const url = `https://quranapi.pages.dev/api/${surah}/${ayah}.json`;

//   const res = await fetch(url);

//   if (!res.ok) {
//     throw new Error(`Quran API failed: ${surah}:${ayah}`);
//   }

//   const data = await res.json();

//   return {
//     surahName: data.surahName || "",
//     surahNameArabic: data.surahNameArabic || "",
//     surahNameArabicLong: data.surahNameArabicLong || "",
//     surahNameTranslation: data.surahNameTranslation || "",
//     revelationPlace: data.revelationPlace || "",
//     totalAyah: data.totalAyah || 0,

//     arabic: data.arabic1 || data.arabic2 || "",

//     translationEn: data.english || "",
//     translationBn: data.bengali || "",
//     translationUr: data.urdu || "",

//     audio: transformAudio(data.audio),
//   };
// }

// async function fetchTafsirData(surah, ayah) {
//   const url = `https://cdn.apars.shop/tafsir/bn-tafseer-ibn-e-kaseer/${surah}/${ayah}.json`;

//   try {
//     const res = await fetch(url);

//     if (!res.ok) {
//       console.warn(`No tafsir found for ${surah}:${ayah}`);
//       return "";
//     }

//     const data = await res.json();

//     return data.text || "";
//   } catch (err) {
//     console.warn(`Tafsir fetch failed for ${surah}:${ayah}`);
//     return "";
//   }
// }

// async function enrichAyahs() {
//   const raw = await fs.readFile(inputFile, "utf8");
//   const ayahs = JSON.parse(raw);

//   const result = [];

//   for (let i = 0; i < ayahs.length; i++) {
//     const item = ayahs[i];

//     console.log(
//       `[${i + 1}/${ayahs.length}] Processing ${item.surah}:${item.ayah}`,
//     );

//     try {
//       const [ayahData, tafsirBn] = await Promise.all([
//         fetchAyahData(item.surah, item.ayah),
//         fetchTafsirData(item.surah, item.ayah),
//       ]);

//       result.push({
//         ...item,

//         ayahKey: `${item.surah}:${item.ayah}`,

//         surahName: ayahData.surahName,
//         surahNameArabic: ayahData.surahNameArabic,
//         surahNameArabicLong: ayahData.surahNameArabicLong,
//         surahNameTranslation: ayahData.surahNameTranslation,

//         revelationPlace: ayahData.revelationPlace,
//         totalAyah: ayahData.totalAyah,

//         arabic: ayahData.arabic,

//         translationEn: ayahData.translationEn,
//         translationBn: ayahData.translationBn,
//         translationUr: ayahData.translationUr,

//         audio: ayahData.audio,

//         tafsirBn,
//       });
//     } catch (err) {
//       console.error(`Failed ${item.surah}:${item.ayah}`, err.message);

//       result.push({
//         ...item,
//         ayahKey: `${item.surah}:${item.ayah}`,
//       });
//     }

//     await sleep(100);
//   }

//   await fs.writeFile(outputFile, JSON.stringify(result, null, 2), "utf8");

//   console.log(`✅ Done. Saved to ${outputFile}`);
//   console.log(`✅ Total ayahs processed: ${result.length}`);
// }

// // enrichAyahs();

// import fs from "fs/promises";

const sajdahAyahs = new Set([
  "7:206",
  "13:15",
  "16:50",
  "17:109",
  "19:58",
  "22:18",
  "22:77",
  "25:60",
  "27:26",
  "32:15",
  "38:24",
  "41:38",
  "53:62",
  "84:21",
  "96:19",
]);

const inputFile = "./complete_quran.json";
const outputDir = "./data/surahs";
const manifestFile = "./data/manifest.json";
const outputFile = "./quran-enriched.json";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transformAudio(audio = {}) {
  return Object.values(audio).map((item) => ({
    reciter: item.reciter,
    url: item.url,
  }));
}

async function fetchAyahData(surah, ayah) {
  const url = `https://quranapi.pages.dev/api/${surah}/${ayah}.json`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Quran API failed: ${surah}:${ayah}`);
  }

  const data = await res.json();

  return {
    surahName: data.surahName || "",
    surahNameArabic: data.surahNameArabic || "",
    surahNameArabicLong: data.surahNameArabicLong || "",
    surahNameTranslation: data.surahNameTranslation || "",
    revelationPlace: data.revelationPlace || "",
    totalAyah: data.totalAyah || 0,

    arabic: data.arabic1 || data.arabic2 || "",

    translationEn: data.english || "",
    translationBn: data.bengali || "",
    translationUr: data.urdu || "",

    audio: transformAudio(data.audio),
  };
}

async function fetchTafsirBn(surah, ayah) {
  const url = `https://cdn.apars.shop/tafsir/bn-tafseer-ibn-e-kaseer/${surah}/${ayah}.json`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`No Bengali tafsir found for ${surah}:${ayah}`);
      return "";
    }

    const data = await res.json();

    return data.text || "";
  } catch (err) {
    console.warn(`Bengali tafsir fetch failed for ${surah}:${ayah}`);
    return "";
  }
}

async function fetchTafsirEn(surah, ayah) {
  const url = `https://raw.githubusercontent.com/spa5k/tafsir_api/refs/heads/main/tafsir/en-tafisr-ibn-kathir/${surah}/${ayah}.json`; //`https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-tafisr-ibn-kathir/${surah}/${ayah}.json`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`No English tafsir found for ${surah}:${ayah}`);
      return "";
    }

    const data = await res.json();

    return data.text || "";
  } catch (err) {
    console.warn(`English tafsir fetch failed for ${surah}:${ayah}`);
    return "";
  }
}

async function enrichAyahs() {
  const raw = await fs.readFile(inputFile, "utf8");
  const ayahs = JSON.parse(raw);

  const bySurah = new Map(); // surah -> enriched ayahs[]
  const manifest = []; // lightweight, same order as input

  // const result = [];

  for (let i = 0; i < ayahs.length; i++) {
    const item = ayahs[i];
    const ayahKey = `${item.surah}:${item.ayah}`;

    console.log(`[${i + 1}/${ayahs.length}] Processing ${ayahKey}`);

    let enriched;

    try {
      const [ayahData, tafsirBn, tafsirEn] = await Promise.all([
        fetchAyahData(item.surah, item.ayah),
        fetchTafsirBn(item.surah, item.ayah),
        fetchTafsirEn(item.surah, item.ayah),
      ]);

      enriched = {
        ...item,
        ayahKey,
        ...ayahData,
        tafsirBn,
        tafsirEn,
        sajda: sajdahAyahs.has(ayahKey),
      };

      // result.push({
      //   ...item,

      //   ayahKey,

      //   surahName: ayahData.surahName,
      //   surahNameArabic: ayahData.surahNameArabic,
      //   surahNameArabicLong: ayahData.surahNameArabicLong,
      //   surahNameTranslation: ayahData.surahNameTranslation,

      //   revelationPlace: ayahData.revelationPlace,
      //   totalAyah: ayahData.totalAyah,

      //   arabic: ayahData.arabic,

      //   translationEn: ayahData.translationEn,
      //   translationBn: ayahData.translationBn,
      //   translationUr: ayahData.translationUr,

      //   audio: ayahData.audio,

      //   tafsirBn,
      //   tafsirEn,

      //   sajda: sajdahAyahs.has(ayahKey),
      // });
    } catch (err) {
      console.error(`Failed ${ayahKey}`, err.message);
      enriched = { ...item, ayahKey, sajda: sajdahAyahs.has(ayahKey) };
    }

    if (!bySurah.has(item.surah)) bySurah.set(item.surah, []);
    bySurah.get(item.surah).push(enriched);

    manifest.push({
      surah: item.surah,
      ayah: item.ayah,
      ayahKey,
      sajda: enriched.sajda,
    });

    await sleep(100);
  }

  await fs.mkdir(outputDir, { recursive: true });

  for (const [surah, list] of bySurah) {
    await fs.writeFile(
      path.join(outputDir, `${surah}.json`),
      JSON.stringify(list, null, 2),
      "utf8",
    );
  }

  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Done. Wrote ${bySurah.size} surah files + manifest`);

  // await fs.writeFile(outputFile, JSON.stringify(result, null, 2), "utf8");

  // console.log(`✅ Done. Saved to ${outputFile}`);
  // console.log(`✅ Total ayahs processed: ${result.length}`);
}

enrichAyahs();
