export function normalizeUser(user) {
  if (!user || typeof user !== "object") return null;

  return {
    id: user?.id,
    role: user?.role,
    name: user?.name?.slice(0, 120) || null,
    email: user?.email?.slice(0, 180) || null,
    phone: user?.phone?.slice(0, 40) || null,
    avatar: user?.avatar || null,
  };
}

export function makePresenceMember(user) {
  return `${user?.role}:${user?.id}`;
}

export function isStudent(user) {
  return user?.role === "student";
}
