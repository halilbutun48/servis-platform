export function isCommercialLifecycleRestricted(companyKind) {
  return String(companyKind || "").toUpperCase() === "SCHOOL";
}
