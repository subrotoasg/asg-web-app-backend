const fs = require("fs");
const os = require("os");
const path = require("path");
const axios = require("axios");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");
const pLimit = require("p-limit");

const VIDEO_FOLDER = "/mnt/A/nas/bunnyCdn_Backup";
const BUNNY_API_KEY =
  "5b110e01-501e-4780-b962-baf77-5403-446f-8a83-a17be050e566";
const CONCURRENCY = Number(3);
const LOCK_FILE = path.join(__dirname, "backup.lock");
const YT_DLP_PATH = "/mnt/A/nas/bunny-backup/bin/yt-dlp";

if (!BUNNY_API_KEY) throw new Error("Missing BUNNY_API_KEY");

fs.mkdirSync(VIDEO_FOLDER, { recursive: true });

function safeName(name) {
  return String(name || "untitled")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getLibraryLogPath(libraryFolder) {
  return path.join(libraryFolder, "backup-log.json");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getLibraries() {
  const res = await axios.get("https://api.bunny.net/videolibrary", {
    headers: { AccessKey: BUNNY_API_KEY },
  });

  return res.data || [];
}

async function getStorageZone(storageZoneId) {
  const res = await axios.get(
    `https://api.bunny.net/storagezone/${storageZoneId}`,
    { headers: { AccessKey: BUNNY_API_KEY } },
  );

  return res.data;
}

async function fetchVideos(libraryId, apiKey) {
  const res = await axios.get(
    `https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=10000`,
    { headers: { AccessKey: apiKey } },
  );

  return res.data.items || [];
}

async function getPullZoneHost(library) {
  const pullZone = await axios.get(
    `https://api.bunny.net/pullzone/${library?.PullZoneId}`,
    {
      headers: {
        AccessKey: BUNNY_API_KEY,
      },
    },
  );
  return pullZone?.data;
}

async function downloadFromHls(videoId, pullZoneHost, filePath) {
  if (!pullZoneHost) {
    throw new Error("Missing SOURCE_PULLZONE for HLS fallback");
  }

  const hlsUrl = `https://${pullZoneHost}.b-cdn.net/${videoId}/720p/video.m3u8`;
  console.log(`Recovering from HLS: ${hlsUrl}`);

  const tempDir = path.join(os.tmpdir(), `hls-${videoId}`);
  fs.mkdirSync(tempDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const ytDlp = spawn(YT_DLP_PATH, [
      "-f",
      "best",
      "--paths",
      `temp:${tempDir}`,
      "-o",
      filePath,
      hlsUrl,
    ]);

    ytDlp.stderr.on("data", (data) => {
      const output = data.toString();
      const match = output.match(/(\d+\.\d+)%/);

      if (match) {
        process.stdout.write(`\rHLS progress: ${match[1]}%`);
      } else if (!output.includes("WARNING")) {
        console.log("yt-dlp:", output.trim());
      }
    });

    ytDlp.on("close", (code) => {
      fs.rmSync(tempDir, { recursive: true, force: true });

      if (code === 0) resolve();
      else reject(new Error(`yt-dlp failed with code ${code}`));
    });

    ytDlp.on("error", reject);
  });
}

async function downloadVideo({
  video,
  library,
  libraryFolder,
  storageZoneName,
  storageZonePass,
  pullZone,
  log,
  logPath,
  retries = 3,
}) {
  const videoId = video.guid;
  const title = video.title || videoId;

  if (!videoId) return;

  const existing = log.videos[videoId];

  if (existing?.status === "backed_up" && fs.existsSync(existing.filePath)) {
    console.log(`Already backed up: ${title}`);
    return;
  }

  const fileName = `${safeName(title)}-${videoId}.mp4`;
  const finalPath = path.join(libraryFolder, fileName);
  const tempPath = `${finalPath}.part`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Downloading [${attempt}/${retries}]: ${title}`);

      let usedSource = "original";

      try {
        const response = await axios({
          method: "GET",
          url: `https://storage.bunnycdn.com/${storageZoneName}/${videoId}/original`,
          headers: { AccessKey: storageZonePass },
          responseType: "stream",
          timeout: 0,
        });

        await pipeline(response.data, fs.createWriteStream(tempPath));
      } catch (err) {
        if (err?.response?.status === 404) {
          throw new Error("Original file missing; HLS fallback skipped");
        }

        throw err;
      }

      fs.renameSync(tempPath, finalPath);

      log.videos[videoId] = {
        videoId,
        title,
        status: "backed_up",
        source: usedSource,
        filePath: finalPath,
        backedUpAt: new Date().toISOString(),
        error: null,
      };

      saveJson(logPath, log);

      // console.log(`Backed up: ${title}`);
      return;
    } catch (err) {
      fs.rmSync(tempPath, { force: true });

      log.videos[videoId] = {
        videoId,
        title,
        status: "failed",
        filePath: finalPath,
        failedAt: new Date().toISOString(),
        error: err.message,
      };

      saveJson(logPath, log);

      console.error(`Failed attempt ${attempt} for ${title}: ${err.message}`);

      if (attempt < retries) await delay(5000);
    }
  }

  console.error(`Giving up on: ${title}`);
}

async function backup() {
  if (fs.existsSync(LOCK_FILE)) {
    console.error("Backup already running. Lock file exists.");
    process.exit(1);
  }

  fs.writeFileSync(LOCK_FILE, String(process.pid));

  try {
    const libraries = await getLibraries();

    for (const library of libraries) {
      const libraryId = library.Id;
      const libraryName = safeName(library.Name || libraryId);
      const libraryFolder = path.join(VIDEO_FOLDER, libraryName);

      fs.mkdirSync(libraryFolder, { recursive: true });

      const logPath = getLibraryLogPath(libraryFolder);
      const log = loadJson(logPath, {
        libraryId,
        libraryName,
        videos: {},
      });

      const storageZone = await getStorageZone(library.StorageZoneId);
      const videos = await fetchVideos(libraryId, library.ApiKey);
      const pullZone = await getPullZoneHost(library);

      console.log(`Library "${libraryName}" | ${videos.length} videos found.`);

      const limit = pLimit(CONCURRENCY);

      await Promise.all(
        videos.map((video) =>
          limit(() =>
            downloadVideo({
              video,
              library,
              libraryFolder,
              storageZoneName: storageZone.Name,
              storageZonePass: storageZone.Password,
              pullZone,
              log,
              logPath,
            }),
          ),
        ),
      );

      log.lastRunAt = new Date().toISOString();
      log.totalVideosSeen = videos.length;
      saveJson(logPath, log);

      console.log(`Library "${libraryName}" backup completed.\n`);
    }

    console.log("All libraries backup completed.");
  } finally {
    fs.rmSync(LOCK_FILE, { force: true });
  }
}

backup().catch((err) => {
  console.error("Fatal backup error:", err.message);
  fs.rmSync(LOCK_FILE, { force: true });
  process.exit(1);
});
