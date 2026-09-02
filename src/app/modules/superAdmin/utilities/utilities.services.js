import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import axios from "axios";
import qs from "qs";
import {
  searchableFieldsForGetAllStudents,
  selectFieldsForBannedStudents,
  selectFieldsForGetAllStudentsForCx,
  sortableFields,
} from "../../student/courseStudent/courseStudent.constants.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { helpers } from "../admin/admin.utils.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { skip } from "@prisma/client/runtime/library";
import config from "../../../config/index.js";
import { constants } from "../../../constant/index.js";
import {
  filterableFieldsForUtilities,
  searchableFields,
  selectFields,
  selectFieldsForActiceChats,
  sortableFieldsForUtilities,
} from "./utilities.constants.js";
import crypto from "node:crypto";
import { validate, version } from "uuid";
import { addSyncTransactionQueue } from "../../../queueNworker/queues/syncTransactionQueue.js";
import fs from "fs/promises";
import {
  getHijriDate,
  getOccasionTags,
  OCCASION_CATEGORY_MAP,
} from "../../../../helper/quranHelper.js";
import { z } from "zod";
import { bumpCourseCatalogVersion } from "../courses/courses.cache.js";
import { invalidateCourseStudentAccess } from "../../authentication/cache/authorization.cache.js";

const manifestFile = "./data/manifest.json";
const surahDir = "./data/surahs";

let manifest = null;
const surahCache = new Map();

const getSuperAdminInfo = async () => {
  const getInfo = await prisma.superAdmin.findMany({
    select: {
      email: true,
      phone: true,
    },
  });

  return getInfo;
};

const getStudentInfo = async (id) => {
  // if (id.toString().length < 34) return null;
  const getInfo = await prisma.courseStudent.findMany({
    where: {
      accessCode: { contains: id },
    },
    select: {
      accessCode: true,
      student: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          uid: true,
        },
      },
      course: {
        select: {
          productId: true,
          productName: true,
          productFullName: true,
          ProductImage: true,
          facebookGroup: true,
        },
      },
    },
  });

  const getInfoCycle = await prisma.cycleStudent.findMany({
    where: {
      accessCode: { contains: id },
    },
    select: {
      accessCode: true,
      student: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          uid: true,
        },
      },
      cycle: {
        select: {
          productId: true,
          title: true,
          cycleImage: true,
          facebookGroup: true,
          course: {
            select: {
              productName: true,
              productFullName: true,
            },
          },
        },
      },
    },
  });

  // console.dir(getInfoCycle, true);

  //detect afs course and find invoice link
  let invoice = null;
  const isAFS = id.startsWith("AFS");
  const isCamp = validate(id) ? true : false;

  if (isAFS) {
    const response = await axios.get(
      `https://hsc.acsfutureschool.com/api/crm/search?type=access_code&value=${id}`,
      {
        headers: {
          "x-crm-key": config.afs_crm_key,
        },
      },
    );

    const records = response?.data?.data || [];
    const theData = records.find((record) => record.status === "SUCCESS");

    if (response?.data?.success && theData) {
      invoice = `https://hsc.acsfutureschool.com/invoice/${theData?.payment_token}`;
    }
  } else if (isCamp) {
    const data = qs.stringify({
      tran_id: id,
    });
    const response = await axios.post(
      "https://api.acscamp.com/v1/transactions/lookup",
      data,
      {
        headers: {
          Authorization: `Bearer ${config.acs_camp_key}`,
        },
      },
    );

    if (
      response?.data?.status === 200 &&
      response?.data?.tranx &&
      (response?.data?.tranx?.status === "VALID" ||
        response?.data?.tranx?.status === "VALIDATED")
    ) {
      invoice = response?.data?.invoice;
    }
  } else {
    const getInvoice = await axios.post(
      "https://shop.aparsclassroom.com/query/transaction",
      { tran_id: id },
    );

    invoice = getInvoice?.data?.invoice;
  }

  const student = getInfo[0]?.student || getInfoCycle[0]?.student || null;

  let enrollments = getInfo?.map(({ accessCode, course }) => ({
    accessCode,
    course,
  }));

  getInfoCycle?.forEach(({ accessCode, cycle }) => {
    enrollments.push({
      accessCode,
      course: {
        productId: cycle?.productId || null,
        productName: cycle?.course?.productName + "-" + cycle?.title || "",
        productFullName: cycle?.course?.productFullName || "",
        ProductImage: cycle?.cycleImage || null,
        facebookGroup: cycle?.facebookGroup || null,
      },
    });
  });

  return {
    student,
    enrollments: enrollments || [],
    invoice: invoice,
  };
};

const getShopInfo = async (id) => {
  const accessCode = id.slice(0, -3);
  const getInvoice = await axios.post(
    "https://shop.aparsclassroom.com/query/transaction",
    { tran_id: accessCode },
  );
  return {
    shopName: getInvoice?.data?.tranx?.Name,
    shopUid: getInvoice?.data?.tranx?.uid,
    shopEmail: getInvoice?.data?.tranx?.Email,
    shopPhone: getInvoice?.data?.tranx?.Phone,
  };
};

const fixUid = async (id, studentId) => {
  const accessCode = id.slice(0, -3);
  const getInvoice = await axios.post(
    "https://shop.aparsclassroom.com/query/transaction",
    { tran_id: accessCode },
  );
  const getStudent = await prisma.student.findFirst({
    where: {
      id: studentId,
    },
  });

  if (!getStudent)
    throw new AppErrors(StatusCodes.NOT_FOUND, "No student found with the id");

  if (getStudent?.uid !== getInvoice?.data?.tranx?.uid) {
    const updateUid = await prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        uid: getInvoice?.data?.tranx?.uid,
      },
    });
  }
  return true;
};

const getStudent = async (id) => {
  const isUUID = z.string().uuid().safeParse(id).success;
  const where = isUUID
    ? {
        OR: [{ id }, { email: id }, { phone: id }, { name: id }],
      }
    : {
        OR: [{ email: id }, { phone: id }, { name: id }],
      };
  const getInfo = await prisma.student.findFirst({
    // where: {
    //   OR: [{ phone: id }, { email: id }, { name: id }],
    // },
    where,
    select: selectFieldsForGetAllStudentsForCx,
  });

  // console.log(getInfo?.cycle, "getInfo");

  let enrollments = getInfo?.course?.map((c) => ({
    accessCode: c?.accessCode,
    course: {
      courseId: c?.courseId,
      productId: c?.course?.productId || null,
      productName: c?.course?.productName,
      productFullName: c?.course?.productFullName || null,
      ProductImage: c?.course?.ProductImage || null,
      facebookGroup: c?.course?.facebookGroup || null,
    },
  }));

  getInfo?.cycle?.forEach((c) => {
    enrollments.push({
      accessCode: c?.accessCode,
      course: {
        cycleId: c?.cycleId,
        productId: c?.cycle?.productId || null,
        productName:
          c?.cycle?.course?.productName + "-" + c?.cycle?.title || "",
        productFullName: c?.cycle?.course?.productFullName || "",
        ProductImage: c?.cycle?.cycleImage || null,
        facebookGroup: c?.cycle?.facebookGroup || null,
      },
    });
  });

  const normalizedResponse = {
    student: {
      id: getInfo?.id,
      name: getInfo?.name,
      phone: getInfo?.phone,
      email: getInfo?.email,
      status: getInfo?.status,
      uid: getInfo?.uid,
    },
    enrollments: enrollments || [],
    ...(getInfo?.invoice ? { invoice: getInfo?.invoice } : {}),
  };

  return normalizedResponse;
};

const getBannedStudents = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFieldsForGetAllStudents,
    sortableFields,
  );

  const result = await prisma.student.findMany({
    where: {
      ...where,
      status: "INACTIVE",
    },
    skip,
    take,
    orderBy,
    select: selectFieldsForBannedStudents,
  });
  // total count of courses
  const totalCount = await prisma.student.count({
    where: {
      ...where,
      status: "INACTIVE",
    },
  });
  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);
  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;
  return {
    data: result,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const updateStudent = async (id, payload) => {
  const getStudent = await prisma.student.findUnique({
    where: {
      id,
    },
  });

  if (!getStudent)
    throw new AppErrors(StatusCodes.NOT_FOUND, "user not found to update");

  const { email, phone } = payload;

  const trimmedPhone = phone ? helpers.trimBDCountryCode(phone) : null;

  const data = {
    email,
    phone: trimmedPhone,
  };

  const updateData = transformUpdatedFields(data, []);

  const checkStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: updateData?.email }, { phone: updateData?.phone }],
    },
  });

  if (checkStudent && checkStudent?.id !== id)
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "another account already exist with these credentials",
    );

  const updateStudentInfo = await prisma.student.update({
    where: {
      id,
    },
    data: updateData,
  });

  return {
    name: updateStudentInfo?.name,
    email: updateStudentInfo?.email,
    phone: updateStudentInfo?.phone,
  };
};

