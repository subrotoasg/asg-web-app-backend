export const AuthorizationCacheKeys = {
  courseContext(entityId) {
    return `cache:authz:v1:course-context:${entityId}`;
  },
  cycleContext(entityId) {
    return `cache:authz:v1:cycle-context:${entityId}`;
  },
  archivedCourseIds(courseId) {
    return `cache:authz:v1:archived-course-ids:${courseId}`;
  },
  archivedCycleIds(cycleId) {
    return `cache:authz:v1:archived-cycle-ids:${cycleId}`;
  },
  courseStudent(studentId, courseId) {
    return ["cache", "authz", "v1", "course-student", studentId, courseId].join(
      ":",
    );
  },
  courseAdmin(adminId, courseId) {
    return ["cache", "authz", "v1", "course-admin", adminId, courseId].join(
      ":",
    );
  },
  cycleStudent(studentId, cycleId) {
    return ["cache", "authz", "v1", "cycle-student", studentId, cycleId].join(
      ":",
    );
  },
};
