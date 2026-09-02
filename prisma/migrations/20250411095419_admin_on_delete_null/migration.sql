-- DropForeignKey
ALTER TABLE "courseAdmins" DROP CONSTRAINT "courseAdmins_adminId_fkey";

-- DropForeignKey
ALTER TABLE "cycles" DROP CONSTRAINT "cycles_adminId_fkey";

-- CreateTable
CREATE TABLE "featured" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "image" TEXT,
    "coupne" TEXT,

    CONSTRAINT "featured_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "url" TEXT,

    CONSTRAINT "routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "url" TEXT,

    CONSTRAINT "notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liveClass" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "teacher" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "url" TEXT,

    CONSTRAINT "liveClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "featured_id_key" ON "featured"("id");

-- CreateIndex
CREATE UNIQUE INDEX "routine_id_key" ON "routine"("id");

-- CreateIndex
CREATE UNIQUE INDEX "notice_id_key" ON "notice"("id");

-- CreateIndex
CREATE UNIQUE INDEX "liveClass_id_key" ON "liveClass"("id");

-- AddForeignKey
ALTER TABLE "courseAdmins" ADD CONSTRAINT "courseAdmins_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured" ADD CONSTRAINT "featured_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine" ADD CONSTRAINT "routine_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice" ADD CONSTRAINT "notice_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