const studentAction = async (id, payload) => {
  const { remarks } = payload;
  const getStudent = await prisma.student.findUnique({
    where: {
      id,
    },
  });

  if (!getStudent)
    throw new AppErrors(StatusCodes.NOT_FOUND, "user not found to update");

  const status = getStudent?.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const updateStudentInfo = await prisma.student.update({
    where: {
      id,
    },
    data: { status, remarks },
  });

  return {
    name: updateStudentInfo?.name,
    email: updateStudentInfo?.email,
    phone: updateStudentInfo?.phone,
    status: updateStudentInfo?.status,
  };
};

const getDashboardInfo = async (id) => {
  const getCourseInfo = await prisma.course.findMany({
    where: {
      id: id,
    },
    select: {
      cycle: {
        select: {
          _count: {
            select: { student: true, featured: true, noticeORroutine: true },
          },
          cycleSubject: {
            select: {
              cycleSubjectChapter: {
                select: {
                  _count: { select: { cycleContent: true } },
                  cycleContent: { select: { views: true } },
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          courseAdmin: true,
          student: true,
          featured: true,
          noticeORroutine: true,
        },
      },
      courseSubject: {
        select: {
          courseSubjectChapter: {
            select: {
              _count: { select: { classContent: true } },
              classContent: { select: { views: true } },
            },
          },
        },
      },
    },
  });

  let courseStudent = 0;
  let cycleStudent = 0;
  let courseAdmin = 0;
  let courseCycle = 0;
  let courseContent = 0;
  let totalViewsOnContent = 0;
  let courseFeatured = 0;
  let courseNotice = 0;

  getCourseInfo.map((course) => {
    course?.cycle.map((cycle) => {
      courseCycle += 1;
      cycleStudent += Number(cycle?._count?.student) || 0;
      courseFeatured += Number(cycle?._count?.featured) || 0;
      courseNotice += Number(cycle?._count?.noticeORroutine) || 0;

      cycle?.cycleSubject?.map((cycleSubjectChapter) => {
        cycleSubjectChapter?.cycleSubjectChapter?.map((el) => {
          courseContent += Number(el?._count?.cycleContent) || 0;
          el?.cycleContent?.map((view) => {
            totalViewsOnContent += Number(view?.views) || 0;
          });
        });
      });
    });

    courseAdmin += Number(course?._count?.courseAdmin) || 0;
    courseStudent += Number(course?._count?.student) || 0;
    courseFeatured += Number(course?._count?.featured) || 0;
    courseNotice += Number(course?._count?.noticeORroutine) || 0;

    course?.courseSubject.map((courseSubject) => {
      courseSubject?.courseSubjectChapter?.map((el) => {
        courseContent += Number(el?._count?.classContent) || 0;
        el?.classContent?.map((view) => {
          totalViewsOnContent += Number(view?.views) || 0;
        });
      });
    });
  });

  return {
    // getCourseInfo,
    student: Math.max(courseStudent, cycleStudent),
    courseAdmin,
    courseCycle,
    courseContent,
    totalViewsOnContent,
    courseNotice,
    courseFeatured,
  };
};

const initPurchaseFromWebAppv1 = async (productId, payload) => {
  const { studentId } = payload;

  const getStudent = await prisma.student.findFirst({
    where: {
      id: studentId,
    },
  });

  const uid = getStudent?.uid;

  const profileUrl = `https://profile.aparsclassroom.com/profile/info?uid=${uid}`;

  let getStudentInfo = null;

  getStudentInfo = await axios.get(profileUrl);

  // console.log(getStudentInfo?.data, "student");

  let Name, Email, Phone, Institution, HSC;

  if (getStudentInfo?.data?.status === 404) {
    const getAccessCode = await prisma.courseStudent.findMany({
      where: {
        studentId: getStudent?.id,
      },
    });

    const accessCode = [];

    accessCode.push(getAccessCode[0].accessCode?.substring(0, 33));
    accessCode.push(getAccessCode[0].accessCode?.substring(0, 34));
    accessCode.push(getAccessCode[0].accessCode?.substring(0, 35));

    // console.log(accessCode, "accessss");

    for (const acc of accessCode) {
      const data = qs.stringify({
        tran_id: acc,
      });

      try {
        const response = await axios.post(
          "https://secure.apars.shop/query/transaction",
          data,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );

        if (
          response?.data?.status === 200 &&
          response?.data?.tranx &&
          (response?.data?.tranx?.status === "VALID" ||
            response?.data?.tranx?.status === "VALIDATED")
        ) {
          Name = response?.data?.tranx?.Name;
          Email = response?.data?.tranx?.Email;
          Phone = response?.data?.tranx?.Phone;
          Institution = response?.data?.tranx?.Institution;
          HSC = response?.data?.tranx?.HSC;
        }
      } catch (error) {
        console.log(error?.message, "error ");
      }
    }
  }

  const checkProduct = await axios.get(
    `https://crm.apars.shop/product/edit?productId=${productId}&uid=${config.crmApiKey}`,
  );

  return {
    Platform: checkProduct?.data?.product?.Platform,
    productId: checkProduct?.data?.product?.productId,
    productName: checkProduct?.data?.product?.productName,
    productFullName: checkProduct?.data?.product?.productFullName,
    ProductImage: checkProduct?.data?.product?.ProductImage,
    currency_amount: checkProduct?.data?.product?.currency_amount,
    cycle: checkProduct?.data?.Cycle,
    cus_name: getStudentInfo?.data?.data?.Name || Name,
    cus_email: getStudentInfo?.data?.data?.Email || Email,
    Institution: getStudentInfo?.data?.data?.Institution || Institution,
    HSC: getStudentInfo?.data?.data?.HSC || HSC,
    cus_phone: getStudentInfo?.data?.data?.Phone || Phone,
    uid: uid || getStudentInfo?.data?.data?.uid,
  };
};

const initPurchaseFromWebAppv2 = async (payload) => {
  const { studentId, productId, affiliateProductIds } = payload;

  if (!affiliateProductIds)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "affiliate product id array is required",
    );

  const getStudent = await prisma.student.findFirst({
    where: {
      id: studentId,
    },
  });

  const uid = getStudent?.uid;

  const profileUrl = `https://profile.aparsclassroom.com/profile/info?uid=${uid}`;

  let getStudentInfo = null;

  try {
    getStudentInfo = await axios.get(profileUrl);
  } catch (error) {
    console.log(error, "error on profile fetch");
  }

  // console.log(getStudentInfo?.data, "student");

  let checkPreviousPurchase;

  if (!affiliateProductIds.includes(productId)) {
    affiliateProductIds.push(productId);
  }

  try {
    checkPreviousPurchase = await axios.post(
      "https://shop.aparsclassroom.com/v3/purchase/multiple",
      { products: affiliateProductIds, uid: uid },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );
  } catch (error) {
    console.log(error?.message, "checking multiple");
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "purchase initialization failed",
    );
  }

  if (checkPreviousPurchase?.data?.status === 200) {
    return checkPreviousPurchase?.data?.invoices;
  }

  let Name, Email, Phone, Institution, HSC;

  if (
    getStudentInfo?.data?.status === 404 ||
    !getStudentInfo?.data?.data?.Name ||
    !getStudentInfo?.data?.data?.Email ||
    !getStudentInfo?.data?.data?.Phone ||
    !getStudentInfo?.data?.data?.Institution ||
    !getStudentInfo?.data?.data?.HSC
  ) {
    console.log("in access code for purchase");
    const getAccessCode = await prisma.courseStudent.findMany({
      where: {
        studentId: getStudent?.id,
      },
    });

    const accessCode = [];

    accessCode.push(getAccessCode[0].accessCode?.substring(0, 33));
    accessCode.push(getAccessCode[0].accessCode?.substring(0, 34));
    accessCode.push(getAccessCode[0].accessCode?.substring(0, 35));

    // console.log(accessCode, "accessss");

    for (const acc of accessCode) {
      const data = qs.stringify({
        tran_id: acc,
      });

      try {
        const response = await axios.post(
          "https://secure.apars.shop/query/transaction",
          data,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );

        if (
          response?.data?.status === 200 &&
          response?.data?.tranx &&
          (response?.data?.tranx?.status === "VALID" ||
            response?.data?.tranx?.status === "VALIDATED")
        ) {
          Name = response?.data?.tranx?.Name;
          Email = response?.data?.tranx?.Email;
          Phone = response?.data?.tranx?.Phone;
          Institution = response?.data?.tranx?.Institution;
          HSC = response?.data?.tranx?.HSC;
        }
      } catch (error) {
        console.log(error?.message, "error ");
      }
    }
  }

  const checkProduct = await axios.get(
    `https://crm.apars.shop/product/edit?productId=${productId}&uid=${config.crmApiKey}`,
  );

  return {
    Platform: checkProduct?.data?.product?.Platform,
    productId: checkProduct?.data?.product?.productId,
    productName: checkProduct?.data?.product?.productName,
    productFullName: checkProduct?.data?.product?.productFullName,
    ProductImage: checkProduct?.data?.product?.ProductImage,
    currency_amount: checkProduct?.data?.product?.currency_amount,
    cycle: checkProduct?.data?.Cycle,
    cus_name: getStudentInfo?.data?.data?.Name || Name,
    cus_email: getStudentInfo?.data?.data?.Email || Email,
    Institution: getStudentInfo?.data?.data?.Institution || Institution,
    HSC: getStudentInfo?.data?.data?.HSC || HSC,
    cus_phone: getStudentInfo?.data?.data?.Phone || Phone,
    uid: uid || getStudentInfo?.data?.data?.uid,
  };
};

const purchaseFormWebApp = async (payload) => {
  const {
    productId,
    affiliateProductIds,
    studentId,
    productName,
    cycle,
    Cupon,
    ip,
    Platform,
    ship_name,
    ship_phone,
    ship_add1,
    ship_city,
    ship_upzilla,
    ship_method,
    cus_name,
    cus_email,
    Institution,
    HSC,
    cus_phone,
    uid,
  } = payload;

  if (
    Platform === "Physical" &&
    (!ship_name ||
      !ship_phone ||
      !ship_add1 ||
      !ship_city ||
      !ship_upzilla ||
      !ship_method ||
      !affiliateProductIds)
  ) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "For physical product ship_name ,ship_phone, ship_add1, ship_city, ship_upzilla, ship_method is needed",
    );
  }

  if (!affiliateProductIds.includes(productId)) {
    affiliateProductIds.push(productId);
  }

  // const getStudent = await prisma.student.findFirst({
  //   where: {
  //     id: studentId,
  //   },
  // });

  let checkPreviousPurchase;

  try {
    checkPreviousPurchase = await axios.post(
      "https://shop.aparsclassroom.com/v3/purchase/multiple",
      { products: affiliateProductIds, uid: uid },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );
  } catch (error) {
    console.log(error?.message, "checking multiple");
    throw new AppErrors(StatusCodes.BAD_REQUEST, "purchase failed");
  }

  if (checkPreviousPurchase?.data?.status === 200) {
    return constants?.duplicateBuyHtml;
  }

  let purchaseData = {};
  let purchaseUrl = cycle
    ? `https://shop.aparsclassroom.com/${cycle}/${productId}/init`
    : `https://shop.aparsclassroom.com/${productId}/init`;

  const checkCoupon = await axios.get(
    `https://shop.aparsclassroom.com/v1/Coupon/check/${Cupon}/${productId}`,
  );

  if (Platform === "Physical") {
    purchaseData = {
      productName: productName,
      Platform: Platform,
      cus_name,
      cus_email,
      Institution,
      HSC: HSC,
      cus_phone,
      uid,
      Ip: ip,
      Cupon: checkCoupon?.data?.status === "success" ? Cupon : "N/A",
      affiliate: "",
      utm_id: "404_team",
      utm_source: "webapp",
      utm_medium: "webapplink",
      utm_campaign: "webapp",
      utm_term: "tech_team",
      utm_content: "webapp_originals",
      lead: "",
      Referrer: "",
      ship_name: ship_name,
      ship_phone: ship_phone,
      ship_add1: ship_add1,
      ship_city: ship_city,
      ship_upzilla: ship_upzilla,
      ship_method: ship_method,
    };
  } else {
    purchaseData = {
      productName: productName,
      Platform: Platform,
      cus_name,
      cus_email,
      Institution,
      HSC: HSC,
      cus_phone,
      uid,
      Ip: ip,
      Cupon: checkCoupon?.data?.status === "success" ? Cupon : "N/A",
      affiliate: "",
      utm_id: "404_team",
      utm_source: "webapp",
      utm_medium: "webapplink",
      utm_campaign: "webapp",
      utm_term: "tech_team",
      utm_content: "webapp_originals",
      lead: "",
      Referrer: "",
    };
  }

  // console.log(purchaseData, "purchase data");

  const init = await axios.post(purchaseUrl, purchaseData, {
    headers: { "Content-Type": "application/json", responseType: "text" },
  });
  return init?.data;
};

