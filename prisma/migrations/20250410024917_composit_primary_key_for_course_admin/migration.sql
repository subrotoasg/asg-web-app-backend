/*
  Warnings:

  - The primary key for the `courseAdmins` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `courseAdmins` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "courseAdmins_id_key";

-- AlterTable
ALTER TABLE "courseAdmins" DROP CONSTRAINT "courseAdmins_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "courseAdmins_pkey" PRIMARY KEY ("courseId", "adminId");
