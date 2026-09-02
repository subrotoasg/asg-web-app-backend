export const stripHtml = (html = "") =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const classNoToNumber = (v) => {
  if (!v) return Number.MAX_SAFE_INTEGER;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

export const NO_NOTE_HTML = `
  <div style="padding:10px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;">
    <p style="margin:0;font-size:14px;line-height:1.5;color:#475569;">
     তুমি এই ক্লাসের জন্য এখনও কোনো নোট লেখো নি।
    </p>
  </div>
`;

const bnToEnDigits = (s = "") =>
  String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));

const getChapterNumber = (name = "") => {
  const normalized = bnToEnDigits(name);
  const m = String(normalized).match(/chapter\s*[-:]?\s*(\d+)/i);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
};

export const sortSubjectsByChapter = (arr = []) => {
  return [...arr].sort((a, b) => {
    const aName = a?.chapter?.chapterName || "";
    const bName = b?.chapter?.chapterName || "";

    const aNum = getChapterNumber(aName);
    const bNum = getChapterNumber(bName);

    if (aNum !== bNum) return aNum - bNum;
    return aName.localeCompare(bName, "bn");
  });
};

// npm i playwright katex
// npx playwright install chromium