const checkCupon = async (Cupon, productId) => {
  const check = await axios.get(
    `https://shop.aparsclassroom.com/v1/Coupon/check/${Cupon}/${productId}`,
  );

  return check?.data;
};

const addStreamingService2 = async (payload) => {
  const { productName } = payload;

  const getCourse = await prisma.course.findFirst({
    where: {
      isDeleted: false,
      markAsArchieve: false,
      productName: productName,
      pullzoneId2: null,
    },
  });

  if (!getCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "course not found!");

  const webhookUrl =
    "https://api.varsity.aparsclassroom.com/api/v1/media/live-class/status/change";

  // const mediaToken = await getMediaToken2();

  // if (!mediaToken)
  //   throw new AppErrors(
  //     StatusCodes.SERVICE_UNAVAILABLE,
  //     "streaming service auth error",
  //   );

  const sanitizedProductName = getCourse?.productName
    ?.replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();

  const data = {
    Name: `${sanitizedProductName}-my`,
    OriginUrl: "https://streaming.asgshop.my",
    AllowedReferrers: ["*.aparsclassroom.com", "*.asgshop.my"],
    BlockNoneReferrer: true,
    VerifyOriginSSL: true,
    Type: 1,
    EnableSmartCache: true,
    BlockRootPathAccess: true,
    BlockPostRequests: true,
    EnableAutoSSL: true,
  };

  try {
    const createBunnyPullZone = await axios.post(
      "https://api.bunny.net/pullzone",
      data,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const pullZoneId = createBunnyPullZone?.data?.Id;
    const cdnwithouthttp = createBunnyPullZone?.data?.Hostnames[0].Value;
    const cdnConfig = `https://${createBunnyPullZone?.data?.Hostnames[0].Value}`;

    const sslData = {
      Hostname: cdnwithouthttp,
      ForceSSL: true,
    };

    const forcessl = await axios.post(
      `https://api.bunny.net/pullzone/${pullZoneId}/setForceSSL`,
      sslData,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const m3u8Data = {
      Description: ".m3u8 playlist",
      OrderIndex: 1,
      Enabled: true,
      ActionType: 5,
      ActionParameter1: "Access-Control-Allow-Origin",
      ActionParameter2: "*",
      ActionParameter3: null,
      ExtraActions: [
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Allow-Methods",
          ActionParameter2: "GET, HEAD, OPTIONS",
          ActionParameter3: null,
        },
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Allow-Headers",
          ActionParameter2: "Range, Content-Type",
          ActionParameter3: null,
        },
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Expose-Headers",
          ActionParameter2: "Content-Length, Content-Range",
          ActionParameter3: null,
        },
        {
          ActionType: 3,
          ActionParameter1: 3,
          ActionParameter2: null,
        },
        {
          ActionType: 16,
          ActionParameter1: 0,
          ActionParameter2: null,
        },
      ],
      TriggerMatchingType: 0,
      Triggers: [
        {
          Type: 0,
          PatternMatchingType: 0,
          PatternMatches: ["*.m3u8", "*.m3u8?*"],
          Parameter1: null,
        },
      ],
    };

    const m3u8EdgeRule = await axios.post(
      `https://api.bunny.net/pullzone/${pullZoneId}/edgerules/addOrUpdate`,
      m3u8Data,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const tsData = {
      Description: ".ts segments",
      OrderIndex: 2,
      Enabled: true,
      ActionType: 5,
      ActionParameter1: "Access-Control-Allow-Origin",
      ActionParameter2: "*",
      ActionParameter3: null,
      ExtraActions: [
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Allow-Methods",
          ActionParameter2: "GET, HEAD, OPTIONS",
          ActionParameter3: null,
        },
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Allow-Headers",
          ActionParameter2: "Range, Content-Type",
          ActionParameter3: null,
        },
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Expose-Headers",
          ActionParameter2: "Content-Length, Content-Range",
          ActionParameter3: null,
        },
        {
          ActionType: 3,
          ActionParameter1: 86400,
          ActionParameter2: null,
        },
        {
          ActionType: 16,
          ActionParameter1: 3600,
          ActionParameter2: null,
        },
      ],
      TriggerMatchingType: 0,
      Triggers: [
        {
          Type: 0,
          PatternMatchingType: 0,
          PatternMatches: ["*.ts", "*.ts?*"],
          Parameter1: null,
        },
      ],
    };

    const tsEdgeRule = await axios.post(
      `https://api.bunny.net/pullzone/${pullZoneId}/edgerules/addOrUpdate`,
      tsData,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    // const mediaClientData = {
    //   name: `${sanitizedProductName}-my.aparsclassroom.com`,
    //   cdnConfig: {
    //     cdnUrl: cdnConfig,
    //     bunnyApiKey: config.bunny_main_api_key,
    //     bunnyPullZoneId: pullZoneId,
    //   },
    //   webhookConfig: {
    //     url: webhookUrl,
    //     secret: crypto.randomBytes(32).toString("hex"),
    //     enabled: true,
    //   },
    // };

    // const createClient = await axios.post(
    //   "https://media.asgshop.my/api/admin/clients",
    //   mediaClientData,
    //   {
    //     headers: {
    //       Authorization: mediaToken,
    //     },
    //   },
    // );

    // const clientId = createClient?.data?.data?.clientId;
    // const authKey = createClient?.data?.data?.authKey;

    const updateCourse = await prisma.course.update({
      where: {
        id: getCourse?.id,
      },
      data: {
        pullzoneId2: `${pullZoneId}`,
        // clientId: clientId,
        // authKey: authKey,
        // cdnConfig: cdnConfig,
        // bunnyApiKey: config.bunny_main_api_key,
      },
    });
    return true;
  } catch (error) {
    console.log(error, "error adding new streaming service");
    return false;
  }
};

