const bdPhoneRegex = /^(\+?88)?01[3-9]\d{8}$/;
export function isValidBdPhone(phone) {
  if (!phone) return false;

  return bdPhoneRegex.test(phone.trim());
}
