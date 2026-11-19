import assert from "node:assert/strict";
import test from "node:test";

import { downloadReportWithToken } from "./reportsDownload.js";

test("authenticated report export sends the bearer token and downloads the CSV", async () => {
  const calls = [];
  const clicked = [];
  const removed = [];
  const revoked = [];
  const anchor = {};
  const result = await downloadReportWithToken({
    url: "/api/reports/shifts/export.csv?from=2026-11-05&to=2026-11-12",
    token: "test-token",
    filenameHint: "reports.csv",
    fetchImpl: async (...args) => {
      calls.push(args);
      return {
        ok: true,
        status: 200,
        headers: { get: (name) => name === "content-disposition" ? 'attachment; filename="reports.csv"' : "" },
        blob: async () => ({ type: "text/csv" }),
      };
    },
    documentImpl: {
      createElement: (tag) => {
        assert.equal(tag, "a");
        return anchor;
      },
      body: {
        appendChild: (node) => assert.equal(node, anchor),
      },
    },
    urlImpl: {
      createObjectURL: (blob) => {
        assert.deepEqual(blob, { type: "text/csv" });
        return "blob:reports";
      },
      revokeObjectURL: (url) => revoked.push(url),
    },
    append: (node) => assert.equal(node, anchor),
    remove: (node) => removed.push(node),
    click: (node) => clicked.push(node),
  });

  assert.deepEqual(calls, [[
    "/api/reports/shifts/export.csv?from=2026-11-05&to=2026-11-12",
    { headers: { Authorization: "Bearer test-token" }, cache: "no-store" },
  ]]);
  assert.equal(anchor.download, "reports.csv");
  assert.equal(anchor.rel, "noopener");
  assert.deepEqual(clicked, [anchor]);
  assert.deepEqual(removed, [anchor]);
  assert.deepEqual(revoked, ["blob:reports"]);
  assert.deepEqual(result, { filename: "reports.csv", status: 200 });
});