const addStreamingService = async (payload) => {
  const { productName } = payload;

  const getCourse = await prisma.course.findFirst({
    where: {
      isDeleted: false,
      markAsArchieve: false,
      productName: productName,
      pullzoneId: null,
    },
  });

  if (!getCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "course not found!");

  const webhookUrl =
    "https://api.varsity.aparsclassroom.com/api/v1/media/live-class/status/change";

  const mediaToken = await getMediaToken();

  if (!mediaToken)
    throw new AppErrors(
      StatusCodes.SERVICE_UNAVAILABLE,
      "streaming service auth error",
    );

  const sanitizedProductName = getCourse?.productName
    ?.replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();

  const data = {
    Name: sanitizedProductName,
    OriginUrl: "https://streaming.aparsclassroom.com",
    AllowedReferrers: ["*.aparsclassroom.com"],
    BlockNoneReferrer: true,
    VerifyOriginSSL: true,
    Type: 1,
    EnableSmartCache: true,
    BlockRootPathAccess: true,
    BlockPostRequests: true,
    EnableAutoSSL: true,
  };

  try {
    const createBunnyPullZone = await axios.post(
      "https://api.bunny.net/pullzone",
      data,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const pullZoneId = createBunnyPullZone?.data?.Id;
    const cdnwithouthttp = createBunnyPullZone?.data?.Hostnames[0].Value;
    const cdnConfig = `https://${createBunnyPullZone?.data?.Hostnames[0].Value}`;

    const sslData = {
      Hostname: cdnwithouthttp,
      ForceSSL: true,
    };

    const forcessl = await axios.post(
      `https://api.bunny.net/pullzone/${pullZoneId}/setForceSSL`,
      sslData,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const m3u8Data = {
      Description: ".m3u8 playlist",
      OrderIndex: 1,
      Enabled: true,
      ActionType: 5,
      ActionParameter1: "Access-Control-Allow-Origin",
      ActionParameter2: "*",
      ActionParameter3: null,
      ExtraActions: [
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Allow-Methods",
          ActionParameter2: "GET, HEAD, OPTIONS",
          ActionParameter3: null,
        },
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Allow-Headers",
          ActionParameter2: "Range, Content-Type",
          ActionParameter3: null,
        },
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Expose-Headers",
          ActionParameter2: "Content-Length, Content-Range",
          ActionParameter3: null,
        },
        {
          ActionType: 3,
          ActionParameter1: 3,
          ActionParameter2: null,
        },
        {
          ActionType: 16,
          ActionParameter1: 0,
          ActionParameter2: null,
        },
      ],
      TriggerMatchingType: 0,
      Triggers: [
        {
          Type: 0,
          PatternMatchingType: 0,
          PatternMatches: ["*.m3u8"],
          Parameter1: null,
        },
      ],
    };

    const m3u8EdgeRule = await axios.post(
      `https://api.bunny.net/pullzone/${pullZoneId}/edgerules/addOrUpdate`,
      m3u8Data,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const tsData = {
      Description: ".ts segments",
      OrderIndex: 2,
      Enabled: true,
      ActionType: 5,
      ActionParameter1: "Access-Control-Allow-Origin",
      ActionParameter2: "*",
      ActionParameter3: null,
      ExtraActions: [
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Allow-Methods",
          ActionParameter2: "GET, HEAD, OPTIONS",
          ActionParameter3: null,
        },
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Allow-Headers",
          ActionParameter2: "Range, Content-Type",
          ActionParameter3: null,
        },
        {
          ActionType: 5,
          ActionParameter1: "Access-Control-Expose-Headers",
          ActionParameter2: "Content-Length, Content-Range",
          ActionParameter3: null,
        },
        {
          ActionType: 3,
          ActionParameter1: 86400,
          ActionParameter2: null,
        },
        {
          ActionType: 16,
          ActionParameter1: 3600,
          ActionParameter2: null,
        },
      ],
      TriggerMatchingType: 0,
      Triggers: [
        {
          Type: 0,
          PatternMatchingType: 0,
          PatternMatches: ["*.ts"],
          Parameter1: null,
        },
      ],
    };

    const tsEdgeRule = await axios.post(
      `https://api.bunny.net/pullzone/${pullZoneId}/edgerules/addOrUpdate`,
      tsData,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const mediaClientData = {
      name: `${sanitizedProductName}.aparsclassroom.com`,
      cdnConfig: {
        cdnUrl: cdnConfig,
        bunnyApiKey: config.bunny_main_api_key,
        bunnyPullZoneId: pullZoneId,
      },
      webhookConfig: {
        url: webhookUrl,
        secret: crypto.randomBytes(32).toString("hex"),
        enabled: true,
      },
    };

    const createClient = await axios.post(
      "https://media.aparsclassroom.com/api/admin/clients",
      mediaClientData,
      {
        headers: {
          Authorization: mediaToken,
        },
      },
    );

    const clientId = createClient?.data?.data?.clientId;
    const authKey = createClient?.data?.data?.authKey;

    const updateCourse = await prisma.course.update({
      where: {
        id: getCourse?.id,
      },
      data: {
        pullzoneId: `${pullZoneId}`,
        clientId: clientId,
        authKey: authKey,
        cdnConfig: cdnConfig,
        bunnyApiKey: config.bunny_main_api_key,
      },
    });
    await bumpCourseCatalogVersion();
    return true;
  } catch (error) {
    console.log(error, "error adding new streaming service");
    return false;
  }
};

async function getMediaToken2() {
  const data = {
    username: "404",
    password: "409",
  };

  let token = null;

  try {
    const response = await axios.post(
      "https://media.asgshop.my/api/admin/login",
      data,
    );

    token = `Bearer ${response?.data?.data?.token}`;
    return token;
  } catch (error) {
    console.log(error, "error getting token");
    return token;
  }
}

async function getMediaToken() {
  const data = {
    username: "404",
    password: "409",
  };

  let token = null;

  try {
    const response = await axios.post(
      "https://media.aparsclassroom.com/api/admin/login",
      data,
    );

    token = `Bearer ${response?.data?.data?.token}`;
    return token;
  } catch (error) {
    console.log(error, "error getting token");
    return token;
  }
}

