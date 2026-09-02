import { prisma } from "../../constants/index.js";

const logActivity = async (title = "", description = "", type = "") => {
  const data = {
    title,
    description,
    type,
  };

  const logActivity = await prisma.activityLogs.create({
    data: data,
  });
};

export const activity = {
  logActivity,
};
