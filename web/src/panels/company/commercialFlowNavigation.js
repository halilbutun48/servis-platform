export function resolveCommercialFlowRolePath(currentPath, suffix) {
  const path = String(currentPath || "");
  const roleRoot = path.startsWith("/school/")
    ? "/school"
    : path.startsWith("/organization/")
      ? "/organization"
      : "/company";
  const normalizedSuffix = String(suffix || "").startsWith("/") ? String(suffix) : `/${suffix}`;
  return `${roleRoot}${normalizedSuffix}`;
}
