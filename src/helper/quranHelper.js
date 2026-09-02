export async function getHijriDate(targetDate = new Date()) {
  const dd = String(targetDate.getDate()).padStart(2, "0");
  const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
  const yyyy = targetDate.getFullYear();

  const res = await fetch(
    `https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`,
  );
  const data = await res.json();
  const hijri = data.data.hijri;

  return {
    day: Number(hijri.day),
    month: Number(hijri.month.number),
    monthName: hijri.month.en,
    monthNameAr: hijri.month.ar,
    year: Number(hijri.year),
    weekday: targetDate.getDay(),
    formatted: `${hijri.day} ${hijri.month.en} ${hijri.year}`,
  };
}

export function getOccasionTags({ month, day, weekday }) {
  const tags = [];
  if (month === 9) tags.push("ramadan");
  if (month === 9 && day >= 21 && day % 2 === 1) tags.push("laylatul-qadr");
  if (month === 10 && day === 1) tags.push("eid-al-fitr");
  if (month === 12 && day >= 1 && day <= 9) tags.push("dhul-hijjah");
  if (month === 12 && day === 9) tags.push("arafah");
  if (month === 12 && day === 10) tags.push("eid-al-adha");
  if (month === 1 && day === 10) tags.push("ashura");
  if (weekday === 5) tags.push("jumuah");
  return tags;
}

// Maps occasion -> categories that actually exist in your dataset
export const OCCASION_CATEGORY_MAP = {
  ramadan: ["ramadan", "fasting"],
  "laylatul-qadr": ["ramadan", "revelation", "quran"],
  "eid-al-fitr": ["gratitude", "charity", "joy"],
  "dhul-hijjah": ["hajj", "sacrifice", "umrah"],
  arafah: ["hajj", "sacrifice", "forgiveness"],
  "eid-al-adha": ["sacrifice", "charity", "gratitude"],
  ashura: ["fasting", "deliverance", "musa"],
  jumuah: ["worship", "dhikr"],
};
