const roles = {
  SUPERADMIN: "superAdmin",
  ADMIN: "admin",
  STUDENT: "student",
  SOLVER: "solver",
};

const queryFields = {
  SEARCH_TERM: "searchTerm",
  FILTER: "filter",
  PAGE: "page",
  LIMIT: "limit",
  SORT_BY: "sortBy",
  SORT_ORDER: "sortOrder",
  TIME: "time",
  QUORA: "quoraType",
};
const ROLES = ["superAdmin", "admin", "student", "solver"];

const quoraStatus = {
  PENDING: "PENDING",
  DUPLICATE: "DUPLICATE",
  UNSOLVED: "UNSOLVED",
  SOLVED: "SOLVED",
  REJECTED: "REJECTED",
};

const quoraFilter = {
  ALL: "all",
  PERSONAL: "personal",
};

const status = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
};

const solverRank = {
  UNRANKED: "unranked",
  TUTOR: "tutor",
  EDUCATOR: "educator",
  SCHOLAR: "scholar",
  MENTOR: "mentor",
  SAGE: "sage",
};

const rankCredit = {
  TUTOR: 1,
  EDUCATOR: 30,
  SCHOLAR: 300,
  MENTOR: 1000,
  SAGE: 5000,
};

const cloneType = {
  course: "course",
  cycle: "cycle",
};

const logType = {
  student: "student",
  admin: "admin",
  course: "course",
};

const tokenType = {
  access: "access",
  reset: "reset",
  refresh: "refresh",
  download: "download",
};

const issueStatus = {
  PENDING: "PENDING",
  ONGOING: "ONGOING",
  REJECTED: "REJECTED",
  SOLVED: "SOLVED",
};

export const Enums = {
  roles,
  queryFields,
  ROLES,
  status,
  quoraStatus,
  quoraFilter,
  solverRank,
  rankCredit,
  cloneType,
  logType,
  tokenType,
  issueStatus,
};
