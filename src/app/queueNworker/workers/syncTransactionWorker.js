import { validate } from "uuid";
import { createWorker } from "./worker.js";
import axios from "axios";
import { helpers } from "../../modules/superAdmin/admin/admin.utils.js";
import { isValidBdPhone } from "../../utlis/phoneUtils.js";
import { Enums } from "../../constant/enums.js";
import config from "../../config/index.js";
import { PushMessagingServices } from "../../modules/student/firebase/messaging/pushMessaging/pushMessaging.services.js";
import qs from "qs";
import { prisma } from "../../../../constants/index.js";
import { invalidateCourseStudentAccess } from "../../modules/authentication/cache/authorization.cache.js";

const syncTransactionWorker = createWorker(
  "syncTransaction-processing",
  async (job) => {
    const { tranxId } = job?.data;
    try {
      //now need to check if camp or afs also
      const isAfs = tranxId.startsWith("AFS");
      const isCamp = validate(tranxId) ? true : false;

      if (isAfs) {
        const response = await axios.get(
          `https://hsc.acsfutureschool.com/api/crm/search?type=access_code&value=${tranxId}`,
          {
            headers: {
              "x-crm-key": config.afs_crm_key,
            },
          },
        );

        const records = response?.data?.data || [];
        const theData = records.find((record) => record.status === "SUCCESS");

        if (response?.data?.success && theData) {
          // const theData = response?.data?.data[0];
          const getStudent = await prisma.student.findFirst({
            where: {
              OR: [
                { email: theData?.buyer_email },
                { phone: helpers.trimBDCountryCode(theData?.buyer_phone) },
              ],
            },
          });

          if (!getStudent) return;

          let changePhone = false;

          if (!isValidBdPhone(getStudent?.phone)) changePhone = true;

          const logTitle = `AFS-${getStudent?.name} কোর্স এ অটোমেটিক এক্সেস পেয়েছেন`;
          const logDesc = `AFS-${getStudent?.name}, ${theData?.access_codes[0]?.asg_shop_product_name} কোর্স এ এক্সেস পেয়েছেন`;
          const logType = Enums.logType.student;

          if (changePhone) {
            try {
              const updateStudent = await prisma.student.update({
                where: {
                  id: getStudent?.id,
                },
                data: {
                  phone: helpers.trimBDCountryCode(theData?.buyer_phone),
                },
              });
            } catch (error) {
              console.log(error, "error updating phone of camp user");
            }
          }

          const checkProduct = await axios.get(
            `https://crm.apars.shop/product/edit?productId=${theData?.access_codes[0]?.asg_shop_product_id}&uid=${config.crmApiKey}`,
          );

          if (
            checkProduct?.data?.product?.Category &&
            checkProduct?.data?.product?.Category.includes("Academic") &&
            !theData?.access_codes[0]?.asg_shop_product_name.includes("FRB")
          ) {
            const getCycles = await prisma.cycle.findMany({
              where: {
                OR: [
                  {
                    productId: theData?.access_codes[0]?.asg_shop_product_id,
                  },
                  {
                    affiliateProductIds: {
                      has: theData?.access_codes[0]?.asg_shop_product_id,
                    },
                  },
                ],
              },
            });

            const cycleIds = getCycles.map((el) => el?.id);

            const getAlready = await prisma.cycleStudent.findMany({
              where: {
                cycleId: {
                  in: cycleIds,
                },
                studentId: getStudent?.id,
              },
            });

            const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

            const filteredCycles = cycleIds.filter(
              (el) => !getAlreadyIds.includes(el),
            );

            const updateData = [];
            const updateCourseData = [];
            const courseMap = new Map();

            for (const c of filteredCycles) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const exists = await prisma.cycleStudent.findFirst({
                where: {
                  cycleId: c,
                  accessCode: {
                    contains: tranxId,
                  },
                },
              });

              if (exists) {
                return;
              }

              const getCourseId = await prisma.cycle.findFirst({
                where: {
                  id: c,
                },
              });

              const checkCourseAccess = await prisma.courseStudent.findUnique({
                where: {
                  courseId_studentId: {
                    courseId: getCourseId?.courseId,
                    studentId: getStudent?.id,
                  },
                },
              });

              if (!checkCourseAccess) {
                const courseId = getCourseId?.courseId;

                if (!courseMap.has(courseId)) {
                  const courseData = {
                    courseId: courseId,
                    studentId: getStudent?.id,
                    accessCode: tranxId + randomChars,
                  };
                  courseMap.set(courseId, courseData);
                  updateCourseData.push(courseData);
                }
              }

              updateData.push({
                cycleId: c,
                studentId: getStudent?.id,
                accessCode: tranxId + randomChars,
              });
            }

            //send notification
            try {
              const eventKey = tranxId;
              const payload = {
                // studentId: getStudent?.id,
                title: `${theData?.buyer_name} আপনি ${theData?.access_codes[0]?.asg_shop_product_name} কোর্সটি কিনেছেন`,
                body: `কোর্সটি সফলভাবে কেনা হয়েছে`,
                data: {
                  studentId: getStudent?.id,
                  type: "single_user",
                  deepLink: "https://academic.aparsclassroom.com",
                  actions: "",
                },
                eventKey,
              };
              await PushMessagingServices.singleUserSendNotificationFromDb(
                payload,
              );
            } catch (error) {
              console.log(error, "error sending push notification");
            }

            return true;
          } else {
            //call the cycle here also
            const getCycles = await prisma.cycle.findMany({
              where: {
                OR: [
                  {
                    productId: theData?.access_codes[0]?.asg_shop_product_id,
                  },
                  {
                    affiliateProductIds: {
                      has: theData?.access_codes[0]?.asg_shop_product_id,
                    },
                  },
                ],
              },
            });

            const cycleIds = getCycles.map((el) => el?.id);

            const getAlreadyCycle = await prisma.cycleStudent.findMany({
              where: {
                cycleId: {
                  in: cycleIds,
                },
                studentId: getStudent?.id,
              },
            });

            const getAlreadyIdsCycle = getAlreadyCycle?.map(
              (el) => el?.cycleId,
            );

            const filteredCycles = cycleIds.filter(
              (el) => !getAlreadyIdsCycle.includes(el),
            );

            const updateDataCycle = [];
            const updateCourseData = [];
            const courseMap = new Map();

            for (const c of filteredCycles) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const exists = await prisma.cycleStudent.findFirst({
                where: {
                  cycleId: c,
                  accessCode: {
                    contains: tranxId,
                  },
                },
              });

              if (exists) {
                return;
              }

              const getCourseId = await prisma.cycle.findFirst({
                where: {
                  id: c,
                },
              });

              const checkCourseAccess = await prisma.courseStudent.findUnique({
                where: {
                  courseId_studentId: {
                    courseId: getCourseId?.courseId,
                    studentId: getStudent?.id,
                  },
                },
              });

              if (!checkCourseAccess) {
                const courseId = getCourseId?.courseId;

                if (!courseMap.has(courseId)) {
                  const courseData = {
                    courseId: courseId,
                    studentId: getStudent?.id,
                    accessCode: tranxId + randomChars,
                  };
                  courseMap.set(courseId, courseData);
                  updateCourseData.push(courseData);
                }
              }

              updateDataCycle.push({
                cycleId: c,
                studentId: getStudent?.id,
                accessCode: tranxId + randomChars,
              });
            }

            const checkAccessCode = await prisma.courseStudent.findMany({
              where: {
                accessCode: {
                  contains: tranxId,
                },
              },
            });

            const getCourse = await prisma.course.findMany({
              where: {
                OR: [
                  {
                    productId: theData?.access_codes[0]?.asg_shop_product_id,
                  },
                  {
                    affiliateProductIds: {
                      has: theData?.access_codes[0]?.asg_shop_product_id,
                    },
                  },
                ],
              },
            });

            const courseIds = getCourse.map((el) => el?.id);

            const getAlready = await prisma.courseStudent.findMany({
              where: {
                courseId: {
                  in: courseIds,
                },
                studentId: getStudent?.id,
              },
            });

            const getAlreadyIds = getAlready?.map((el) => el?.courseId);

            const filteredCourses = courseIds.filter(
              (el) => !getAlreadyIds.includes(el),
            );
            const updateData = [];
            for (const c of filteredCourses) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const exists = await prisma.courseStudent.findFirst({
                where: {
                  courseId: c,
                  accessCode: {
                    contains: tranxId,
                  },
                },
              });

              if (exists) {
                return;
              }

              updateData.push({
                courseId: c,
                studentId: getStudent?.id,
                accessCode: tranxId + randomChars,
              });
            }

            // console.log(updateData, "AFS-the data before auto assignStudent");

            //temporary off auto access
            // const assignStudent = await prisma.courseStudent.createMany({
            //   data: updateData,
            // });

            // console.log(assignStudent, "AFS- auto assigning");

            // try {
            //   await activity.logActivity(logTitle, logDesc, logType);
            // } catch (error) {
            //   console.log(error, "Error logging activity in course redeem");
            // }

            //send notification
            try {
              const eventKey = tranxId;
              const payload = {
                // studentId: getStudent?.id,
                title: `${theData?.buyer_name} আপনি ${theData?.access_codes[0]?.asg_shop_product_name} কোর্সটি কিনেছেন`,
                body: `কোর্সটি সফলভাবে কেনা হয়েছে`,
                data: {
                  studentId: getStudent?.id,
                  type: "single_user",
                  deepLink: "https://academic.aparsclassroom.com",
                  actions: "",
                },
                eventKey,
              };
              await PushMessagingServices.singleUserSendNotificationFromDb(
                payload,
              );
            } catch (error) {
              console.log(error, "error sending push notification");
            }

            return true;
          }
        }
      } else if (isCamp) {
        const data = qs.stringify({
          tran_id: tranxId,
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
          const getStudent = await prisma.student.findFirst({
            where: {
              OR: [
                {
                  email: response?.data?.tranx?.Email,
                },
                {
                  phone: helpers.trimBDCountryCode(
                    response?.data?.tranx?.Phone,
                  ),
                },
              ],
            },
          });

          if (!getStudent) return;

          let changePhone = false;

          if (!isValidBdPhone(getStudent?.phone)) changePhone = true;

          const logTitle = `CAMP-${getStudent?.name} কোর্স এ অটো এক্সেস পেয়েছেন`;
          const logDesc = `CAMP-${getStudent?.name}, ${response?.data?.tranx?.Product?.productName} কোর্স এ অটো এক্সেস পেয়েছেন`;
          const logType = Enums.logType.student;

          if (changePhone) {
            try {
              const updateStudent = await prisma.student.update({
                where: {
                  id: getStudent?.id,
                },
                data: {
                  phone: helpers.trimBDCountryCode(
                    response?.data?.tranx?.Phone,
                  ),
                },
              });
            } catch (error) {
              console.log(error, "error updating phone of ios user");
            }
          }

          const checkProduct = await axios.get(
            `https://crm.apars.shop/product/edit?productId=${response?.data?.tranx?.Product?.productId}&uid=${config.crmApiKey}`,
          );

          if (
            checkProduct?.data?.product?.Category &&
            checkProduct?.data?.product?.Category.includes("Academic") &&
            !response?.data?.tranx?.Product?.productName.includes("FRB")
          ) {
            const getCycles = await prisma.cycle.findMany({
              where: {
                OR: [
                  {
                    productId: response?.data?.tranx?.Product?.productId,
                  },
                  {
                    affiliateProductIds: {
                      has: response?.data?.tranx?.Product?.productId,
                    },
                  },
                ],
              },
            });

            const cycleIds = getCycles.map((el) => el?.id);

            const getAlready = await prisma.cycleStudent.findMany({
              where: {
                cycleId: {
                  in: cycleIds,
                },
                studentId: getStudent?.id,
              },
            });

            const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

            const filteredCycles = cycleIds.filter(
              (el) => !getAlreadyIds.includes(el),
            );

            const updateData = [];
            const updateCourseData = [];
            const courseMap = new Map();

            for (const c of filteredCycles) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const exists = await prisma.cycleStudent.findFirst({
                where: {
                  cycleId: c,
                  accessCode: {
                    contains: tranxId,
                  },
                },
              });

              if (exists) {
                return;
              }

              const getCourseId = await prisma.cycle.findFirst({
                where: {
                  id: c,
                },
              });

              const checkCourseAccess = await prisma.courseStudent.findUnique({
                where: {
                  courseId_studentId: {
                    courseId: getCourseId?.courseId,
                    studentId: getStudent?.id,
                  },
                },
              });

              if (!checkCourseAccess) {
                const courseId = getCourseId?.courseId;

                if (!courseMap.has(courseId)) {
                  const courseData = {
                    courseId: courseId,
                    studentId: getStudent?.id,
                    accessCode: tranxId + randomChars,
                  };
                  courseMap.set(courseId, courseData);
                  updateCourseData.push(courseData);
                }
              }

              updateData.push({
                cycleId: c,
                studentId: getStudent?.id,
                accessCode: tranxId + randomChars,
              });
            }

            // console.log(updateData, "ACS CAMP-the data before assignStudent");
            // console.log(
            //   updateCourseData,
            //   "ACS CAMP-the data before assignStudent",
            // );

            //temporary off the auto access
            // const assignStudent = await prisma.cycleStudent.createMany({
            //   data: updateData,
            // });

            // const assignStudentCouse = await prisma.courseStudent.createMany({
            //   data: updateCourseData,
            // });
            // console.log(assignStudent, "ACS CAMP-assigning");

            // try {
            //   await activity.logActivity(logTitle, logDesc, logType);
            // } catch (error) {
            //   console.log(error, "Error logging activity in course redeem");
            // }

            //send notification
            try {
              const eventKey = tranxId;
              const payload = {
                // studentId: getStudent?.id,
                title: `${response?.data?.tranx?.Name} আপনি ${response?.data?.tranx?.Product?.productName} কোর্সটি কিনেছেন`,
                body: `কোর্সটি সফলভাবে কেনা হয়েছে`,
                data: {
                  studentId: getStudent?.id,
                  type: "single_user",
                  deepLink: "https://academic.aparsclassroom.com",
                  actions: "",
                },
                eventKey,
              };
              await PushMessagingServices.singleUserSendNotificationFromDb(
                payload,
              );
            } catch (error) {
              console.log(error, "error sending push notification");
            }

            return true;
          } else {
            //call the cycle here also
            const getCycles = await prisma.cycle.findMany({
              where: {
                OR: [
                  {
                    productId: response?.data?.tranx?.Product?.productId,
                  },
                  {
                    affiliateProductIds: {
                      has: response?.data?.tranx?.Product?.productId,
                    },
                  },
                ],
              },
            });

            const cycleIds = getCycles.map((el) => el?.id);

            const getAlreadyCycle = await prisma.cycleStudent.findMany({
              where: {
                cycleId: {
                  in: cycleIds,
                },
                studentId: getStudent?.id,
              },
            });

            const getAlreadyIdsCycle = getAlreadyCycle?.map(
              (el) => el?.cycleId,
            );

            const filteredCycles = cycleIds.filter(
              (el) => !getAlreadyIdsCycle.includes(el),
            );

            const updateDataCycle = [];
            const updateCourseData = [];
            const courseMap = new Map();

            for (const c of filteredCycles) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const exists = await prisma.cycleStudent.findFirst({
                where: {
                  cycleId: c,
                  accessCode: {
                    contains: tranxId,
                  },
                },
              });

              if (exists) {
                return;
              }

              const getCourseId = await prisma.cycle.findFirst({
                where: {
                  id: c,
                },
              });

              const checkCourseAccess = await prisma.courseStudent.findUnique({
                where: {
                  courseId_studentId: {
                    courseId: getCourseId?.courseId,
                    studentId: getStudent?.id,
                  },
                },
              });

              if (!checkCourseAccess) {
                const courseId = getCourseId?.courseId;

                if (!courseMap.has(courseId)) {
                  const courseData = {
                    courseId: courseId,
                    studentId: getStudent?.id,
                    accessCode: tranxId + randomChars,
                  };
                  courseMap.set(courseId, courseData);
                  updateCourseData.push(courseData);
                }
              }

              updateDataCycle.push({
                cycleId: c,
                studentId: getStudent?.id,
                accessCode: tranxId + randomChars,
              });
            }

            // console.log(
            //   updateDataCycle,
            //   "ACS CAMP-the data before auto assignStudent",
            // );
            // console.log(
            //   updateCourseData,
            //   "ACS CAMP-the data before auto assignStudent",
            // );

            //temporary off auto access
            // const assignStudentCycle = await prisma.cycleStudent.createMany({
            //   data: updateDataCycle,
            // });

            // const assignStudentCouse = await prisma.courseStudent.createMany({
            //   data: updateCourseData,
            // });

            // console.log(assignStudentCycle, "ACS CAMP-assigning");

            //here end the cycle call here

            const checkAccessCode = await prisma.courseStudent.findMany({
              where: {
                accessCode: {
                  contains: tranxId,
                },
              },
            });

            const getCourse = await prisma.course.findMany({
              where: {
                OR: [
                  {
                    productId: response?.data?.tranx?.Product?.productId,
                  },
                  {
                    affiliateProductIds: {
                      has: response?.data?.tranx?.Product?.productId,
                    },
                  },
                ],
              },
            });

            const courseIds = getCourse.map((el) => el?.id);

            const getAlready = await prisma.courseStudent.findMany({
              where: {
                courseId: {
                  in: courseIds,
                },
                studentId: getStudent?.id,
              },
            });

            const getAlreadyIds = getAlready?.map((el) => el?.courseId);

            const filteredCourses = courseIds.filter(
              (el) => !getAlreadyIds.includes(el),
            );
            const updateData = [];
            for (const c of filteredCourses) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const exists = await prisma.courseStudent.findFirst({
                where: {
                  courseId: c,
                  accessCode: {
                    contains: tranxId,
                  },
                },
              });

              if (exists) {
                return;
              }

              updateData.push({
                courseId: c,
                studentId: getStudent?.id,
                accessCode: tranxId + randomChars,
              });
            }

            // console.log(
            //   updateData,
            //   "ACS CAMP-the data before auto assignStudent",
            // );

            //temporary off auto access
            // const assignStudent = await prisma.courseStudent.createMany({
            //   data: updateData,
            // });

            // console.log(assignStudent, "ACS CAMP- auto assigning");

            // try {
            //   await activity.logActivity(logTitle, logDesc, logType);
            // } catch (error) {
            //   console.log(error, "Error logging activity in course redeem");
            // }

            //send notification
            try {
              const eventKey = tranxId;
              const payload = {
                // studentId: getStudent?.id,
                title: `${response?.data?.tranx?.Name} আপনি ${response?.data?.tranx?.Product?.productName} কোর্সটি কিনেছেন`,
                body: `কোর্সটি সফলভাবে কেনা হয়েছে`,
                data: {
                  studentId: getStudent?.id,
                  type: "single_user",
                  deepLink: "https://academic.aparsclassroom.com",
                  actions: "",
                },
                eventKey,
              };
              await PushMessagingServices.singleUserSendNotificationFromDb(
                payload,
              );
            } catch (error) {
              console.log(error, "error sending push notification");
            }

            return true;
          }
        } else {
          return true;
        }
      } else {
        //no need to check if its afs or camp cause queues job only on asg
        const data = qs.stringify({
          tran_id: tranxId,
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
          const getStudent = await prisma.student.findFirst({
            where: {
              OR: [
                {
                  uid: response?.data?.tranx?.uid,
                },
                {
                  email: response?.data?.tranx?.Email,
                },
                {
                  phone: helpers.trimBDCountryCode(
                    response?.data?.tranx?.Phone,
                  ),
                },
              ],
            },
          });

          if (!getStudent) return;

          let changePhone = false;

          if (!isValidBdPhone(getStudent?.phone)) changePhone = true;

          const logTitle = `${getStudent?.name} কোর্স এ অটোমেটিক এক্সেস নিয়েছেন`;
          const logDesc = `${getStudent?.name}, ${response?.data?.tranx?.Product?.productName} কোর্স এ এক্সেস নিয়েছেন`;
          const logType = Enums.logType.student;

          // try {
          //   const updateUid = await prisma.student.update({
          //     where: {
          //       id: getStudent?.id,
          //     },
          //     data: {
          //       uid: response?.data?.tranx?.uid,
          //       batch: response?.data?.tranx?.HSC,
          //       institution: response?.data?.tranx?.Institution,
          //       ...(changePhone && {
          //         phone: helpers.trimBDCountryCode(
          //           response?.data?.tranx?.Phone,
          //         ),
          //       }),
          //     },
          //   });
          // } catch (error) {
          //   console.log(error, "Error updating phone");
          // }

          try {
            const comebackId = "621";

            const getCombackCourse = await prisma.course.findFirst({
              where: {
                productId: comebackId,
              },
            });

            const isCombackExist = await prisma.courseStudent.findFirst({
              where: {
                courseId: getCombackCourse?.id,
                accessCode: {
                  contains: tranxId,
                },
              },
            });

            if (
              !isCombackExist &&
              (response?.data?.tranx?.HSC === "HSC 24" ||
                response?.data?.tranx?.HSC === "HSC 25")
            ) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const assign = await prisma.courseStudent.create({
                data: {
                  courseId: getCombackCourse?.id,
                  studentId: getStudent?.id,
                  accessCode: tranxId + randomChars,
                },
              });
              await invalidateCourseStudentAccess({
                studentId: getStudent?.id,
                courseId: getCombackCourse?.id,
              });
            }
          } catch (error) {
            console.log(error, "error on comeback access");
          }

          const checkProduct = await axios.get(
            `https://crm.apars.shop/product/edit?productId=${response?.data?.tranx?.Product?.productId}&uid=${config.crmApiKey}`,
          );

          if (
            response?.data?.tranx?.Product?.Cycle !== "" ||
            (checkProduct?.data?.product?.Category &&
              checkProduct?.data?.product?.Category.includes("Academic") &&
              !response?.data?.tranx?.Product?.productName.includes("FRB"))
          ) {
            const getCycles = await prisma.cycle.findMany({
              where: {
                OR: [
                  {
                    productId: response?.data?.tranx?.Product?.productId,
                  },
                  {
                    affiliateProductIds: {
                      has: response?.data?.tranx?.Product?.productId,
                    },
                  },
                ],
              },
            });

            const cycleIds = getCycles.map((el) => el?.id);

            const getAlready = await prisma.cycleStudent.findMany({
              where: {
                cycleId: {
                  in: cycleIds,
                },
                studentId: getStudent?.id,
              },
            });

            const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

            const filteredCycles = cycleIds.filter(
              (el) => !getAlreadyIds.includes(el),
            );

            const updateData = [];
            const updateCourseData = [];
            const courseMap = new Map();
            for (const c of filteredCycles) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const exists = await prisma.cycleStudent.findFirst({
                where: {
                  cycleId: c,
                  accessCode: {
                    contains: tranxId,
                  },
                },
              });

              if (exists) {
                return;
              }

              const getCourseId = await prisma.cycle.findFirst({
                where: {
                  id: c,
                },
              });

              const checkCourseAccess = await prisma.courseStudent.findUnique({
                where: {
                  courseId_studentId: {
                    courseId: getCourseId?.courseId,
                    studentId: getStudent?.id,
                  },
                },
              });

              if (!checkCourseAccess) {
                const courseId = getCourseId?.courseId;

                if (!courseMap.has(courseId)) {
                  const courseData = {
                    courseId: courseId,
                    studentId: getStudent?.id,
                    accessCode: tranxId + randomChars,
                  };
                  courseMap.set(courseId, courseData);
                  updateCourseData.push(courseData);
                }
              }

              updateData.push({
                cycleId: c,
                studentId: getStudent?.id,
                accessCode: tranxId + randomChars,
              });
            }

            // console.log(
            //   updateData,
            //   "the data in auto sync before assignStudent",
            // );
            // console.log(
            //   updateCourseData,
            //   "the data in auto sync before assignStudent",
            // );

            //temporary off the auto access
            // const assignStudent = await prisma.cycleStudent.createMany({
            //   data: updateData,
            // });

            // const assignStudentCouse = await prisma.courseStudent.createMany({
            //   data: updateCourseData,
            // });

            // console.log(assignStudent, "assigning of auto sync");

            // try {
            //   await activity.logActivity(logTitle, logDesc, logType);
            //   console.log(
            //     `${response?.data?.tranx?.Name}, ${response?.data?.tranx?.Product?.productName} কোর্সটি কিনেছেন এবং অটোমেটিক এক্সেস পেয়েছেন`,
            //   );
            // } catch (error) {
            //   console.log(error, "Error logging activity in course redeem");
            // }

            //send notification
            try {
              const eventKey = tranxId;
              const payload = {
                // studentId: getStudent.id,
                title: `${response?.data?.tranx?.Name} আপনি ${response?.data?.tranx?.Product?.productName} কোর্সটি কিনেছেন`,
                body: `কোর্সটি সফলভাবে কেনা হয়েছে`,
                data: {
                  studentId: getStudent.id,
                  type: "single_user",
                  deepLink: "https://academic.aparsclassroom.com",
                  actions: "",
                },
                eventKey,
              };
              await PushMessagingServices.singleUserSendNotificationFromDb(
                payload,
              );
            } catch (error) {
              console.log(error, "error sending push notification");
            }

            return;
          } else {
            //call the cycle here also
            const getCycles = await prisma.cycle.findMany({
              where: {
                OR: [
                  {
                    productId: response?.data?.tranx?.Product?.productId,
                  },
                  {
                    affiliateProductIds: {
                      has: response?.data?.tranx?.Product?.productId,
                    },
                  },
                ],
              },
            });

            const cycleIds = getCycles.map((el) => el?.id);

            const getAlreadyCycle = await prisma.cycleStudent.findMany({
              where: {
                cycleId: {
                  in: cycleIds,
                },
                studentId: getStudent?.id,
              },
            });

            const getAlreadyIdsCycle = getAlreadyCycle?.map(
              (el) => el?.cycleId,
            );

            const filteredCycles = cycleIds.filter(
              (el) => !getAlreadyIdsCycle.includes(el),
            );

            const updateDataCycle = [];
            const updateCourseData = [];
            const courseMap = new Map();
            for (const c of filteredCycles) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const exists = await prisma.cycleStudent.findFirst({
                where: {
                  cycleId: c,
                  accessCode: {
                    contains: tranxId,
                  },
                },
              });

              if (exists) {
                return;
              }

              const getCourseId = await prisma.cycle.findFirst({
                where: {
                  id: c,
                },
              });

              const checkCourseAccess = await prisma.courseStudent.findUnique({
                where: {
                  courseId_studentId: {
                    courseId: getCourseId?.courseId,
                    studentId: getStudent?.id,
                  },
                },
              });

              if (!checkCourseAccess) {
                const courseId = getCourseId?.courseId;

                if (!courseMap.has(courseId)) {
                  const courseData = {
                    courseId: courseId,
                    studentId: getStudent?.id,
                    accessCode: tranxId + randomChars,
                  };
                  courseMap.set(courseId, courseData);
                  updateCourseData.push(courseData);
                }
              }

              updateDataCycle.push({
                cycleId: c,
                studentId: getStudent?.id,
                accessCode: tranxId + randomChars,
              });
            }

            // console.log(updateDataCycle, "the data before assignStudent");
            // console.log(updateCourseData, "the data before assignStudent");

            //temporary off the auto access
            // const assignStudentCycle = await prisma.cycleStudent.createMany({
            //   data: updateDataCycle,
            // });

            // const assignStudentCouse = await prisma.courseStudent.createMany({
            //   data: updateCourseData,
            // });

            // console.log(assignStudentCycle, "assigning");

            //here end the cycle call here

            const checkAccessCode = await prisma.courseStudent.findMany({
              where: {
                accessCode: {
                  contains: tranxId,
                },
              },
            });

            const getCourse = await prisma.course.findMany({
              where: {
                OR: [
                  {
                    productId: response?.data?.tranx?.Product?.productId,
                  },
                  {
                    affiliateProductIds: {
                      has: response?.data?.tranx?.Product?.productId,
                    },
                  },
                ],
              },
            });

            const courseIds = getCourse.map((el) => el?.id);

            const getAlready = await prisma.courseStudent.findMany({
              where: {
                courseId: {
                  in: courseIds,
                },
                studentId: getStudent?.id,
              },
            });

            const getAlreadyIds = getAlready?.map((el) => el?.courseId);

            const filteredCourses = courseIds.filter(
              (el) => !getAlreadyIds.includes(el),
            );

            const updateData = [];
            for (const c of filteredCourses) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
              const randomChars = Array.from({ length: 3 }, () =>
                characters.charAt(
                  Math.floor(Math.random() * characters.length),
                ),
              ).join("");

              const exists = await prisma.courseStudent.findFirst({
                where: {
                  courseId: c,
                  accessCode: {
                    contains: tranxId,
                  },
                },
              });

              if (exists) {
                return;
              }

              updateData.push({
                courseId: c,
                studentId: getStudent?.id,
                accessCode: tranxId + randomChars,
              });
            }

            // console.log(updateData, "the data before assignStudent");

            //temporary off the auto access
            // const assignStudent = await prisma.courseStudent.createMany({
            //   data: updateData,
            // });

            // console.log(assignStudent, "assigning");

            // try {
            //   await activity.logActivity(logTitle, logDesc, logType);
            //   console.log(
            //     `${response?.data?.tranx?.Name}, ${response?.data?.tranx?.Product?.productName} কোর্সটি কিনেছেন এবং অটোমেটিক এক্সেস পেয়েছেন`,
            //   );
            // } catch (error) {
            //   console.log(error, "Error logging activity in course redeem");
            // }

            //send notification
            try {
              const eventKey = tranxId;
              const payload = {
                // studentId: getStudent.id,
                title: `${response?.data?.tranx?.Name} আপনি ${response?.data?.tranx?.Product?.productName} কোর্সটি কিনেছেন`,
                body: `কোর্সটি সফলভাবে কেনা হয়েছে`,
                data: {
                  studentId: getStudent.id,
                  type: "single_user",
                  deepLink: "https://admission.aparsclassroom.com",
                  actions: "",
                },
                eventKey,
              };
              await PushMessagingServices.singleUserSendNotificationFromDb(
                payload,
              );
            } catch (error) {
              console.log(error, "error sending push notification");
            }

            return true;
            // }
          }
        } else {
          return;
        }
      }
    } catch (error) {
      console.log(error, "error on auto-syncronyzation after course purchase");
    }
  },
);
