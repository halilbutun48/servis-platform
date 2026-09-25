#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const testRoot = path.join(os.tmpdir(), "pre-18-topo-02-lifecycle-test");
const lifecyclePath = path.join(here, "lib", "pre_18_shared_browser_lifecycle.mjs");
const productFlowPath = path.join(here, "product_flow_button_audit_01.mjs");
const mobileAuditPath = path.join(here, "ux_mobile_all_roles_panel_audit_01.mjs");

let lifecycle = {};
try {
  lifecycle = await import(pathToFileURL(lifecyclePath).href);
} catch (error) {
  lifecycle.__loadError = error;
}

const tests = [];
const test = (name, run) => tests.push({ name, run });
const requireExport = (name) => {
  assert.equal(typeof lifecycle[name], "function", `${name} must be exported from the shared lifecycle helper`);
  return lifecycle[name];
};

function fakeContext({ closeError = null, log = [] } = {}) {
  return {
    async addInitScript(script, value) {
      log.push({ kind: "init", script: String(script), value });
    },
    async newPage() {
      log.push({ kind: "page" });
      return {
        async goto() { throw new Error("HELPER_MUST_NOT_GOTO"); },
        locator() { throw new Error("HELPER_MUST_NOT_CREATE_LOCATOR"); },
        async screenshot(options) { log.push({ kind: "screenshot", options }); },
      };
    },
    async close() {
      log.push({ kind: "context-close" });
      if (closeError) throw closeError;
    },
  };
}

function fakeBrowser({ closeError = null, context = null, log = [] } = {}) {
  return {
    async newContext(options) {
      log.push({ kind: "context", options });
      return context || fakeContext({ log });
    },
    async close() {
      log.push({ kind: "browser-close" });
      if (closeError) throw closeError;
    },
  };
}

