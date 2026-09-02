-- AddForeignKey
ALTER TABLE "courseStudents" ADD CONSTRAINT "courseStudents_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courseStudents" ADD CONSTRAINT "courseStudents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
