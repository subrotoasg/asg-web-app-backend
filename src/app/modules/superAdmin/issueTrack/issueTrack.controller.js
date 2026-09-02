import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { issueTrackService } from "./issueTrack.services.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields } from "./issueTrack.constants.js";

const addNewIssueTag = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result = await issueTrackService.addNewIssueTag(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Issue tag created Successfull",
    data: result,
  });
});

const getIssueTags = catchAsync(async (req, res) => {
  const result = await issueTrackService.getIssueTags();

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Issue tags retrieved",
    data: result,
  });
});

const updateIssueTags = catchAsync(async (req, res) => {
  const bodyData = { ...req?.body, ...req?.user };
  const issueTagId = req?.params?.id;
  const result = await issueTrackService.updateIssueTags(issueTagId, bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Issue tag update successful",
    data: result,
  });
});

const addNewIssuePriority = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result = await issueTrackService.addNewIssuePriority(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Issue priority created Successfull",
    data: result,
  });
});

const getIssuePriorities = catchAsync(async (req, res) => {
  const result = await issueTrackService.getIssuePriorities();

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Issue priorities retrieved",
    data: result,
  });
});

const updateIssuePriority = catchAsync(async (req, res) => {
  const priorityId = req?.params?.id;
  const payload = { ...req?.body, ...req?.user };

  const result = await issueTrackService.updateIssuePriority(
    priorityId,
    payload,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Issue priority updated successful",
    data: result,
  });
});

const postNewIssue = catchAsync(async (req, res) => {
  const ip = req?.ip;
  const bodyData = { ...req?.body, ...req?.user, ip };
  const uploadedFiles = req?.uploadedFiles;
  const result = await issueTrackService.postNewIssue(bodyData, uploadedFiles);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "New issue posted successfully",
    data: result,
  });
});

const getAllIssues = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const body = { ...req?.body, ...req?.user };
  const query = pick(payloadQuery, pickQueryFields);
  const result = await issueTrackService.getAllIssues(
    body,
    query,
    payloadQuery,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Issues retrive successfull",
    data: result,
  });
});

const getStats = catchAsync(async (req, res) => {
  const result = await issueTrackService.getIssueStats();

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "issue stats retrived successfull",
    data: result,
  });
});

const updateIssue = catchAsync(async (req, res) => {
  const payload = { ...req?.body, ...req?.user };
  const issueId = req?.params?.id;
  const result = await issueTrackService.updateIssue(issueId, payload);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "issue update successfull",
    data: result,
  });
});

const updateIssueContent = catchAsync(async (req, res) => {
  const issueId = req?.params?.id;
  const payload = { ...req?.body, ...req?.user };
  const uploadedFiles = req?.uploadedFiles;

  const result = await issueTrackService.updateIssueContent(
    issueId,
    payload,
    uploadedFiles,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "issue content update successfull",
    data: result,
  });
});

export const issueTrackController = {
  getIssueTags,
  addNewIssueTag,
  updateIssueTags,
  addNewIssuePriority,
  getIssuePriorities,
  updateIssuePriority,
  postNewIssue,
  getAllIssues,
  getStats,
  updateIssue,
  updateIssueContent,
};
