import { StatusCodes } from "http-status-codes";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { prisma } from "../../../../../constants/index.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";

//Get all Template Services
const getAllTemplatefromDb = async (query) => {
  console.log(query);
};

//Get single Template Services
const getSingleTemplatefromDb = async (TemplateId) => {
  console.log(TemplateId);
};

//Create Template Services
const createTemplateIntoDb = async (TemplateImage, payload) => {
  console.log(payload);
};

//Update Template Services
const updateTemplateIntoDb = async (TemplateId, TemplateImage, payload) => {
  console.log(TemplateId, payload);
};

//Delete Template Services
const deleteTemplateFromDb = async (TemplateId) => {
  console.log(TemplateId);
};

export const TemplateServices = {
  getAllTemplatefromDb,
  getSingleTemplatefromDb,
  createTemplateIntoDb,
  updateTemplateIntoDb,
  deleteTemplateFromDb,
};
