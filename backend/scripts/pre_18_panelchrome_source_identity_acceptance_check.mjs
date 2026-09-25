#!/usr/bin/env node

/*
 * Bounded PRE-#18 acceptance for PanelChrome's current presentation-only
 * surface. This renders the actual JSX through Vite SSR; it does not create
 * an alternate authorization or source-identity owner.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import React from "../../web/node_modules/react/index.js";
import { renderToStaticMarkup } from "../../web/node_modules/react-dom/server.node.js";
import { createServer } from "../../web/node_modules/vite/dist/node/index.js";
import { CURRENT_HEAD_APPROVED_PRESENTATION_IDENTITY } from "./lib/currentHeadScopePolicy.js";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const webRoot = path.join(repoRoot, "web");
const panelChromePath = "web/src/components/PanelChrome.jsx";
const panelChromeSourcePath = path.join(repoRoot, panelChromePath);
const redMode = process.argv.includes("--red");

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

function mustInclude(markup, fragment, message) {
  assert.ok(markup.includes(fragment), `${message}: missing ${fragment}`);
}

function mustExclude(markup, fragment, message) {
  assert.ok(!markup.includes(fragment), `${message}: unexpectedly found ${fragment}`);
}

const vite = await createServer({
  root: webRoot,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

const { default: PanelChrome } = await vite.ssrLoadModule("/src/components/PanelChrome.jsx");

function renderPanel(props) {
  return renderToStaticMarkup(React.createElement(PanelChrome, props));
}

const cases = [];
function test(name, run, { expectedRed = false } = {}) {
  cases.push({ name, run, expectedRed });
}

test("RED current PanelChrome identity has one bounded presentation acceptance owner", () => {
  const matches = CURRENT_HEAD_APPROVED_PRESENTATION_IDENTITY.filter((entry) => entry?.path === panelChromePath);
  assert.equal(matches.length, 1, "PanelChrome must have one current-head presentation acceptance record");
  assert.equal(matches[0].sha256, sha256(panelChromeSourcePath), "PanelChrome policy identity must match the reviewed source");
  assert.equal(matches[0].owner, "PRE_18_PANELCHROME_SEMANTIC_PRESENTATION_ACCEPTANCE");
}, { expectedRed: true });

test("PanelChrome renders a valid clamped heading hierarchy from the supplied level", () => {
  const nested = renderPanel({ title: "Alt panel", headingLevel: 2 });
  const tooLow = renderPanel({ title: "Varsayılan", headingLevel: 0 });
  const tooHigh = renderPanel({ title: "Sınır", headingLevel: 99 });
  mustInclude(nested, '<h2 class="panelTitle">Alt panel</h2>', "nested panel keeps h2 semantics");
  mustInclude(tooLow, '<h1 class="panelTitle">Varsayılan</h1>', "low heading level clamps to h1");
  mustInclude(tooHigh, '<h6 class="panelTitle">Sınır</h6>', "high heading level clamps to h6");
});

test("PanelChrome keeps supplied actions associated with the same panel head", () => {
  const markup = renderPanel({
    title: "İşlem paneli",
    primaryAction: React.createElement("button", { type: "button" }, "Birincil"),
    secondaryActions: React.createElement("button", { type: "button" }, "İkincil"),
    actions: React.createElement("button", { type: "button" }, "Eski action"),
  });
  mustInclude(markup, 'class="saActions panelChromeActions"', "one panel-head action container remains");
  mustInclude(markup, 'data-panel-primary-action="true"', "primary action remains explicitly marked");
  mustInclude(markup, ">Birincil</button>", "caller-provided primary action remains present");
  mustInclude(markup, ">İkincil</button>", "caller-provided secondary action remains present");
  mustInclude(markup, ">Eski action</button>", "legacy actions prop remains present");
});

test("PanelChrome does not expose unowned role tenant or sensitive props", () => {
  const secret = "tenant-secret-should-not-render";
  const markup = renderPanel({
    title: "Nötr panel",
    role: "SUPER_ADMIN",
    companyId: 7001,
    roomId: 8001,
    sensitiveData: secret,
  });
  mustExclude(markup, secret, "unowned sensitive props are not rendered");
  mustExclude(markup, "SUPER_ADMIN", "role props are not rendered");
  mustInclude(markup, '<h1 class="panelTitle">Nötr panel</h1>', "presentation remains intact without identity props");
});

test("PanelChrome creates no navigation or write control when callers provide none", () => {
  const markup = renderPanel({ title: "Salt sunum", eyebrow: "Özet", subtitle: "Yalnızca açıklama" });
  mustInclude(markup, "Özet", "eyebrow remains presentation-only content");
  mustInclude(markup, "Yalnızca açıklama", "subtitle remains presentation-only content");
  mustExclude(markup, "<button", "component creates no button without caller action");
  mustExclude(markup, "href=", "component creates no navigation destination");
  mustExclude(markup, "disabled=", "component creates no enablement policy");
});

let passCount = 0;
const failures = [];
try {
  for (const item of cases) {
    try {
      item.run();
      passCount += 1;
      console.log(`PASS ${item.name}`);
    } catch (error) {
      failures.push({ name: item.name, expectedRed: item.expectedRed, message: error?.message || String(error) });
      console.log(`FAIL ${item.name}: ${error?.message || String(error)}`);
    }
  }
} finally {
  await vite.close();
}

const expectedRedFailures = failures.filter((failure) => failure.expectedRed);
const unexpectedFailures = failures.filter((failure) => !failure.expectedRed);
if (redMode) {
  console.log("RED_TEST_COUNT=1");
  console.log(`RED_OBSERVED_COUNT=${expectedRedFailures.length}`);
  console.log(`UNEXPECTED_RED_COUNT=${unexpectedFailures.length}`);
  if (expectedRedFailures.length !== 1 || unexpectedFailures.length !== 0) process.exitCode = 1;
} else {
  console.log(`GREEN_TEST_COUNT=${cases.length}`);
  console.log(`GREEN_TEST_PASS=${passCount}`);
  console.log(`GREEN_TEST_FAIL=${failures.length}`);
  if (failures.length) process.exitCode = 1;
}