const addStorageService = async (payload) => {
  const { productName } = payload;
  const getCourse = await prisma.course.findFirst({
    where: {
      productName: productName,
    },
  });

  if (!getCourse)
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "course not found, please check the product name",
    );

  if (getCourse?.libraryId) return true;

  //now create bunny video library with all configs
  const libraryData = {
    Name: productName,
    ReplicationRegions: ["SG"],
  };

  try {
    const createVideoLibrary = await axios.post(
      "https://api.bunny.net/videolibrary",
      libraryData,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const libraryId = `${createVideoLibrary?.data?.Id}`;
    const apiKey = createVideoLibrary?.data?.ApiKey;
    const pullZoneId = createVideoLibrary?.data?.PullZoneId;

    const getPullZoneInfo = await axios.get(
      `https://api.bunny.net/pullzone/${pullZoneId}`,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const zoneSecurityKey = getPullZoneInfo?.data?.ZoneSecurityKey;

    //assing course the library id and api key
    const updateCourse = await prisma.course.update({
      where: {
        id: getCourse?.id,
      },
      data: {
        libraryId: libraryId,
        zoneSecurityKey: zoneSecurityKey,
      },
    });

    await bumpCourseCatalogVersion();

    if (getCourse?.cycleAvailable) {
      const updateCycle = await prisma.cycle.updateMany({
        where: {
          courseId: getCourse?.id,
        },
        data: {
          libraryId: libraryId,
        },
      });
    }

    const updateLibApi = await prisma.libApi.create({
      data: {
        libraryId: libraryId,
        apiKey: apiKey,
      },
    });

    //update video library with options
    const updateData = {
      PlaybackSpeeds:
        "0.50, 0.75, 1.00, 1.15, 1.25, 1.50, 1.75, 2.00, 2.25,2.50, 2.75, 3.00, 4.00",
      Controls:
        "play,progress,current-time,mute,volume,settings,pip,airplay,fullscreen,duration,rewind,fast-forward",
      WebhookUrl:
        "https://api.varsity.aparsclassroom.com/api/v1/live-class/bunny/status/change",
      EnabledResolutions: "360p, 480p, 720p",
      EnableMP4Fallback: true,
      BlockNoneReferrer: false, //for download ffeartuer
      EnableMultiAudioTrackSupport: false,
      EnableContentTagging: false,
      ScaleVideoUsingBothDimensions: true,
      ShowHeatmap: true,
      RememberPlayerPosition: true,
      AllowDirectPlay: false,
      EnableDRM: true,
      WatermarkPositionLeft: 0,
      WatermarkPositionTop: 0,
      WatermarkWidth: 9,
      WatermarkHeight: 10,
    };

    const updateVideoLibrary = await axios.post(
      `https://api.bunny.net/videolibrary/${libraryId}`,
      updateData,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    const referData = {
      Hostname: "*.aparsclassroom.com",
    };

    const updateReferer = await axios.post(
      `https://api.bunny.net/videolibrary/${libraryId}/addAllowedReferrer`,
      referData,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    return true;
  } catch (error) {
    console.log(error, "error creating videoLibrary");
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Error adding storage service",
    );
  }
};

const getStudentStatus = async (payload) => {
  const { email } = payload;
  if (!email)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "email parameter is required");

  const getStudentStats = await prisma.student.findFirst({
    where: {
      email: email,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      studentAuthLogs: {
        select: {
          hoppCount: true,
          lastLogedIn: true,
        },
      },
    },
  });

  return getStudentStats;
};

const removeAuthBan = async (studentId) => {
  try {
    const removeBan = await prisma.studentAuthLog.updateMany({
      where: {
        studentId: studentId,
      },
      data: {
        hoppCount: 0,
      },
    });
    return true;
  } catch (error) {
    console.log(error?.message, "error while withdraw auth ban");
    return false;
  }
};

const parseDate = (date) => {
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

const getActivityLogs = async (payloadQuery, query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFieldsForUtilities,
    filterableFieldsForUtilities,
  );

  const { dateFrom, dateTo } = payloadQuery;

  const parsedDateFrom = parseDate(dateFrom);
  const parsedDateTo = parseDate(dateTo);

  const dateFilter = {};

  if (parsedDateFrom) {
    dateFilter.gte = parsedDateFrom;
  }

  if (parsedDateTo) {
    dateFilter.lte = parsedDateTo;
  }

  const whereClause = {
    ...where,
    ...(Object.keys(dateFilter).length > 0 && {
      createdAt: dateFilter,
    }),
  };

  const [result, totalCount] = await Promise.all([
    prisma.activityLogs.findMany({
      where: whereClause,
      orderBy,
      skip,
      take,
      select: selectFields,
    }),
    prisma.activityLogs.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / take);
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: result,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const getNotifiedFromCrm = async (payload, apiKey) => {
  if (apiKey !== config.shopApiKey)
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "un-authorized request");

  const { tranxId } = payload;

  const isAFS = tranxId.startsWith("AFS");

  const isCamp = validate(tranxId) ? true : false;

  let response = null;

  let theData = {};

  if (isCamp) {
    const data = qs.stringify({
      tran_id: tranxId,
    });

    try {
      response = await axios.post(
        "https://api.acscamp.com/v1/transactions/lookup",
        data,
        {
          headers: {
            Authorization: `Bearer ${config.acs_camp_key}`,
          },
        },
      );

      if (
        response &&
        response?.data?.status === 200 &&
        (response?.data?.tranx?.status === "VALID" ||
          response?.data?.tranx?.status === "VALIDATED")
      ) {
        theData = {
          source: "camp",
          transactionId: response?.data?.tranx?.tran_id,
          uid: response?.data?.tranx?.uid,
          name: response?.data?.tranx?.Name,
          email: response?.data?.tranx?.Email,
          phone: response?.data?.tranx?.phone,
          HSC: response?.data?.tranx?.HSC,
          institution: response?.data?.tranx?.Institution,
          productId: response?.data?.tranx?.Product?.productId,
          productName: response?.data?.tranx?.Product?.productName,
          gateway: response?.data?.tranx?.gw,
          amount: response?.data?.tranx?.currency_amount + "",
        };
      }

      const updateNotifiedTransaction =
        await prisma.notifiedTransactions.create({
          data: theData,
        });
      await addSyncTransactionQueue(tranxId);
      console.log("INFO: success on notified transaction CAMP");
    } catch (error) {
      console.log(
        error,
        `ERROR: inserting to notified transaction table CAMP ${response?.data?.tranx?.tran_id}`,
      );
    }
  } else if (isAFS) {
    try {
      response = await axios.get(
        `https://hsc.acsfutureschool.com/api/crm/search?type=access_code&value=${tranxId}`,
        {
          headers: {
            "x-crm-key": config.afs_crm_key,
          },
        },
      );

      if (
        response?.data?.success &&
        Array.isArray(response?.data?.data) &&
        response?.data?.data.length > 0 &&
        response?.data?.data[0].status === "SUCCESS"
      ) {
        theData = {
          source: "afs",
          transactionId: response?.data?.data[0].access_codes[0]?.code,
          uid: response?.data?.data[0]?.user_id,
          name: response?.data?.data[0]?.buyer_name,
          email: response?.data?.data[0]?.buyer_email,
          phone: response?.data?.data[0]?.buyer_phone,
          productId:
            response?.data?.data[0].access_codes[0]?.asg_shop_product_id,
          productName:
            response?.data?.data[0].access_codes[0]?.asg_shop_product_name,
          gateway: response?.data?.data[0]?.payment_method,
          amount: response?.data?.data[0]?.amount + "",
        };
      }

      const updateNotifiedTransaction =
        await prisma.notifiedTransactions.create({
          data: theData,
        });

      await addSyncTransactionQueue(tranxId);
      console.log("INFO: success on notified transaction AFS");
    } catch (error) {
      console.log(
        error,
        `ERROR: inserting to notified transaction table AFS ${response?.data?.data[0].access_codes[0]?.code}`,
      );
    }
  } else {
    try {
      theData = {
        source: "asg",
        transactionId: tranxId,
        uid: payload?.uid,
        name: payload?.name,
        email: payload?.email,
        phone: payload?.phone,
        productId: payload?.productId,
        productName: payload?.productName,
        gateway: payload?.paymentGateway,
      };

      const updateNotifiedTransaction =
        await prisma.notifiedTransactions.create({
          data: theData,
        });

      //call the queue of sync transaction
      await addSyncTransactionQueue(tranxId);
    } catch (error) {
      console.log(
        error,
        `ERROR: inserting to notified transaction table ASG ${response?.data?.data[0].access_codes[0]?.code}`,
      );
    }
  }
  return true;
};

const studentLookupForAFS = async (key, query) => {
  if (!key || key !== config.afs_crm_key) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "not authorized!");
  }

  const { type, value } = query;
  const queryType = ["email", "phone", "code"];

  if (!queryType.includes(type)) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "type can be only email/phone/code",
    );
  }

  if (!value) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "empty value given for corresponding type",
    );
  }

  if (type === "code" && (!value.startsWith("AFS") || value.length !== 12)) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "invalid afs access code format",
    );
  }

  // Reusable helper to fetch invoice from AFS CRM
  const fetchAfsInvoice = async (accessCode) => {
    try {
      const response = await axios.get(
        `https://hsc.acsfutureschool.com/api/crm/search?type=access_code&value=${accessCode}`,
        {
          headers: {
            "x-crm-key": config.afs_crm_key,
          },
        },
      );

      const records = response?.data?.data || [];
      const theData = records.find((record) => record.status === "SUCCESS");
      if (response?.data?.success && theData) {
        return `https://hsc.acsfutureschool.com/invoice/${theData?.payment_token}`;
      }
    } catch (error) {
      console.log("Error fetching AFS invoice:", error.message);
    }
    return null;
  };

  if (type === "code") {
    const getInfo = await prisma.courseStudent.findMany({
      where: { accessCode: { startsWith: value } },
      select: {
        accessCode: true,
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
          },
        },
        course: {
          select: {
            productId: true,
            productName: true,
            productFullName: true,
            ProductImage: true,
            facebookGroup: true,
          },
        },
      },
    });

    const getInfoCycle = await prisma.cycleStudent.findMany({
      where: { accessCode: { startsWith: value } },
      select: {
        accessCode: true,
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
          },
        },
        cycle: {
          select: {
            productId: true,
            title: true,
            cycleImage: true,
            facebookGroup: true,
            course: { select: { productName: true, productFullName: true } },
          },
        },
      },
    });

    const invoice = await fetchAfsInvoice(value);
    const student = getInfo[0]?.student || getInfoCycle[0]?.student || null;

    let enrollments = getInfo?.map(({ accessCode, course }) => ({
      accessCode,
      course,
    }));

    getInfoCycle?.forEach(({ accessCode, cycle }) => {
      enrollments.push({
        accessCode,
        course: {
          productId: cycle?.productId || null,
          productName: cycle?.course?.productName + "-" + cycle?.title || "",
          productFullName: cycle?.course?.productFullName || "",
          ProductImage: cycle?.cycleImage || null,
          facebookGroup: cycle?.facebookGroup || null,
        },
      });
    });

    return { student, enrollments: enrollments || [], invoice };
  } else {
    const getInfo = await prisma.student.findFirst({
      where: {
        OR: [{ phone: value }, { email: value }, { name: value }],
      },
      select: selectFieldsForGetAllStudentsForCx,
    });

    if (!getInfo) {
      return { student: null, enrollments: [], invoice: null };
    }

    let enrollments = [];
    let firstAfsAccessCode = null;

    getInfo?.course
      ?.filter((c) => c?.accessCode?.startsWith("AFS"))
      ?.forEach((c) => {
        if (!firstAfsAccessCode) firstAfsAccessCode = c.accessCode;

        enrollments.push({
          accessCode: c.accessCode,
          course: {
            productId: c.course?.productId || null,
            productName: c.course?.productName || null,
            productFullName: c.course?.productFullName || null,
            ProductImage: c.course?.ProductImage || null,
            facebookGroup: c.course?.facebookGroup || null,
          },
        });
      });

    getInfo?.cycle
      ?.filter((c) => c?.accessCode?.startsWith("AFS"))
      ?.forEach((c) => {
        if (!firstAfsAccessCode) firstAfsAccessCode = c.accessCode;

        enrollments.push({
          accessCode: c.accessCode,
          course: {
            productId: c.cycle?.productId || null,
            productName:
              c.cycle?.course?.productName + "-" + c.cycle?.title || "",
            productFullName: c.cycle?.course?.productFullName || null,
            ProductImage: c.cycle?.cycleImage || null,
            facebookGroup: c.cycle?.facebookGroup || null,
          },
        });
      });

    const invoice = firstAfsAccessCode
      ? await fetchAfsInvoice(firstAfsAccessCode)
      : null;

    return {
      student:
        Array.isArray(enrollments) && enrollments.length > 0
          ? {
              id: getInfo.id,
              name: getInfo.name,
              phone: getInfo.phone,
              email: getInfo.email,
              status: getInfo.status,
            }
          : {},
      enrollments,
      invoice,
    };
  }
};

