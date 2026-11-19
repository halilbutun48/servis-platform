function buildQueryString(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function buildDashboardBulkQuery(bundle, query = {}, force = false) {
  return buildQueryString({ bundle, force: force ? 1 : null, ...query });
}

export function dashboardBulkCachePrefix(bundle) {
  return `/api/dashboard/bulk?bundle=${encodeURIComponent(String(bundle || ""))}`;
}
