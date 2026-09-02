export const maskEmail = (email) => {
  if (!email || typeof email !== "string") return email;
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${"*".repeat(localPart.length)}@${domain}`;
  }
  return `${localPart.slice(0, 2)}${"*".repeat(localPart.length - 2)}@${domain}`;
};

export const maskPhone = (phone) => {
  if (!phone || typeof phone !== "string" || phone.length < 11) return phone;
  const start = phone.slice(0, 2);
  const end = phone.slice(-4);
  const maskedMiddle = "*".repeat(phone.length - 6);
  return `${start}${maskedMiddle}${end}`;
};

export async function getFirstBodyImage(pageUrl) {
  try {
    const response = await fetch(pageUrl);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

    const html = await response.text();

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!bodyMatch) return null;

    const bodyHtml = bodyMatch[1];

    const imgMatch = bodyHtml.match(/<img[^>]+src="([^">]+)"/i);
    if (!imgMatch) return null;

    let imgUrl = imgMatch[1];

    imgUrl = new URL(imgUrl, pageUrl).href;

    return imgUrl;
  } catch (err) {
    console.error("Error fetching image:", err.message);
    return null;
  }
}
