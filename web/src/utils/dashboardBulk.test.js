import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardBulkQuery, dashboardBulkCachePrefix } from "./dashboardBulkQuery.js";

test("dashboard bulk force yenilemesi sunucu önbelleğini de bypass eder", () => {
  assert.equal(
    buildDashboardBulkQuery("company-operations", { from: "2026-11-11", to: "2026-11-11" }, true),
    "?bundle=company-operations&force=1&from=2026-11-11&to=2026-11-11",
  );
  assert.equal(
    buildDashboardBulkQuery("company-operations", { from: "2026-11-11", to: "2026-11-11" }, false),
    "?bundle=company-operations&from=2026-11-11&to=2026-11-11",
  );
  assert.equal(
    dashboardBulkCachePrefix("company-operations"),
    "/api/dashboard/bulk?bundle=company-operations",
  );
});