const studentLookupForCAMP = async (key, query) => {
  if (!key || key !== config.acs_camp_key) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "not authorized!");
  }

  const { type, value } = query;
  const queryType = ["email", "phone", "code"];

  if (!queryType.includes(type)) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "type can be only email/phone/code",
    );
  }

  if (!value) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "empty value given for corresponding type",
    );
  }

  const isCamp = validate(value) ? true : false;

  if (type === "code" && !isCamp) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "invalid camp access code formate",
    );
  }

  const fetchCampInvoice = async (accessCode) => {
    try {
      const data = qs.stringify({
        tran_id: accessCode,
      });
      const response = await axios.post(
        `https://api.acscamp.com/v1/transactions/lookup`,
        data,
        {
          headers: {
            Authorization: `Bearer ${config.acs_camp_key}`,
          },
        },
      );

      if (
        response?.data?.status === 200 &&
        response?.data?.tranx &&
        (response?.data?.tranx?.status === "VALID" ||
          response?.data?.tranx?.status === "VALIDATED")
      ) {
        return response?.data?.invoice;
      }
    } catch (error) {
      console.log("Error fetching CAMP invoice:", error.message);
    }
    return null;
  };

  if (type === "code") {
    const getInfo = await prisma.courseStudent.findMany({
      where: { accessCode: { startsWith: value } },
      select: {
        accessCode: true,
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
          },
        },
        course: {
          select: {
            productId: true,
            productName: true,
            productFullName: true,
            ProductImage: true,
            facebookGroup: true,
          },
        },
      },
    });

    const getInfoCycle = await prisma.cycleStudent.findMany({
      where: { accessCode: { startsWith: value } },
      select: {
        accessCode: true,
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
          },
        },
        cycle: {
          select: {
            productId: true,
            title: true,
            cycleImage: true,
            facebookGroup: true,
            course: { select: { productName: true, productFullName: true } },
          },
        },
      },
    });

    const invoice = await fetchCampInvoice(value);
    const student = getInfo[0]?.student || getInfoCycle[0]?.student || null;

    let enrollments = getInfo?.map(({ accessCode, course }) => ({
      accessCode,
      course,
    }));

    getInfoCycle?.forEach(({ accessCode, cycle }) => {
      enrollments.push({
        accessCode,
        course: {
          productId: cycle?.productId || null,
          productName: cycle?.course?.productName + "-" + cycle?.title || "",
          productFullName: cycle?.course?.productFullName || "",
          ProductImage: cycle?.cycleImage || null,
          facebookGroup: cycle?.facebookGroup || null,
        },
      });
    });

    return { student, enrollments: enrollments || [], invoice };
  } else {
    const getInfo = await prisma.student.findFirst({
      where: {
        OR: [{ phone: value }, { email: value }, { name: value }],
      },
      select: selectFieldsForGetAllStudentsForCx,
    });

    if (!getInfo) {
      return { student: null, enrollments: [], invoice: null };
    }

    let enrollments = [];
    let firstAfsAccessCode = null;

    getInfo?.course
      ?.filter((c) => validate(c?.accessCode))
      ?.forEach((c) => {
        if (!firstAfsAccessCode) firstAfsAccessCode = c.accessCode;

        enrollments.push({
          accessCode: c.accessCode,
          course: {
            productId: c.course?.productId || null,
            productName: c.course?.productName || null,
            productFullName: c.course?.productFullName || null,
            ProductImage: c.course?.ProductImage || null,
            facebookGroup: c.course?.facebookGroup || null,
          },
        });
      });

    getInfo?.cycle
      ?.filter((c) => validate(c?.accessCode))
      ?.forEach((c) => {
        if (!firstAfsAccessCode) firstAfsAccessCode = c.accessCode;

        enrollments.push({
          accessCode: c.accessCode,
          course: {
            productId: c.cycle?.productId || null,
            productName:
              c.cycle?.course?.productName + "-" + c.cycle?.title || "",
            productFullName: c.cycle?.course?.productFullName || null,
            ProductImage: c.cycle?.cycleImage || null,
            facebookGroup: c.cycle?.facebookGroup || null,
          },
        });
      });

    const invoice = firstAfsAccessCode
      ? await fetchCampInvoice(firstAfsAccessCode)
      : null;

    return {
      student:
        Array.isArray(enrollments) && enrollments.length > 0
          ? {
              id: getInfo.id,
              name: getInfo.name,
              phone: getInfo.phone,
              email: getInfo.email,
              status: getInfo.status,
            }
          : {},
      enrollments,
      invoice,
    };
  }
};

async function loadManifest() {
  if (!manifest) {
    manifest = JSON.parse(await fs.readFile(manifestFile, "utf8"));
  }
  return manifest;
}

async function loadSurah(surah) {
  if (!surahCache.has(surah)) {
    const raw = await fs.readFile(`${surahDir}/${surah}.json`, "utf8");
    surahCache.set(surah, JSON.parse(raw));
  }
  return surahCache.get(surah);
}

function seededIndex(seedStr, max) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++)
    h = (Math.imul(h, 31) + seedStr.charCodeAt(i)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 1 | h);
  h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h;
  return Math.floor((((h ^ (h >>> 14)) >>> 0) / 4294967296) * max);
}

const getDailyAyah = async () => {
  const dateKey = getIslamicDateKey();
  const existing = await prisma.dailyAyah.findUnique({
    where: { date: new Date(dateKey) },
  });
  if (existing) return existing.payload;

  return computeAndStoreDailyAyah(dateKey);
};

