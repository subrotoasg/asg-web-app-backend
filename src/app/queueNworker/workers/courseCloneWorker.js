import { Enums } from "../../constant/enums.js";
import { createWorker } from "./worker.js";

const courseCloneWorker = createWorker(
  "course-clone-processing",
  async (job) => {
    const payload = job?.data;
    try {
      const {
        productName,
        productFullName,
        courseOrCycleId,
        type,
        superAdminId,
      } = payload;

      if (type === Enums.cloneType.course) {
        const findCourse = await tx.course.findFirst({
          where: {
            id: courseOrCycleId,
            isDeleted: false,
          },
        });

        if (!findCourse) {
          throw new AppErrors(
            StatusCodes.BAD_REQUEST,
            "course not found to clone",
          );
        }
      }
    } catch (error) {}
  },
);
