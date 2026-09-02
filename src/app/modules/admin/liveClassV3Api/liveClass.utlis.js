export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  return (new Date(endTime) - new Date(startTime)) / 1000;
};

import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { query } from "express";
import { LiveClassServices } from "./liveClass.services.js";

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

export const handleParticipantsAndMeeages = async (query = {}, roomId) => {
  await LiveClassServices.getParticipantsAndMessagesFronMediaServer({}, roomId);
  return;
};
