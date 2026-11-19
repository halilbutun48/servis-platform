const AGREEMENT_SURFACE_ROUTES = new Set([
  "/company/agreements",
  "/school/agreements",
  "/organization/agreements",
]);

export function resolveAgreementCopilotRoute(path, fallback = "/company/agreements") {
  const normalized = String(path || "").split("?", 1)[0].trim();
  return AGREEMENT_SURFACE_ROUTES.has(normalized) ? normalized : fallback;
}
