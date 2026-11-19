export const SERVICE_EVALUATION_BUYER_ROLES = [
  "COMPANY",
  "SCHOOL",
  "ORGANIZATION",
  "SUPER_ADMIN",
];

export function canManageServiceEvaluation(role) {
  const normalized = String(role || "").trim().toUpperCase();
  return SERVICE_EVALUATION_BUYER_ROLES.includes(normalized);
}
