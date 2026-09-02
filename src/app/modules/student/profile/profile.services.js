import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import { prisma } from "../../../../../constants/index.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { constants } from "../../../constant/index.js";
import config from "../../../config/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { filteredPayload } from "./profile.helpers.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { sendResponseFields } from "./profile.constants.js";
import { selectFieldsForStudent } from "../../authentication/auth.constants.js";
import { PDFGenerator } from "./profile.pdfGenerator.js";
import axios from "axios";

//student profile update
const studentProfileUpdateIntoDb = async (payload = {}, profilePhoto) => {
  const { studentId, studentPhone, studentEmail, ...rest } = payload;
  const updateRequestData = filteredPayload(rest);
  const data = transformUpdatedFields(updateRequestData, []);
  const isExistStudent = await prisma.student.findFirst({
    where: { id: studentId },
  });

  if (!isExistStudent)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Student Not found");

  let result;
  //if profilePhoto change
  if (profilePhoto) {
    //delete bunny
    if (isExistStudent?.profilePhoto) {
      // await removeFiles.deleteFromBunnyCDN(isExistStudent?.profilePhoto);
    }

    //here try to sync to shop profile  TODO::

    result = await prisma.student.update({
      where: {
        id: isExistStudent?.id,
      },
      data: {
        profilePhoto,
      },
    });

    try {
      const data = {
        uid: isExistStudent?.uid,
        photo: profilePhoto,
      };

      const updateShopProfile = await axios.post(
        `https://shop.aparsclassroom.com/profile/update-profile-photo`,
        data,
      );
      // console.log(updateShopProfile?.data, "update profile shop");
    } catch (error) {
      console.log(error?.message, "error syncing shop profile");
    }
  } else {
    //update Student Profile without photo
    result = await prisma.student.update({
      where: {
        id: isExistStudent?.id,
      },
      data,
    });
  }

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  return response;
};