function source(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function assertSourceMatches(body, expression, message) {
  assert.equal(expression.test(body), true, message);
}

async function withMockLaunch(launchBrowser, callback) {
  const originalLaunch = chromium.launch;
  chromium.launch = launchBrowser;
  try {
    return await callback();
  } finally {
    chromium.launch = originalLaunch;
  }
}

test("RED-01 browser closes after callback success", async () => {
  const withLaunchedBrowser = requireExport("withLaunchedBrowser");
  const log = [];
  const browser = fakeBrowser({ log });
  const result = await withMockLaunch(async () => browser, () => withLaunchedBrowser({ headless: true }, async (received) => {
    assert.equal(received, browser);
    return "ok";
  }));
  assert.equal(result, "ok");
  assert.deepEqual(log.map((item) => item.kind), ["browser-close"]);
});

test("RED-02 browser closes after callback failure", async () => {
  const withLaunchedBrowser = requireExport("withLaunchedBrowser");
  const log = [];
  await assert.rejects(
    withMockLaunch(async () => fakeBrowser({ log }), () => withLaunchedBrowser({}, async () => { throw new Error("CALLBACK_FAILURE"); })),
    /CALLBACK_FAILURE/
  );
  assert.deepEqual(log.map((item) => item.kind), ["browser-close"]);
});

test("RED-03 callback error is not masked by browser-close error", async () => {
  const withLaunchedBrowser = requireExport("withLaunchedBrowser");
  await assert.rejects(
    withMockLaunch(
      async () => fakeBrowser({ closeError: new Error("BROWSER_CLOSE_FAILURE") }),
      () => withLaunchedBrowser({}, async () => { throw new Error("CALLBACK_FAILURE"); }),
    ),
    /CALLBACK_FAILURE/
  );
});

test("RED-04 browser-close error is observable after callback success", async () => {
  const withLaunchedBrowser = requireExport("withLaunchedBrowser");
  await assert.rejects(
    withMockLaunch(
      async () => fakeBrowser({ closeError: new Error("BROWSER_CLOSE_FAILURE") }),
      () => withLaunchedBrowser({}, async () => "ok"),
    ),
    /BROWSER_CLOSE_FAILURE/
  );
});

test("RED-05 launch options are forwarded unchanged", async () => {
  const withLaunchedBrowser = requireExport("withLaunchedBrowser");
  const options = { headless: false, slowMo: 17 };
  let seen = null;
  await withMockLaunch(
    async (received) => {
      seen = received;
      return fakeBrowser();
    },
    () => withLaunchedBrowser(options, async () => null),
  );
  assert.equal(seen, options);
});

test("RED-06 context options are forwarded unchanged", async () => {
  const withSeededBrowserContext = requireExport("withSeededBrowserContext");
  const log = [];
  const options = { viewport: { width: 390, height: 844 }, locale: "tr-TR", isMobile: true };
  await withSeededBrowserContext(fakeBrowser({ log }), options, {}, async () => null);
  assert.equal(log.find((item) => item.kind === "context").options, options);
});

test("RED-07 initial storage is seeded before the scenario page", async () => {
  const withSeededBrowserContext = requireExport("withSeededBrowserContext");
  const log = [];
  await withSeededBrowserContext(fakeBrowser({ log }), {}, { token: "token-1", personel_servis_browser_device_id: "device-1" }, async ({ context }) => {
    await context.newPage();
  });
  assert.deepEqual(log.slice(0, 3).map((item) => item.kind), ["context", "init", "page"]);
  assert.deepEqual(log[1].value, { token: "token-1", personel_servis_browser_device_id: "device-1" });
});

test("RED-08 context closes after callback success", async () => {
  const withSeededBrowserContext = requireExport("withSeededBrowserContext");
  const log = [];
  const result = await withSeededBrowserContext(fakeBrowser({ log }), {}, {}, async () => "ok");
  assert.equal(result, "ok");
  assert.equal(log.at(-1).kind, "context-close");
});

test("RED-09 context closes after callback failure", async () => {
  const withSeededBrowserContext = requireExport("withSeededBrowserContext");
  const log = [];
  await assert.rejects(
    withSeededBrowserContext(fakeBrowser({ log }), {}, {}, async () => { throw new Error("CALLBACK_FAILURE"); }),
    /CALLBACK_FAILURE/
  );
  assert.equal(log.at(-1).kind, "context-close");
});

test("RED-10 callback error is not masked by context-close error", async () => {
  const withSeededBrowserContext = requireExport("withSeededBrowserContext");
  await assert.rejects(
    withSeededBrowserContext(fakeBrowser({ context: fakeContext({ closeError: new Error("CONTEXT_CLOSE_FAILURE") }) }), {}, {}, async () => {
      throw new Error("CALLBACK_FAILURE");
    }),
    /CALLBACK_FAILURE/
  );
});

test("RED-11 context-close error is observable after callback success", async () => {
  const withSeededBrowserContext = requireExport("withSeededBrowserContext");
  await assert.rejects(
    withSeededBrowserContext(fakeBrowser({ context: fakeContext({ closeError: new Error("CONTEXT_CLOSE_FAILURE") }) }), {}, {}, async () => "ok"),
    /CONTEXT_CLOSE_FAILURE/
  );
});

test("RED-12 helper does not call fetch", async () => {
  assert.ok(fs.existsSync(lifecyclePath), "shared lifecycle helper must exist");
  assert.doesNotMatch(source(lifecyclePath), /\bfetch\s*\(/u);
});

test("RED-13 helper does not contain api-me logic", async () => {
  assert.ok(fs.existsSync(lifecyclePath), "shared lifecycle helper must exist");
  assert.doesNotMatch(source(lifecyclePath), /\/api\/me/u);
});

test("RED-14 helper does not navigate", async () => {
  assert.ok(fs.existsSync(lifecyclePath), "shared lifecycle helper must exist");
  assert.doesNotMatch(source(lifecyclePath), /\.goto\s*\(/u);
});

test("RED-15 helper does not create locator or assertion behavior", async () => {
  assert.ok(fs.existsSync(lifecyclePath), "shared lifecycle helper must exist");
  assert.doesNotMatch(source(lifecyclePath), /\.(?:locator|getByRole|getByText|expect)\s*\(/u);
});

test("RED-16 helper does not interpret role or tenant", async () => {
  assert.ok(fs.existsSync(lifecyclePath), "shared lifecycle helper must exist");
  assert.doesNotMatch(source(lifecyclePath), /(?:roleMatches|tenantScope|expectedRole|AUTH_ROLE|AUTH_TENANT)/u);
});

test("RED-17 screenshot uses the exact caller path", async () => {
  const captureScreenshot = requireExport("captureScreenshot");
  const root = testRoot;
  const target = path.join(root, "nested", "caller-selected.png");
  let seen = null;
  const page = { screenshot: async (options) => { seen = options; } };
  await captureScreenshot(page, target, { fullPage: false, type: "png" });
  assert.equal(seen.path, target);
});

test("RED-18 screenshot options preserve full-page semantics", async () => {
  const captureScreenshot = requireExport("captureScreenshot");
  let seen = null;
  const page = { screenshot: async (options) => { seen = options; } };
  await captureScreenshot(page, path.join(testRoot, "full-page.png"), { fullPage: true, animations: "disabled" });
  assert.deepEqual(seen, {
    path: path.join(testRoot, "full-page.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("RED-19 Product Flow imports the shared lifecycle while preserving token and device bootstrap keys", async () => {
  const body = source(productFlowPath);
  assertSourceMatches(body, /pre_18_shared_browser_lifecycle/u, "Product Flow must import the shared lifecycle helper");
  assertSourceMatches(body, /token:\s*authState\.token/u, "Product Flow must pass its caller-owned token into storage bootstrap");
  assertSourceMatches(body, /initialStorage\.personel_servis_browser_device_id\s*=\s*String\(authState\.loginInfo\.deviceId\)/u, "Product Flow must preserve its caller-owned device bootstrap");
});

test("RED-20 Mobile All Roles imports the shared lifecycle while preserving token-only bootstrap", async () => {
  const body = source(mobileAuditPath);
  assertSourceMatches(body, /pre_18_shared_browser_lifecycle/u, "Mobile All Roles must import the shared lifecycle helper");
  assertSourceMatches(body, /token:\s*authState\.token/u, "Mobile All Roles must pass its caller-owned token into storage bootstrap");
  assert.doesNotMatch(body, /personel_servis_browser_device_id/u);
});

test("RED-21 Product Flow keeps its report terminal and assertion ownership", async () => {
  const body = source(productFlowPath);
  assertSourceMatches(body, /pre_18_shared_browser_lifecycle/u, "Product Flow must import the shared lifecycle helper");
  assertSourceMatches(body, /renderMarkdown\(report\)/u, "Product Flow must keep report rendering in its caller");
  assertSourceMatches(body, /product flow/i, "Product Flow scenario ownership must remain in its caller");
});

test("RED-22 Mobile All Roles keeps its report terminal and assertion ownership", async () => {
  const body = source(mobileAuditPath);
  assertSourceMatches(body, /pre_18_shared_browser_lifecycle/u, "Mobile All Roles must import the shared lifecycle helper");
  assertSourceMatches(body, /renderMarkdown\(report\)/u, "Mobile All Roles must keep report rendering in its caller");
  assertSourceMatches(body, /SCREEN_CATALOG_USERS/u, "Mobile All Roles assertions must remain in its caller");
});

test("RED-23 wrong token remains a caller-visible negative", async () => {
  const withSeededBrowserContext = requireExport("withSeededBrowserContext");
  const result = await withSeededBrowserContext(fakeBrowser(), {}, { token: "wrong-token" }, async ({ initialStorage }) => {
    return initialStorage.token === "wrong-token" ? false : true;
  });
  assert.equal(result, false);
});

test("RED-24 missing device remains a caller-visible negative", async () => {
  const withSeededBrowserContext = requireExport("withSeededBrowserContext");
  const result = await withSeededBrowserContext(fakeBrowser(), {}, { token: "valid-token" }, async ({ initialStorage }) => {
    return Object.hasOwn(initialStorage, "personel_servis_browser_device_id");
  });
  assert.equal(result, false);
});

test("RED-25 closed context remains a caller-visible negative", async () => {
  const withSeededBrowserContext = requireExport("withSeededBrowserContext");
  const closed = fakeContext();
  await closed.close();
  const browser = {
    async newContext() { throw new Error("CONTEXT_ALREADY_CLOSED"); },
  };
  await assert.rejects(withSeededBrowserContext(browser, {}, {}, async () => "unexpected"), /CONTEXT_ALREADY_CLOSED/);
});

const failures = [];
for (const entry of tests) {
  try {
    await entry.run();
    console.log(`PASS ${entry.name}`);
  } catch (error) {
    failures.push({ name: entry.name, message: error?.message || String(error) });
    console.log(`FAIL ${entry.name}: ${error?.message || String(error)}`);
  }
}

console.log(`TOPO_02_LIFECYCLE_TEST_COUNT=${tests.length}`);
console.log(`TOPO_02_LIFECYCLE_TEST_PASS=${tests.length - failures.length}`);
console.log(`TOPO_02_LIFECYCLE_TEST_FAIL=${failures.length}`);
if (failures.length) process.exitCode = 1;
