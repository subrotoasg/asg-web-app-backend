import { GoogleSpreadsheet } from "google-spreadsheet";
import config from "../../config/index.js";
const API_KEY = `${config.google_sheet_api_key}`;
const SHEET_ID = `${config.google_sheet_id}`;
const doc = new GoogleSpreadsheet(SHEET_ID, { apiKey: API_KEY });

export const getSheetData = async (index = 0) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[index || 0];
    try {
      const rows = await sheet?.getRows();
      return rows?.map((row) => {
        const obj = {};
        const headers = sheet.headerValues || Object.keys(row);

        headers.forEach((header, i) => {
          const key = header.toLowerCase().replace(/\s+/g, "_");
          obj[key] = row._rawData[i];
        });
        return obj;
      });
    } catch (headerError) {
      console.log(headerError.message);
    }
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return [];
  }
};

// Text equality helper
const textEqual = (a, b) => {
  if (!a || !b) return false;
  return (
    a.toString().trim().toLowerCase() === b.toString().trim().toLowerCase()
  );
};

// Eligibility Check
export const checkEligibility = (student, uni) => {
  const gpaCheck =
    student.sscGPA >= parseFloat(uni.minimum_ssc_gpa || 0) &&
    student.hscGPA >= parseFloat(uni.minimum_hsc_gpa || 0) &&
    Number(student.sscYear) >= Number(uni.minimum_ssc_year) &&
    Number(student.hscYear) >= Number(uni.minimum_hsc_year) &&
    (student.physicsGPA || 0) >= parseFloat(uni.physics_min_gpa || 0) &&
    (student.chemistryGPA || 0) >= parseFloat(uni.chemistry_min_gpa || 0) &&
    (student.mathGPA || 0) >= parseFloat(uni.math_min_gpa || 0) &&
    (student.biologyGPA || 0) >= parseFloat(uni.biology_min_gpa || 0) &&
    (student.englishGPA || 0) >= parseFloat(uni.english_min_gpa || 0) &&
    (student.ictGPA || 0) >= parseFloat(uni.ict_min_gpa || 0) &&
    (student.banglaGPA || 0) >= parseFloat(uni.bangla_min_gpa || 0);

  const secondTimerCheck =
    !student.secondTimer ||
    student.secondTimer.toString().toLowerCase() !== "yes" ||
    textEqual(uni["2nd_timer_allowed"], "Yes");

  return gpaCheck && secondTimerCheck;
};

// all university info
const isDateRecentOrFuture = (dateString) => {
  if (!dateString) return false;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const dateValue = new Date(dateString);
  dateValue.setHours(0, 0, 0, 0);
  return (
    dateValue >= sixMonthsAgo ||
    dateValue.getFullYear() > currentDate.getFullYear()
  );
};

export const allUniversityInfoValue = (uni) => {
  const dateFields = [
    "apply_start_date",
    "apply_end_date",
    "exam_date",
    "admit_download_date",
    "result_publish_date",
  ];

  for (const field of dateFields) {
    const dateString = uni[field];

    if (dateString && isDateRecentOrFuture(dateString)) {
      return true;
    }
  }
  return false;
};
