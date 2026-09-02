export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  return (new Date(endTime) - new Date(startTime)) / 1000;
};

import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { prisma } from "../../../../../constants/index.js";

export const formatTime = (dateString) => {
  const date = new Date(dateString);
  const hours = date.getHours();

  // Determine time period
  let period = "";
  if (hours >= 5 && hours < 12) {
    period = "সকাল";
  } else if (hours >= 12 && hours < 15) {
    period = "দুপুর";
  } else if (hours >= 15 && hours < 18) {
    period = "বিকাল";
  } else if (hours >= 18 && hours < 20) {
    period = "সন্ধ্যা";
  } else {
    period = "রাত";
  }

  // Format date in Bengali
  const formattedDate = format(date, "PP", { locale: bn });

  // Manual time formatting
  const twelveHour = hours % 12 || 12;
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";

  // Convert numbers to Bengali numerals
  const toBengaliNum = (num) =>
    num.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

  const formattedTime = `${toBengaliNum(twelveHour)}:${toBengaliNum(
    minutes.toString().padStart(2, "0"),
  )}`;

  return `${formattedDate}, ${period} ${formattedTime} ${ampm}`;
};

export function getCourseName(courseOrCycleDbValue = {}) {
  if (courseOrCycleDbValue?.cycleSubject?.cycle?.course?.productName) {
    return {
      course: courseOrCycleDbValue?.cycleSubject?.cycle?.course?.productName,
    };
  }
  if (courseOrCycleDbValue?.courseSubject?.course?.productName) {
    return {
      course: courseOrCycleDbValue?.courseSubject?.course?.productName,
    };
  }
}

export function getCourseOrCycleId(courseOrCycleDbValue = {}) {
  if (courseOrCycleDbValue?.cycleSubject?.cycleId) {
    return {
      cycleId: courseOrCycleDbValue.cycleSubject.cycleId,
    };
  }

  // Check if courseId exists in the structure
  if (courseOrCycleDbValue?.courseSubject?.courseId) {
    return {
      courseId: courseOrCycleDbValue.courseSubject.courseId,
    };
  }
  return null;
}

export async function getCourseOrCycleDomainUrl(courseOrCycleDbValue = {}) {
  //cycle url

  if (courseOrCycleDbValue?.cycleSubject?.cycleId) {
    return {
      url: "https://academic.aparsclassroom.com",
    };
  }

  // Check admission or frb
  if (courseOrCycleDbValue?.courseSubject?.courseId) {
    const courseId = courseOrCycleDbValue?.courseSubject?.courseId;

    //reterive course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        Category: true,
        productName: true,
        cycleAvailable: true,
      },
    });

    if (!course) return null;

    // Admission
    if (
      course.Category?.includes("Admission") &&
      !course.Category?.includes("Academic")
    ) {
      return { url: "https://admission.aparsclassroom.com" };
    } else {
      return { url: "https://frb.aparsclassroom.com" };
    }
  }

  return "";
}

export const sanitizeLiveClassResponse = (
  item,
  isAdmin = false,
  isStudent = false,
) => {
  if (isAdmin) return item;

  const {
    customHlsUrl,
    ingestType,
    isPredefined,
    publicEmbed,
    rtmp_url,
    rtmp_streamKey,
    ...rest
  } = item || {};

  if (publicEmbed) {
    return {
      ...rest,
      publicEmbed,
      customHlsUrl: publicEmbed ? customHlsUrl : null,
      // rtmp_url,
      // rtmp_streamKey,
    };
  }

  if (isStudent) {
    return {
      ...rest,
      publicEmbed,
      customHlsUrl: customHlsUrl,
    };
  }

  return rest;
};

// const obj = {
//   courseSubject: {
//     // courseId: "9d19af27-014c-45dc-9436-131db0fd6aa3", //frb
//     // courseId: "fdbcebc4-e52e-431f-abab-36a6dc5a91f7", //admission
//   },
// };

// getCourseOrCycleDomainUrl(obj).then((el) => console.log(el));
