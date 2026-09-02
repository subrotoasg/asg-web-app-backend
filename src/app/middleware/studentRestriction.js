import { StatusCodes } from "http-status-codes";
import AppErrors from "../../errors/AppErrors.js";
import { prisma } from "../../../constants/index.js";

export const RestrictionType = {
  FULL: "FULL",
  COMMENT: "COMMENT",
  COMMENT_REPLY: "REPLY",
  LIVE_CHAT: "CHAT",
  LIVE_CLASS: "LIVE_CLASS",
  MEDIA_COMMENT: "MEDIA_COMMENT",
};

export function checkRestriction(type) {
  return async (req, res, next) => {
    try {
      const userRole = req.body?.userRole;
      if (userRole !== "student") {
        return next();
      }
      const studentId = req.body?.studentId;

      if (!studentId) {
        throw new AppErrors(
          StatusCodes.NOT_ACCEPTABLE,
          "দুঃখিত! তোমার তথ্য খুঁজে পাওয়া যাচ্ছে না",
        );
      }

      const restriction = await prisma.studentRestriction.findFirst({
        where: {
          studentId,
          type: {
            in: [RestrictionType.FULL, type],
          },
        },
      });

      if (!restriction) {
        return next();
      }

      const now = new Date();

      if (restriction.bannedUntil) {
        if (restriction.bannedUntil <= now) {
          await prisma.studentRestriction.delete({
            where: {
              id: restriction.id,
            },
          });

          return next();
        }

        const remainingMs = restriction.bannedUntil.getTime() - now.getTime();

        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor(
          (remainingMs % (1000 * 60 * 60)) / (1000 * 60),
        );

        throw new AppErrors(
          StatusCodes.FORBIDDEN,
          `${restriction.reason || "আপনি সাময়িকভাবে নিষিদ্ধ।"}\n\nআরও ${days} দিন ${hours} ঘণ্টা ${minutes} মিনিট পরে আবার চেষ্টা করো।`,
        );
      }
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        restriction.reason || "এই কাজটি করার অনুমতি বর্তমানে আপনার নেই।",
      );
    } catch (error) {
      next(error);
    }
  };
}
