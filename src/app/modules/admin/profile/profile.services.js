import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import { prisma } from "../../../../../constants/index.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { constants } from "../../../constant/index.js";
import config from "../../../config/index.js";
import AppErrors from "../../../../errors/AppErrors.js";

const changeProfilePhoto = async (payload) => {
  const { photo, adminId } = payload;
  const data = {
    photo,
  };

  const checkAdmin = await prisma.admin.findFirst({
    where: {
      id: adminId,
    },
  });

  if (checkAdmin.photo) {
    // await removeFiles.deleteFromBunnyCDN(checkAdmin.photo);
  }

  // console.log(data);

  const response = await prisma.admin.update({
    where: {
      id: adminId,
    },
    data,
  });

  return {};
};

export const profileService = {
  changeProfilePhoto,
};
