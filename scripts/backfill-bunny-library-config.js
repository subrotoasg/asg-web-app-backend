/**
 * Fill libApi.cdnHostname and libApi.tokenKey from Bunny.
 *
 * For every libApi row it reads the video library, follows it to its pull zone
 * and stores the zone hostname and the token signing key, so signing a
 * playback URL never needs a Bunny API round trip at request time.
 *
 *   node scripts/backfill-bunny-library-config.js --dry-run
 *   node scripts/backfill-bunny-library-config.js
 *   node scripts/backfill-bunny-library-config.js --library=424242 --force
 *
 * Flags:
 *   --dry-run            resolve and print, write nothing
 *   --force              overwrite rows that already have both fields
 *   --library=a,b,c      only these library ids
 *   --concurrency=4      parallel libraries (default 4)
 */
import "dotenv/config";
import pLimit from "p-limit";
import { prisma } from "../constants/index.js";
import { disconnectRedis } from "../src/app/utlis/redis.js";
import { ensureLibraryConfig } from "../src/app/lib/bunny-library-resolver.js";

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function option(name, fallback) {
  const found = process.argv.find((argument) =>
    argument.startsWith(`--${name}=`),
  );

  return found ? found.slice(name.length + 3) : fallback;
}

const dryRun = flag("dry-run");

const force = flag("force");

const concurrency = Math.max(1, Number(option("concurrency", 4)) || 4);

const onlyLibraries = String(option("library", ""))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

async function main() {
  const rows = await prisma.libApi.findMany({
    where: onlyLibraries.length ? { libraryId: { in: onlyLibraries } } : {},

    select: { libraryId: true, cdnHostname: true, tokenKey: true },

    orderBy: { libraryId: "asc" },
  });

  if (!rows.length) {
    console.log("No libApi rows matched.");
    return 0;
  }

  const pending = force
    ? rows
    : rows.filter((row) => !row.cdnHostname || !row.tokenKey);

  console.log(
    `libApi rows: ${rows.length} | to resolve: ${pending.length} | ` +
      `mode: ${dryRun ? "dry-run" : "write"} | concurrency: ${concurrency}`,
  );

  if (!pending.length) {
    console.log("Nothing to do. Use --force to refresh rows that are filled.");
    return 0;
  }

  const limit = pLimit(concurrency);

  const results = await Promise.all(
    pending.map((row) =>
      limit(() => ensureLibraryConfig(row.libraryId, { force: true, dryRun })),
    ),
  );

  const failed = [];

  for (const result of results) {
    if (result.status === "failed") {
      failed.push(result);

      console.error(`FAIL     ${result.libraryId}  ${result.error}`);

      continue;
    }

    if (result.status === "missing_row") {
      console.warn(`MISSING  ${result.libraryId}  row disappeared`);

      continue;
    }

    const { cdnHostname, tokenKey, zoneSecurityEnabled, pullZoneId } =
      result.resolved;

    const label = result.status === "would_update" ? "WOULD" : "OK   ";

    console.log(
      `${label}    ${result.libraryId}  pullzone=${pullZoneId}  ` +
        `host=${cdnHostname}  tokenKey=${tokenKey ? "yes" : "MISSING"}`,
    );

    // A signed URL against a zone with token auth off is just a public URL.
    if (!zoneSecurityEnabled) {
      console.warn(
        `WARN     ${result.libraryId}  token authentication is DISABLED on this pull zone`,
      );
    }

    if (!tokenKey) {
      console.warn(
        `WARN     ${result.libraryId}  Bunny returned no ZoneSecurityKey`,
      );
    }
  }

  const changed = results.filter((r) =>
    ["updated", "would_update"].includes(r.status),
  ).length;

  console.log(
    `\nDone. ${dryRun ? "would update" : "updated"}: ${changed} | failed: ${failed.length}`,
  );

  return failed.length ? 1 : 0;
}

let exitCode = 0;

try {
  exitCode = await main();
} catch (error) {
  console.error("Backfill aborted:", error?.message || error);

  exitCode = 1;
} finally {
  await Promise.allSettled([prisma.$disconnect(), disconnectRedis()]);
}

// The Redis clients keep the loop alive otherwise.
process.exit(exitCode);
