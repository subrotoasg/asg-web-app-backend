import { prisma } from "../../constants/index.js";
import { getCachedUserByRole } from "../app/modules/authentication/cache/auth-user.cache.js";

// export const getUserByRole = async (input) => {
//   const { userRole } = input;

//   try {
//     if (userRole === "admin") {
//       const { adminId, adminPhone, adminEmail } = input;
//       return await prisma.admin.findFirst({
//         where: {
//           OR: [
//             adminId ? { id: adminId } : undefined,
//             adminPhone ? { phone: adminPhone } : undefined,
//             adminEmail ? { email: adminEmail } : undefined,
//           ].filter(Boolean),
//         },
//       });
//     }

//     if (userRole === "superAdmin") {
//       const { superAdminId, superAdminPhone, superAdminEmail } = input;
//       return await prisma.superAdmin.findFirst({
//         where: {
//           OR: [
//             superAdminId ? { id: superAdminId } : undefined,
//             superAdminPhone ? { phone: superAdminPhone } : undefined,
//             superAdminEmail ? { email: superAdminEmail } : undefined,
//           ].filter(Boolean),
//         },
//       });
//     }

//     if (userRole === "student") {
//       const { studentId, studentPhone, studentEmail } = input;
//       return await prisma.student.findFirst({
//         where: {
//           OR: [
//             studentId ? { id: studentId } : undefined,
//             studentPhone ? { phone: studentPhone } : undefined,
//             studentEmail ? { email: studentEmail } : undefined,
//           ].filter(Boolean),
//         },
//         include: {
//           studentRestrictions: {
//             where: {
//               bannedUntil: {
//                 gt: new Date(),
//               },
//             },
//           },
//         },
//       });
//     }

//     return null;
//   } catch (error) {
//     console.error("❌ Error fetching user:", error);
//     throw error;
//   }
// };

export const getUserByRole = async (input) => {
  return getCachedUserByRole(input);
};
