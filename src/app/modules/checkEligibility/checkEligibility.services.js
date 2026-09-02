import { StatusCodes } from "http-status-codes";
import {
  getSheetData,
  checkEligibility,
  allUniversityInfoValue,
} from "./checkEligibility.helpers.js";
import { fetchResult } from "../../../helper/boardResultHelper.js";
import axios from "axios";
import config from "../../config/index.js";
import { prisma } from "../../../../constants/index.js";
//Get all checkEligibility Services
const getAllcheckEligibilityfromDb = async (payload) => {
  const universities = await getSheetData();
  const result = universities?.filter((uni) => checkEligibility(payload, uni));

  let suggestedCourse = [];

  result.map((uni) => {
    const courseIds = uni?.suggested_course_product_ids
      ? uni?.suggested_course_product_ids?.split(",").map((num) => num.trim())
      : [];

    courseIds?.map((el) => {
      if (!suggestedCourse.includes(el)) suggestedCourse.push(el);
    });
  });

  const suggestedCourses = await Promise.all(
    suggestedCourse.map(async (c) => {
      const { data: getCourse } = await axios.get(
        `https://crm.apars.shop/product/edit?productId=${c}&uid=${config.crmApiKey}`,
      );
      return {
        productId: getCourse?.product?.productId,
        productName: getCourse?.product?.productName,
        productFullName: getCourse?.product?.productFullName,
        ProductImage: getCourse?.product?.ProductImage,
        Permalink: getCourse?.product?.Permalink,
      };
    }),
  );

  return { result, suggestedCourses };
};

//Get all university info
const getAllUniversityInfofromDb = async (paylad) => {
  const universities = await getSheetData();
  const result = universities?.filter((uni) =>
    allUniversityInfoValue(uni, paylad),
  );
  return result;
};

//Get single checkEligibility Services
const getSinglecheckEligibilityfromDb = async (checkEligibilityId) => {
  console.log(checkEligibilityId);
};

const GetBoardResult = async (payload) => {
  const { exam, year, board, roll, reg } = payload;
  const result = await fetchResult(payload);
  if (result) {
    const store = await prisma.extraData.create({
      data: {
        slug: "boardResult",
        data: result,
      },
    });
  }
  return result;
};

const GetHscRoutineFromGoogleSheet = async () => {
  const result = await getSheetData(1); // Assuming HSC routine is on the first sheet
  return result;
};

export const checkEligibilityServices = {
  getAllcheckEligibilityfromDb,
  getAllUniversityInfofromDb,
  getSinglecheckEligibilityfromDb,
  GetBoardResult,
  GetHscRoutineFromGoogleSheet,
};
