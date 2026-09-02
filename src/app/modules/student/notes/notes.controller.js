import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { NotesServices } from "./notes.services.js";
import { generateNotesPdfBuffer } from "./notes.utlis.js";

//get All Notes controller
const GetAllNotes = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await NotesServices.getAllNotesfromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Notes retrive Successfull",
    data: result,
  });
});

//get single Notes controller
const GetSingleNotes = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const user = req?.body;
  const result = await NotesServices.getSingleNotesfromDb({ ...user, id });

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Notes retrive Successfull",
    data: result,
  });
});

//Create Notes controller
const createNotes = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const user = req?.user;
  const body = { ...bodyData, ...user };
  const result = await NotesServices.createNotesIntoDb(body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Notes Created Successfull",
    data: result,
  });
});

//Update Notes controller
const updateNotes = catchAsync(async (req, res) => {
  const NotesId = req.params.id;
  const bodyData = req?.body;
  const user = req?.user;
  const result = await NotesServices.updateNotesIntoDb(NotesId, {
    ...bodyData,
    ...user,
  });

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Notes Updated Successfull",
    data: result,
  });
});

//Delete Notes controller
const deleteNotes = catchAsync(async (req, res) => {
  const NotesId = req.params.id;
  const result = await NotesServices.deleteNotesFromDb(NotesId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Notes Deleted Successfull",
    data: result,
  });
});

//Download Notes controller
const downloadNotesController = catchAsync(async (req, res) => {
  const payload = req?.body;
  const query = req.query.type;
  const id = req.params.id;
  const result = await NotesServices.downloadNotesIntoDb(id, query, payload);

  const { pdfBuffer, safeName } = await generateNotesPdfBuffer({
    data: result,
    studentName: payload.studentEmail || "Student",
    logoUrl: "https://apars.b-cdn.net/logo-for-signature.png",
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName || "notes"}.pdf"`,
  );

  res.end(pdfBuffer);

  // //send Response Backend
  // return sendResponse(res, {
  //   statusCodes: StatusCodes.OK,
  //   success: true,
  //   message: "Notes Download Successfull",
  //   data: result,
  // });
});

export const NotesController = {
  createNotes,
  updateNotes,
  GetAllNotes,
  GetSingleNotes,
  deleteNotes,
  downloadNotesController,
};
