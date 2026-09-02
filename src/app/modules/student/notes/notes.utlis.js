import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const classNoToNumber = (v) => {
  if (!v) return Number.MAX_SAFE_INTEGER;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

const escapeHtml = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function isPlaceholderNoNote(html = "") {
  return String(html).includes("তুমি এই ক্লাসের জন্য এখনও কোনো নোট লেখো নি");
}

// --- Logo helpers ---
function guessMimeFromPath(p = "") {
  const lower = String(p).toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/png";
}

async function fileToDataUrl(filePath) {
  const buf = await fs.readFile(filePath);
  const mime = guessMimeFromPath(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function urlToDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const contentType = res.headers.get("content-type") || "image/png";
  return `data:${contentType};base64,${buf.toString("base64")}`;
}

// Builds full printable HTML (Cover + TOC + Chapters)
function buildHtml({
  data,
  studentName,
  downloadedAtBn,
  katexCssHref,
  logoDataUrl,
}) {
  const subjectTitle = data?.subject?.title || "Notes";
  const chapters = Array.isArray(data?.chapters) ? data.chapters : [];

  // Build TOC + Content
  const tocItems = [];
  const chapterSections = chapters
    ?.map((ch, idx) => {
      const chapterTitle = ch?.chapter?.title || `অধ্যায় ${idx + 1}`;
      const chapterId = `chapter-${idx + 1}`;

      tocItems.push({
        idx: idx + 1,
        title: chapterTitle,
        href: `#${chapterId}`,
      });

      const classes = Array.isArray(ch?.classes)
        ? [...ch.classes].sort(
            (a, b) => classNoToNumber(a.classNo) - classNoToNumber(b.classNo)
          )
        : [];

      const classBlocks =
        classes.length === 0
          ? `<div class="muted center card">এই অধ্যায়ে কোনো ক্লাসের নোট পাওয়া যায়নি</div>`
          : classes
              ?.map((cls, i) => {
                const classNo = cls?.classNo || `${i + 1}`;
                const classTitle = cls?.classTitle || "ক্লাসের শিরোনাম নেই";
                const hasRealNote =
                  !!cls?.noteText &&
                  cls?.hasNote === true &&
                  !isPlaceholderNoNote(cls.noteText);

                return `
<section class="class">
  <div class="class-head">
    <div class="class-title">ক্লাস ${escapeHtml(classNo)}: ${escapeHtml(classTitle)}</div>
    <div class="status ${hasRealNote ? "ok" : "no"}">${hasRealNote ? "নোট" : ""}</div>
  </div>

  ${
    hasRealNote
      ? `<div class="note card">${cls.noteText}</div>`
      : `<div class="note card muted center">
          এই ক্লাসের জন্য কোনো নোট পাওয়া যায়নি।<br/>
        </div>`
  }
</section>`;
              })
              .join("");

      // each chapter new page + top gap (visual “between page gap”)
      return `
<section class="chapter page-start-gap" id="${chapterId}">
  <div class="chapter-title">${escapeHtml(chapterTitle)}</div>
  ${classBlocks}
</section>`;
    })
    ?.join("");

  const tocHtml = tocItems
    ?.map(
      (it) => `
<div class="toc-row">
  <a class="toc-link" href="${it.href}">
    <span class="toc-left">${it.idx}. ${escapeHtml(it.title)}</span>
    <span class="toc-dots"></span>
    <span class="toc-right">→</span>
  </a>
</div>`
    )
    ?.join("");

  return `<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>

  <!-- KaTeX CSS local -->
  <link rel="stylesheet" href="${katexCssHref}"/>

  <style>
    :root { --border:#e5e7eb; --muted:#6b7280; --text:#111827; --bg:#ffffff; }
    * { box-sizing: border-box; }
    body {
      margin:0; padding:0;
      background: var(--bg);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12.5px;
      line-height: 1.55;
    }

    /* A4 fixed (device independent) */
    @page { size: A4; margin: 18mm 12mm 28mm 12mm; } /* bottom bigger for footer space */
    html, body { width: 210mm; }

    .page { padding: 0; }

    /* Cover */
    .cover {
      page-break-after: always;
      padding-top: 45mm;
      text-align:center;
    }
    .logo {
      width: 76px; height: 76px;
      object-fit: contain;
      display: inline-block;
      margin-bottom: 14px;
    }
    .cover h1 { margin:0; font-size: 32px; }
    .cover .sub { margin-top: 8px; font-size: 18px; color: #374151; }
    .cover .meta { margin-top: 18px; color: var(--muted); }

    /* TOC */
    .toc { page-break-after: always; padding-top: 10mm; }
    .toc h2 { text-align:center; margin:0 0 12px 0; font-size: 22px; }
    .toc-row { margin: 8px 0; }
    .toc-link { display:flex; gap:10px; text-decoration:none; color: var(--text); }
    .toc-left { flex: 1 1 auto; }
    .toc-dots { flex: 1 1 auto; border-bottom: 1px dotted #9ca3af; transform: translateY(-2px); }
    .toc-right { width: 24px; text-align:right; color: var(--muted); }

    /* Chapters */
    .chapter { page-break-before: always; }
    .page-start-gap { padding-top: 10mm; } /* visual gap after page break */
    .chapter-title {
      font-size: 22px;
      text-align:center;
      margin: 0 0 16px 0;
      padding: 10px 0;
      border-bottom: 2px solid var(--border);
    }

    .class { margin: 14px 0 18px 0; }
    .class-head { display:flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .class-title { font-size: 15px; font-weight: 700; }
    .status { font-size: 11px; }
    .status.ok { color: #059669; }
    .status.no { color: #dc2626; }

    .card {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 30px 14px;
      margin-top: 10px;
      background: #fff;
    }

    .muted { color: var(--muted); }
    .center { text-align:center; }

    /* Notes content */
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid var(--border); padding: 6px; }

    /* KaTeX */
    .katex { font-size: 1.05em; }
    .katex-display { margin: 10px 0; }

    /* Better spacing in note html */
    .note ul, .note ol { margin: 8px 0 8px 20px; }
    .note p { margin: 8px 0; }

    /* Reduce awkward splits */
    .note, .card { break-inside: avoid; }
  </style>
</head>

<body>
  <div class="page">

    <section class="cover">
      ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="logo" />` : ""}
      <h1>${escapeHtml(subjectTitle)}</h1>
      <div class="sub">নোট বই</div>
      <div class="meta">
        <div>ইমেইল: ${escapeHtml(studentName)}</div>
        <div>ডাউনলোডের সময়: ${escapeHtml(downloadedAtBn)}</div>
      </div>
    </section>

    <section class="toc page-start-gap">
      <h2>সূচিপত্র</h2>
      ${tocHtml || `<div class="muted center">সূচিপত্র পাওয়া যায়নি</div>`}
    </section>

    ${chapterSections}

  </div>
</body>
</html>`;
}

export async function generateNotesPdfBuffer({
  data,
  studentName = "Student",
  logoUrl = "", // e.g. "https://varsity.aparsclassroom.com/logo.png"
  logoPath = "", // e.g. path.join(__dirname, "../../assets/logo.png")
} = {}) {
  const downloadedAtBn = new Date().toLocaleString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // KaTeX css from node_modules via file:// (NO server, NO CORS)
  // Adjust path if needed (depends on where this file is)
  const katexCssPath = path.join(
    __dirname,
    "../../../../../node_modules/katex/dist/katex.min.css"
  );
  const katexCssHref = `file://${katexCssPath}`;

  // logo to data url (best for print)
  let logoDataUrl = "";
  try {
    if (logoPath) logoDataUrl = await fileToDataUrl(logoPath);
    else if (logoUrl) logoDataUrl = await urlToDataUrl(logoUrl);
  } catch (e) {
    console.warn("Logo load failed, continuing without logo:", e?.message || e);
    logoDataUrl = "";
  }

  const html = buildHtml({
    data,
    studentName,
    downloadedAtBn,
    katexCssHref,
    logoDataUrl,
  });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    const subjectTitle = data?.subject?.title || "notes";
    const safeName = subjectTitle.replace(/[^\w\d-]+/g, "_");

    // Small logo in header (optional)
    const headerLogo = logoDataUrl
      ? `<img src="${logoDataUrl}" style="height:14px; width:14px; object-fit:contain; margin-right:6px;" />`
      : "";

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,

      // bottom bigger because footer needs space
      margin: { top: "18mm", right: "12mm", bottom: "28mm", left: "12mm" },

      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:9px; width:100%; padding:0 12mm; color:#6b7280; display:flex; justify-content:space-between; align-items:center;">
          <span style="display:flex; align-items:center;">
            ${headerLogo}
            <span>${escapeHtml(subjectTitle)}</span>
          </span>
          <span>${escapeHtml(studentName)}</span>
        </div>
      `,
      footerTemplate: `
  <div style="
    width:100%;
    padding:0 12mm;
    font-size:9px;
    color:#6b7280;
  ">
    <div style="display:flex; justify-content:space-between;">
      <span>This document has been digitally generated and authenticated. No physical signature is required.</span>
      <span>পৃষ্ঠা <span class="pageNumber"></span>/<span class="totalPages"></span></span>
    </div>
    <div style="
      border-top:1px solid #e5e7eb;
      margin-top:10px;
    "></div>
  </div>
`,
    });

    await page.close();
    return { pdfBuffer, safeName };
  } finally {
    await browser.close();
  }
}