const studentInfoDownloader = async (res, userInfo = {}) => {
  let pdfStarted = false;

  try {
    const { studentId } = userInfo;
    const studentInfo = await prisma.student.findFirst({
      where: {
        id: studentId,
      },
      select: selectFieldsForStudent,
    });

    if (!studentInfo) {
      if (!res.headersSent) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Student Not found",
        });
      }
      return;
    }

    const pdfGenerator = new PDFGenerator();

    const fileName = studentInfo?.name || studentInfo?.id || "student";
    const encodedFilename = encodeURIComponent(fileName);

    // Set response headers first
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="student-resume.pdf"; filename*=UTF-8''${encodedFilename}.pdf`,
    );

    // Create the PDF document
    const doc = pdfGenerator.createDocument();

    // Pipe the document to the response
    doc.pipe(res);
    pdfStarted = true;

    // Load all external resources FIRST before starting PDF content
    let logoBuffer = null;
    let photoBuffer = null;

    try {
      // Load logo
      logoBuffer = await Promise.race([
        pdfGenerator.fetchImageBuffer(
          "https://aparsclassroom.com/images/logo.png",
        ),
        new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
    } catch (err) {
      console.error("Failed to load logo:", err.message);
    }

    // Load student photo if available
    if (studentInfo?.profilePhoto) {
      try {
        photoBuffer = await Promise.race([
          pdfGenerator.fetchImageBuffer(studentInfo?.profilePhoto),
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
      } catch (err) {
        console.error("Failed to load student photo:", err.message);
      }
    }

    // Generate header with APARS CLASSROOM
    pdfGenerator.generateHeader(doc, {
      title: "",
      logoBuffer,
      date: new Date(),
      fontSize: 16,
      textColor: "#2c3e50",
    });

    // Add student photo if available
    if (photoBuffer) {
      doc.image(photoBuffer, 50, 80, {
        width: 60,
        height: 60,
        align: "left",
      });
    }

    // Student name and basic info
    doc
      .fontSize(18)
      .text(studentInfo?.name || "Student Name", 120, 80)
      .fontSize(10)
      .text(`Email: ${studentInfo?.email || "N/A"}`, 120, 100)
      .text(`Phone: ${studentInfo?.phone || "N/A"}`, 120, 115)
      .text(`Gender: ${studentInfo?.gender || "N/A"}`, 120, 130)
      .text(`Blood Group: ${studentInfo?.bloodGroup || "N/A"}`, 120, 145);

    // Personal Information Section
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#293c50")
      .text("PERSONAL INFORMATION", 50, 180)
      .font("Helvetica")
      .moveTo(50, 195)
      .lineTo(560, 195)
      .stroke();

    let yPosition = 200;

    // Personal info in two columns
    const personalInfo = [
      {
        label: "Date of Birth",
        value: studentInfo?.dob
          ? new Date(studentInfo?.dob).toLocaleDateString()
          : "N/A",
      },
      { label: "Religion", value: studentInfo?.religion || "N/A" },
      { label: "Group", value: studentInfo?.group || "N/A" },
      {
        label: "Emergency Contact",
        value: studentInfo?.emergencyContact || "N/A",
      },
      { label: "Disability", value: studentInfo?.disability ? "Yes" : "No" },
    ];

    personalInfo.forEach((info, index) => {
      const x = index % 2 === 0 ? 50 : 300;
      if (index % 2 === 0 && index !== 0) yPosition += 20;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(`${info.label}:`, x, yPosition)
        .font("Helvetica")
        .text(info.value, x + 95, yPosition);
    });

    yPosition += 30;

    // Academic Information Section
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#293c50")
      .text("ACADEMIC INFORMATION", 50, yPosition)
      .font("Helvetica")
      .moveTo(50, yPosition + 15)
      .lineTo(560, yPosition + 15)
      .stroke();

    yPosition += 20;

    // Academic records in a table
    const academicRecords = [];

    if (studentInfo?.jscRoll) {
      academicRecords.push({
        Exam: "JSC",
        Board: studentInfo?.jscBoard,
        Year: studentInfo?.jscYear,
        Roll: studentInfo?.jscRoll,
        GPA: studentInfo?.jscGpa,
      });
    }

    if (studentInfo?.sscRoll) {
      academicRecords.push({
        Exam: "SSC",
        Board: studentInfo?.sscBoard,
        Year: studentInfo?.sscYear,
        Roll: studentInfo?.sscRoll,
        GPA: studentInfo?.sscGpa,
      });
    }

    if (studentInfo?.hscRoll) {
      academicRecords.push({
        Exam: "HSC",
        Board: studentInfo?.hscBoard,
        Year: studentInfo?.hscYear,
        Roll: studentInfo?.hscRoll,
        GPA: studentInfo?.hscGpa,
      });
    }

    if (academicRecords.length > 0) {
      yPosition = pdfGenerator.generateTable(doc, {
        data: academicRecords,
        headers: ["Exam", "Board", "Year", "Roll", "GPA"],
        columnWidths: [60, 100, 60, 80, 60],
        startY: yPosition,
        rowHeight: 20,
        headerColor: "#fcfcfc",
        rowColors: { even: "#f8f9fa", odd: "#ffffff" },
        boldHeaders: true,
      });
    } else {
      doc.text("No academic records available", 50, yPosition);
      yPosition += 20;
    }

    yPosition += 10;

    // College Information Section - BOLD
    if (studentInfo?.collegeName) {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("COLLEGE INFORMATION", 50, yPosition)
        .font("Helvetica")
        .moveTo(50, yPosition + 15)
        .lineTo(560, yPosition + 15)
        .stroke();

      yPosition += 20;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Name:", 50, yPosition)
        .font("Helvetica")
        .text(studentInfo?.collegeName, 120, yPosition)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Address:", 50, yPosition + 15)
        .font("Helvetica")
        .text(studentInfo?.collegeAddress || "N/A", 120, yPosition + 15)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Session:", 50, yPosition + 30)
        .font("Helvetica")
        .text(studentInfo?.collegeSession || "N/A", 120, yPosition + 30);

      yPosition += 50;
    }

    // University Information Section - BOLD
    if (studentInfo?.universityChance) {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("UNIVERSITY INFORMATION", 50, yPosition)
        .font("Helvetica")
        .moveTo(50, yPosition + 15)
        .lineTo(560, yPosition + 15)
        .stroke();

      yPosition += 20;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Name:", 50, yPosition)
        .font("Helvetica")
        .text(studentInfo?.universityName || "N/A", 120, yPosition)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Subject:", 50, yPosition + 15)
        .font("Helvetica")
        .text(studentInfo?.universitySubject || "N/A", 120, yPosition + 15)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Session:", 50, yPosition + 30)
        .font("Helvetica")
        .text(studentInfo?.universitySession || "N/A", 120, yPosition + 30)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Position:", 50, yPosition + 45)
        .font("Helvetica")
        .text(studentInfo?.universityPosition || "N/A", 120, yPosition + 45)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Roll No:", 50, yPosition + 60)
        .font("Helvetica")
        .text(studentInfo?.universityRollNo || "N/A", 120, yPosition + 60);

      yPosition += 80;
    }

    // Family Information Section - BOLD
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#293c50")
      .text("FAMILY INFORMATION", 50, yPosition)
      .font("Helvetica")
      .moveTo(50, yPosition + 15)
      .lineTo(560, yPosition + 15)
      .stroke();

    yPosition += 20;

    // Father's Information Subsection - BOLD
    if (studentInfo?.fatherName) {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Father's Information:", 50, yPosition)
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Name:", 70, yPosition + 15)
        .font("Helvetica")
        .text(studentInfo?.fatherName, 165, yPosition + 15)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Profession:", 70, yPosition + 30)
        .font("Helvetica")
        .text(studentInfo?.fatherProfession || "N/A", 165, yPosition + 30)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Profession Type:", 70, yPosition + 45)
        .font("Helvetica")
        .text(studentInfo?.fatherProfessionType || "N/A", 165, yPosition + 45)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Yearly Income:", 70, yPosition + 60)
        .font("Helvetica")
        .text(studentInfo?.fatherIncome || "N/A", 165, yPosition + 60);

      yPosition += 80;
    }

    // Mother's Information Subsection - BOLD
    if (studentInfo?.motherName) {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Mother's Information:", 50, yPosition)
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Name:", 70, yPosition + 15)
        .font("Helvetica")
        .text(studentInfo?.motherName, 165, yPosition + 15)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Profession:", 70, yPosition + 30)
        .font("Helvetica")
        .text(studentInfo?.motherProfession || "N/A", 165, yPosition + 30)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Profession Type:", 70, yPosition + 45)
        .font("Helvetica")
        .text(studentInfo?.motherProfessionType || "N/A", 165, yPosition + 45)
        .font("Helvetica-Bold")
        .fillColor("#293c50")
        .text("Yearly Income:", 70, yPosition + 60)
        .font("Helvetica")
        .text(studentInfo?.motherIncome || "N/A", 165, yPosition + 60);

      yPosition += 80;
    }

    // === Helper Function for Address Row ===
    function renderAddressRow(doc, items, startY) {
      let x = 50;
      const colWidth = 170;

      items.forEach((info) => {
        doc
          .fontSize(10)
          .fillColor("#000000")
          .font("Helvetica-Bold")
          .text(`${info.label}:`, x, startY)
          .font("Helvetica")
          .fillColor("#444444")
          .text(info.value, x + 60, startY);

        x += colWidth;
      });

      return startY + 20;
    }

    // === Present Address ===
    if (studentInfo?.presentDivision) {
      const blockHeight = 70;
      if (yPosition + blockHeight > 750) {
        doc.addPage();
        yPosition = 50;
      }

      doc
        .fontSize(12)
        .fillColor("#293c50")
        .font("Helvetica-Bold")
        .text("PRESENT ADDRESS", 50, yPosition)
        .font("Helvetica")
        .moveTo(50, yPosition + 15)
        .lineTo(560, yPosition + 15)
        .stroke();

      yPosition += 20;

      yPosition = renderAddressRow(
        doc,
        [
          { label: "Division", value: studentInfo?.presentDivision || "N/A" },
          { label: "District", value: studentInfo?.presentDistrict || "N/A" },
          { label: "Upazila", value: studentInfo?.presentUpazila || "N/A" },
        ],
        yPosition,
      );

      yPosition = renderAddressRow(
        doc,
        [
          { label: "Union", value: studentInfo?.presentUnion || "N/A" },
          {
            label: "Post Office",
            value: studentInfo?.presentPostOffice || "N/A",
          },
          { label: "House", value: studentInfo?.presentHouse || "N/A" },
        ],
        yPosition,
      );

      if (studentInfo?.presentVillage) {
        yPosition = renderAddressRow(
          doc,
          [{ label: "Village", value: studentInfo?.presentVillage || "N/A" }],
          yPosition,
        );
      }

      yPosition += 20;
    }

    // === Permanent Address ===
    if (studentInfo?.permanentDivision) {
      const blockHeight = 70; // approx
      if (yPosition + blockHeight > 750) {
        doc.addPage();
        yPosition = 50;
      }

      doc
        .fontSize(12)
        .fillColor("#293c50")
        .font("Helvetica-Bold")
        .text("PERMANENT ADDRESS", 50, yPosition)
        .font("Helvetica")
        .moveTo(50, yPosition + 15)
        .lineTo(560, yPosition + 15)
        .stroke();

      yPosition += 20;

      yPosition = renderAddressRow(
        doc,
        [
          { label: "Division", value: studentInfo?.permanentDivision || "N/A" },
          { label: "District", value: studentInfo?.permanentDistrict || "N/A" },
          { label: "Upazila", value: studentInfo?.permanentUpazila || "N/A" },
        ],
        yPosition,
      );

      yPosition = renderAddressRow(
        doc,
        [
          { label: "Union", value: studentInfo?.permanentUnion || "N/A" },
          {
            label: "Post Office",
            value: studentInfo?.permanentPostOffice || "N/A",
          },
          { label: "House", value: studentInfo?.permanentHouse || "N/A" },
        ],
        yPosition,
      );

      if (studentInfo?.permanentVillage) {
        yPosition = renderAddressRow(
          doc,
          [{ label: "Village", value: studentInfo?.permanentVillage || "N/A" }],
          yPosition,
        );
      }

      yPosition += 20;
    }

    // Add footer to the current (last) page
    pdfGenerator.generateFooter(doc, {
      text: "This document has been digitally generated and authenticated. No physical signature is required.",
      fontSize: 9,
      textColor: "#7f8c8d",
    });

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error("Error generating student resume:", error);

    if (!pdfStarted && !res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to generate PDF",
      });
    } else {
      console.error("PDF generation failed after streaming started");
      // End the response to prevent further errors
      res.end();
    }
  }
};

const getMe = async (userInfo = {}) => {
  const { studentId } = userInfo;

  return true;

  if (!studentId) return true;

  const studentInfo = await prisma.student.findFirst({
    where: {
      id: studentId,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      profilePhoto: true,
      uid: true,
      updatedAt: true,
    },
  });

  try {
    const checkProfilePhoto = await axios.get(studentInfo?.profilePhoto);
    // console.log(checkProfilePhoto);
    return true;
  } catch (error) {
    // console.log(error);
    return true;
  }
};

export const profileService = {
  studentProfileUpdateIntoDb,
  studentInfoDownloader,
  getMe,
};