const getSurah = async (surahNo) => {
  const n = Number(surahNo);
  if (!Number.isInteger(n) || n < 1 || n > 114) {
    const err = new Error("Invalid surah number");
    err.status = 400;
    throw err;
  }

  const raw = await fs.readFile(`${surahDir}/${n}.json`, "utf8");
  return JSON.parse(raw);
};

function getIslamicDateKey() {
  const bd = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
  );
  if (bd.getHours() >= 18) {
    bd.setDate(bd.getDate() + 1);
  }
  return bd.toISOString().slice(0, 10);
}

async function getRecentAyahKeys(days = 30) {
  const rows = await prisma.dailyAyah.findMany({
    orderBy: { date: "desc" },
    take: days,
    select: { ayahKey: true },
  });
  return rows.map((r) => r.ayahKey);
}

export const computeAndStoreDailyAyah = async (
  dateKey = getIslamicDateKey(),
) => {
  const list = await loadManifest();

  // noon avoids any DST/timezone rounding pushing this into the wrong civil day
  const targetDate = new Date(`${dateKey}T12:00:00`);
  const hijri = await getHijriDate(targetDate);
  const occasionTags = getOccasionTags(hijri);

  const relevantCategories = occasionTags.flatMap(
    (t) => OCCASION_CATEGORY_MAP[t] || [],
  );

  let pool = list;
  if (relevantCategories.length) {
    const matched = list.filter((e) =>
      e.categories?.some((c) => relevantCategories.includes(c)),
    );
    if (matched.length) pool = matched;
  }

  const recentKeys = await getRecentAyahKeys(30);
  const fresh = pool.filter((e) => !recentKeys.includes(e.ayahKey));
  const finalPool = fresh.length ? fresh : pool;

  const idx = seededIndex(dateKey, finalPool.length);
  const entry = finalPool[idx];

  const surahAyahs = await loadSurah(entry.surah);
  const ayah = surahAyahs.find((a) => a.ayah === entry.ayah);

  const payload = {
    ...ayah,
    hijriDate: {
      day: hijri.day,
      month: hijri.month,
      monthName: hijri.monthName,
      year: hijri.year,
      formatted: hijri.formatted,
    },
    occasionTags,
    surahRef: {
      surah: entry.surah,
      surahName: ayah.surahName,
      totalAyah: ayah.totalAyah,
      url: `https://cdn.aparsclassroom.com/surahs/${entry.surah}.json`,
    },
  };

  await prisma.dailyAyah.upsert({
    where: { date: new Date(dateKey) },
    create: {
      date: new Date(dateKey),
      surah: entry.surah,
      ayah: entry.ayah,
      ayahKey: entry.ayahKey,
      occasionTags,
      payload,
    },
    update: {
      surah: entry.surah,
      ayah: entry.ayah,
      ayahKey: entry.ayahKey,
      occasionTags,
      payload,
    },
  });

  return payload;
};

const removeStudentAccess = async (payload) => {
  const { courseOrCycleId, studentId } = payload;

  if (!courseOrCycleId || !studentId) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "courseOrCycleId and studentId are required",
    );
  }

  const getCourse = await prisma.course.findFirst({
    where: { id: courseOrCycleId },
  });

  if (getCourse) {
    const getCourseStudent = await prisma.courseStudent.findFirst({
      where: {
        courseId: getCourse.id,
        studentId: studentId,
      },
    });

    if (getCourseStudent) {
      await prisma.courseStudent.delete({
        where: {
          courseId_studentId: {
            courseId: getCourse.id,
            studentId: studentId,
          },
        },
      });
      await invalidateCourseStudentAccess({
        studentId,
        courseId: getCourse.id,
      });
    }

    return true;
  }

  const getCycle = await prisma.cycle.findFirst({
    where: { id: courseOrCycleId },
  });

  if (getCycle) {
    const getCycleStudent = await prisma.cycleStudent.findFirst({
      where: {
        cycleId: getCycle.id,
        studentId: studentId,
      },
    });

    if (getCycleStudent) {
      await prisma.cycleStudent.delete({
        where: {
          cycleId_studentId: {
            cycleId: getCycle.id,
            studentId: studentId,
          },
        },
      });
    }
  }

  return true;
};

//interaction baned unbaned
const banUnbanInteractionIntoDb = async (payload = {}) => {
  const {
    studentId,
    type,
    reason,
    room_name,
    banned_by,
    banned_by_name,
    duration = 7,
    messageId,
  } = payload;

  const now = new Date();

  let bannedUntil = new Date(now);
  bannedUntil.setDate(now.getDate() + Number(duration));
  const creationData = {
    studentId,
    type,
    reason,
    room_name,
    banned_by,
    banned_by_name,
    bannedAt: now,
    bannedUntil,
  };
  //student restirction
  const result = await prisma.studentRestriction.create({
    data: creationData,
  });
  //message
  const messageDel = await prisma.activeChat.delete({
    where: {
      id: messageId,
    },
  });

  return result;
};

//Studnet Restriction condition
const activeRestrictionWhere = {
  OR: [
    {
      studentId: null,
    },
    {
      student: {
        studentRestrictions: {
          none: {
            bannedUntil: {
              gt: new Date(),
            },
          },
        },
      },
    },
  ],
};

