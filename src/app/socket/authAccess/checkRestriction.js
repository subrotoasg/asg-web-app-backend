import { prisma } from "../../../../constants/index.js";
import { RestrictionType } from "../../middleware/studentRestriction.js";

export function formatRemainingTime(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];

  if (days > 0) {
    parts.push(`${days} দিন`);
  }

  if (hours > 0) {
    parts.push(`${hours} ঘণ্টা`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} মিনিট`);
  }

  if (!parts.length) {
    return "কিছুক্ষণ";
  }

  return parts.join(" ");
}

export async function hasRestriction(studentId, type) {
  const restriction = await prisma.studentRestriction.findFirst({
    where: {
      studentId,
      type: {
        in: [RestrictionType.FULL, type],
      },
    },
  });

  if (!restriction) {
    return null;
  }
  const now = new Date();

  if (restriction.bannedUntil && restriction.bannedUntil <= now) {
    await prisma.studentRestriction.delete({
      where: {
        id: restriction.id,
      },
    });

    return null;
  }

  let message = restriction.reason || "তোমার মেসেজ দেওয়ার অনুমতি নেই";

  let remainingMs = null;

  // Temporary ban
  if (restriction.bannedUntil) {
    remainingMs = restriction.bannedUntil.getTime() - now.getTime();

    message += ` অনুগ্রহ করে ${formatRemainingTime(
      remainingMs,
    )} পরে আবার চেষ্টা করো।`;
  }
  return {
    restricted: true,

    id: restriction.id,

    type: restriction.type,

    reason: restriction.reason,

    message,

    bannedAt: restriction.bannedAt,

    bannedUntil: restriction.bannedUntil,

    remainingMs,

    permanent: restriction.bannedUntil === null,
  };
}