//active all chat info
const getAllActiveChatFromDb = async (query) => {
  query.sortBy = "messageCreatedAt";
  query.sortOrder = "desc";

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    [],
    ["messageCreatedAt"],
  );
  const activeChatInfo = await prisma.activeChat.findMany({
    where: {
      ...where,
    },
    orderBy,
    skip,
    take,
    select: selectFieldsForActiceChats,
  });
  const formatted = activeChatInfo
    ?.filter((item) => {
      const restrictions = item?.student?.studentRestrictions ?? [];

      return !restrictions.some(
        (r) => !r.bannedUntil || new Date(r.bannedUntil) > new Date(),
      );
    })
    ?.map((item) => {
      const sender = item?.student || item.admin || item.superAdmin;

      return {
        id: item?.id,
        message: item?.message,
        createdAt: Number(item?.messageCreatedAt),

        classType: item?.classContentId ? "CLASS_CONTENT" : "CYCLE_CONTENT",
        classId: item?.classContentId || item?.cycleContentId,

        sender: {
          id: sender?.id,
          name: sender?.name,
          avatar: sender?.profilePhoto,
          role: sender?.role,
        },
      };
    });

  // total count of courses
  const totalCount = await prisma.activeChat.count({
    where: {
      ...where,
      ...activeRestrictionWhere,
    },
  });
  const totalPages = Math.ceil(totalCount / take);
  const currentPage = Math.ceil(skip / take) + 1;
  return {
    data: formatted,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

//Content based info
const getContentBasedActiveChatInfoFromDb = async (id, query) => {
  query.sortBy = "messageCreatedAt";
  query.sortOrder = "desc";

  const { skip, take, orderBy, where } = buildQueryOptions(query, [], []);

  let activeChatInfo;
  let totalCount;
  if (query?.type === "class") {
    activeChatInfo = await prisma.activeChat.findMany({
      where: {
        classContentId: id,
      },
      orderBy,
      skip,
      take,
      select: selectFieldsForActiceChats,
    });

    totalCount = await prisma.activeChat.count({
      where: {
        classContentId: id,
        ...where,
        ...activeRestrictionWhere,
      },
    });
  } else if (query?.type === "cycle") {
    activeChatInfo = await prisma.activeChat.findMany({
      where: {
        cycleContentId: id,
      },
      orderBy,
      skip,
      take,
      select: selectFieldsForActiceChats,
    });

    totalCount = await prisma.activeChat.count({
      where: {
        cycleContentId: id,
        ...where,
        ...activeRestrictionWhere,
      },
    });
  } else {
    console.log("Sorry Type not matched");
    return [];
  }

  const formatted = activeChatInfo
    ?.filter((item) => {
      const restrictions = item?.student?.studentRestrictions ?? [];

      return !restrictions.some(
        (r) => !r.bannedUntil || new Date(r.bannedUntil) > new Date(),
      );
    })
    ?.map((item) => {
      const sender = item?.student || item.admin || item.superAdmin;

      return {
        id: item?.id,
        message: item?.message,
        createdAt: Number(item?.messageCreatedAt),

        // classType: item?.classContentId ? "CLASS_CONTENT" : "CYCLE_CONTENT",
        // classId: item?.classContentId || item?.cycleContentId,

        sender: {
          id: sender?.id,
          name: sender?.name,
          avatar: sender?.profilePhoto,
          role: sender?.role,
        },
      };
    });
  // total count of courses
  const totalPages = Math.ceil(totalCount / take);
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: formatted,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

//Media Rotation Password ==================
const APPS = ["FRB", "ACADEMIC", "ADMISSION"];
const ROTATION_MINUTES = 5;
const LOCK_ID = 987654321;

export async function rotateMediaCredentials() {
  const now = new Date();
  const validUntil = new Date(now.getTime() + ROTATION_MINUTES * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_ID})`;

    const result = [];

    for (const app of APPS) {
      const current = await tx.mediaCredential.findUnique({
        where: { app_status: { app, status: "ACTIVE" } },
      });

      const newData = {
        keyId: crypto.randomUUID(),
        hash: crypto.randomBytes(12).toString("hex"),
        version: (current?.version ?? 0) + 1,
        validFrom: now,
        validUntil,
      };

      await tx.mediaCredential.upsert({
        where: { app_status: { app, status: "ACTIVE" } },
        update: newData,
        create: { app, status: "ACTIVE", ...newData },
      });

      if (current) {
        await tx.mediaCredential.upsert({
          where: { app_status: { app, status: "EXPIRED" } },
          update: {
            keyId: current.keyId,
            hash: current.hash,
            version: current.version,
            validFrom: current.validFrom,
            validUntil: current.validUntil,
          },
          create: {
            app,
            status: "EXPIRED",
            keyId: current.keyId,
            hash: current.hash,
            version: current.version,
            validFrom: current.validFrom,
            validUntil: current.validUntil,
          },
        });
      }

      result.push({ app, rotated: true });
    }

    return result;
  });
}

//media credentials
const getMediaCredentialsFronDb = async () => {
  const credential = await prisma.mediaCredential.findMany({
    where: {
      status: "ACTIVE",
      validUntil: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      app: true,
      hash: true,
      validFrom: true,
      validUntil: true,
    },
  });

  if (!credential) {
    throw new AppErrors(StatusCodes.NOT_FOUND, `No active credential found`);
  }

  return credential;
};

//check Media Credentials
const checkMediaCredentialsIntoDb = async (payload, hostName) => {
  const { app, hash } = payload || {};

  const count = await prisma.mediaCredential.count({
    where: {
      app,
      hash,
      status: "ACTIVE",
      validUntil: {
        gt: new Date(),
      },
    },
  });

  return {
    isAuth: count > 0,
  };
};

const addEvent = async (payload) => {
  const { startDate, endDate, eventData } = payload;

  const parsedStartDate = startDate ? new Date(startDate) : null;
  const parsedEndDate = endDate ? new Date(endDate) : null;

  if (parsedStartDate && Number.isNaN(parsedStartDate.getTime())) {
    throw new Error("Invalid event start date");
  }

  if (parsedEndDate && Number.isNaN(parsedEndDate.getTime())) {
    throw new Error("Invalid event end date");
  }

  if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
    throw new Error("Event end date must be after its start date");
  }

  return prisma.event.create({
    data: {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      metaData: eventData,
    },
  });
};

const getEvent = async () => {
  const now = new Date();

  const event = await prisma.event.findFirst({
    where: {
      AND: [
        {
          OR: [{ startDate: null }, { startDate: { lte: now } }],
        },
        {
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      ],
    },
    orderBy: {
      startDate: {
        sort: "desc",
        nulls: "last",
      },
    },
  });

  if (!event) {
    return {
      event: null,
      cacheTtlSeconds: 3600,
    };
  }

  return {
    event: {
      id: event.id,
      startDate: event.startDate,
      endDate: event.endDate,
      ...(event.metaData || {}),
    },
    cacheTtlSeconds: 3600,
  };
};

const checkGcEligibility = async (query) => {
  const { phone, email, code } = query;

  const admissionProductCodes = [
    "621",
    "600",
    "599",
    "594",
    "585",
    "584",
    "583",
    "581",
    "580",
    "578",
    "571",
    "570",
    "569",
    "562",
    "561",
    "558",
    "557",
    "556",
    "555",
    "554",
    "551",
    "550",
    "549",
    "548",
    "547",
    "546",
    "545",
    "541",
    "540",
    "536",
    "535",
    "534",
    "530",
    "529",
    "525",
    "523",
    "522",
    "521",
    "520",
    "426",
    "420",
    "406",
    "405",
    "404",
    "403",
    "402",
    "401",
    "383",
    "381",
    "372",
    "369",
    "368",
    "366",
    "361",
  ];

  const academicProductCodes = [
    "635",
    "382",
    "360",
    "359",
    "358",
    "351",
    "350",
    "341",
    "332",
    "324",
    "323",
    "299",
    "298",
    "297",
    "295",
    "294",
    "292",
    "289",
    "286",
    "283",
    "282",
    "281",
    "280",
    "279",
    "278",
    "277",
    "276",
    "275",
    "274",
    "273",
    "269",
    "266",
    "264",
    "261",
    "260",
    "259",
    "254",
    "253",
    "252",
    "251",
    "250",
    "249",
    "248",
    "191",
  ];

  if (phone) {
    const thePhone = helpers.trimBDCountryCode(phone);

    const data = qs.stringify({
      phone: `+88${thePhone}`,
    });

    const response = await axios.post(
      "https://secure.apars.shop/query/phone",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (
      response?.data?.status === 200 &&
      response?.data?.tranx &&
      response?.data?.tranx?.length > 0
    ) {
      const onlyValid = response?.data?.tranx.map((el) => {
        if (el?.status === "VALID" || el?.status === "VALIDATED") return el;
      });

      for (const v of onlyValid) {
        if (
          admissionProductCodes.includes(v?.Product?.productId) ||
          academicProductCodes.includes(v?.Product?.productId)
        ) {
          return {
            VerifiedBy: "Phone",
            Name: v?.Name,
            Email: v?.Email,
            Phone: v?.Phone,
            uid: v?.uid,
            Institution: v?.Institution,
            HSC: v?.HSC,
            status: v?.status,
            productName: v?.ProductName,
          };
        }
      }
    }
  }

  if (email) {
    const data = qs.stringify({
      email: email,
    });

    const response = await axios.post(
      "https://secure.apars.shop/query/email",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (
      response?.data?.status === 200 &&
      response?.data?.tranx &&
      response?.data?.tranx?.length > 0
    ) {
      const onlyValid = response?.data?.tranx.map((el) => {
        if (el?.status === "VALID" || el?.status === "VALIDATED") return el;
      });

      for (const v of onlyValid) {
        if (
          admissionProductCodes.includes(v?.Product?.productId) ||
          academicProductCodes.includes(v?.Product?.productId)
        ) {
          return {
            VerifiedBy: "Email",
            Name: v?.Name,
            Email: v?.Email,
            Phone: v?.Phone,
            uid: v?.uid,
            Institution: v?.Institution,
            HSC: v?.HSC,
            status: v?.status,
            productName: v?.ProductName,
          };
        }
      }
    }
  }

  if (code) {
    const data = qs.stringify({
      tran_id: code,
    });

    const response = await axios.post(
      "https://secure.apars.shop/query/transaction",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (
      response?.data?.status === 200 &&
      response?.data?.tranx &&
      (response?.data?.tranx?.status === "VALID" ||
        response?.data?.tranx?.status === "VALIDATED")
    ) {
      if (
        admissionProductCodes.includes(
          response?.data?.tranx?.Product?.productId,
        ) ||
        academicProductCodes.includes(response?.data?.tranx?.Product?.productId)
      ) {
        return {
          VerifiedBy: "AccessCode",
          Name: response?.data?.tranx?.Name,
          Email: response?.data?.tranx?.Email,
          Phone: response?.data?.tranx?.Phone,
          uid: response?.data?.tranx?.uid,
          Institution: response?.data?.tranx?.Institution,
          HSC: response?.data?.tranx?.HSC,
          status: response?.data?.tranx?.status,
          productName: response?.data?.tranx?.ProductName,
        };
      }
    }
  }

  return {};
};

export const utilitiesServices = {
  getStudentInfo,
  getSuperAdminInfo,
  getStudent,
  getBannedStudents,
  updateStudent,
  checkCupon,
  studentAction,
  getDashboardInfo,
  purchaseFormWebApp,
  initPurchaseFromWebAppv1,
  initPurchaseFromWebAppv2,
  addStreamingService,
  addStorageService,
  getStudentStatus,
  removeAuthBan,
  getActivityLogs,
  getNotifiedFromCrm,
  studentLookupForAFS,
  studentLookupForCAMP,
  getDailyAyah,
  removeStudentAccess,
  getSurah,
  banUnbanInteractionIntoDb,
  getAllActiveChatFromDb,
  getContentBasedActiveChatInfoFromDb,
  addStreamingService2,
  getMediaCredentialsFronDb,
  checkMediaCredentialsIntoDb,
  addEvent,
  getEvent,
  checkGcEligibility,
  getShopInfo,
  fixUid,
};
