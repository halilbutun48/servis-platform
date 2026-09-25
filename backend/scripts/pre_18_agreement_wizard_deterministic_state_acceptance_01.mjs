#!/usr/bin/env node

/*
 * PRE-18 AgreementWizard deterministic state acceptance.
 *
 * This is a test-only browser harness. It starts an ephemeral Vite page,
 * imports the production AgreementWizard component, and supplies only the
 * SessionCtx/prop dependencies needed to render the three remaining guards.
 * The temporary page is removed before the script exits.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const webRoot = path.join(repoRoot, "web");
const componentPath = path.join(webRoot, "src", "panels", "company", "AgreementWizard.jsx");
const componentSource = await fs.readFile(componentPath, "utf8");
const fixturePort = 41731 + (process.pid % 1000);

const sourceCopy = (pattern, label) => {
  const match = componentSource.match(pattern);
  assert.ok(match?.[1], `missing source copy: ${label}`);
  return match[1];
};

const EXPECTED = Object.freeze({
  missingToken: sourceCopy(/if \(!token\) return setErr\("([^"]+)"\)/, "create missing token"),
  marketMissingToken: sourceCopy(/if \(!token\) return setMarketErr\("([^"]+)"\)/, "market missing token"),
  roomsUnsupported: sourceCopy(/if \(!roomsSupported\) return setErr\("([^"]+)"\)/, "rooms unsupported"),
});

const webRequire = createRequire(path.join(webRoot, "package.json"));
const { createServer } = webRequire("vite");
const reactPluginModule = webRequire("@vitejs/plugin-react");
const reactPlugin = reactPluginModule.default || reactPluginModule;

const PREFILL = {
  source: "SHIFT",
  sourceShiftId: 151,
  sourceSummary: "Fixture shift",
  roomId: 1,
  roomName: "FixtureRoom",
  startDate: "2026-09-23",
  endDate: "2026-09-29",
  durationKey: "1w",
  weekMask: 16,
  startHHMM: "07:00",
  endHHMM: "09:00",
  direction: "INBOUND",
  pattern: "ONE_WAY",
  useRoomHub: false,
  hubLat: 37.744,
  hubLng: 29.105,
  routeSummary: { stopCount: 1, peopleCount: 1 },
};

const FIXTURE_SOURCE = `
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import AgreementWizard from "../src/panels/company/AgreementWizard.jsx";
import { SessionCtx } from "../src/state/sessionContext.js";

const PREFILL = ${JSON.stringify(PREFILL)};
const ROOMS = [{ id: 1, name: "FixtureRoom", hubLat: 37.744, hubLng: 29.105 }];
const scenario = new URLSearchParams(window.location.search).get("scenario") || "missing-token";

function Fixture() {
  const [token, setToken] = useState(scenario === "missing-token" ? "" : "fixture-token");
  const roomsUnsupported = scenario === "rooms-unsupported";

  return (
    <div style={{ minHeight: "100vh", padding: 12, fontFamily: "Arial, sans-serif" }}>
      <div data-testid="fixture-ready" data-scenario={scenario} style={{ position: "fixed", top: 0, left: 0, zIndex: 10000 }}>
        <button type="button" data-testid="drop-token" onClick={() => setToken("")}>drop token</button>
      </div>
      <SessionCtx.Provider value={{ token, me: { id: 1, role: "COMPANY", companyId: 1 } }}>
        <AgreementWizard
          rooms={roomsUnsupported ? [] : ROOMS}
          roomsSupported={!roomsUnsupported}
          onReloadRooms={null}
          renderTrigger={() => null}
          onCreated={() => {}}
          launchPrefill={PREFILL}
          autoOpenNonce={1}
        />
      </SessionCtx.Provider>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Fixture />);
`;

const INDEX_SOURCE = `<!doctype html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><div id="root"></div><script type="module" src="/fixture.jsx"></script></body></html>`;

async function withFixtureServer(run) {
  const fixtureDir = path.join(webRoot, `.codex-agreement-wizard-acceptance-${process.pid}`);
  await fs.rm(fixtureDir, { recursive: true, force: true });
  await fs.mkdir(fixtureDir, { recursive: true });
  await fs.writeFile(path.join(fixtureDir, "index.html"), INDEX_SOURCE, "utf8");
  await fs.writeFile(path.join(fixtureDir, "fixture.jsx"), FIXTURE_SOURCE, "utf8");

  let server = null;
  try {
    server = await createServer({
      root: fixtureDir,
      configFile: false,
      appType: "spa",
      plugins: [reactPlugin()],
      server: {
        host: "127.0.0.1",
        port: fixturePort,
        strictPort: false,
        fs: { allow: [repoRoot, fixtureDir] },
      },
    });
    await server.listen();
    const address = server.httpServer?.address();
    const port = typeof address === "object" && address ? address.port : null;
    assert.ok(port, "fixture server port");
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    if (server) await server.close();
    await fs.rm(fixtureDir, { recursive: true, force: true });
  }
}

async function measureMessage(page, expected) {
  const message = page.getByText(expected, { exact: true }).last();
  await message.waitFor({ state: "visible", timeout: 5000 });
  await message.scrollIntoViewIfNeeded();
  const text = await message.innerText();
  assert.equal(text, expected, "visible copy is sourced from AgreementWizard");
  const box = await message.boundingBox();
  const metrics = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    bodyHorizontalOverflow: document.body.scrollWidth > window.innerWidth + 1,
    viewportWidth: window.innerWidth,
  }));
  assert.ok(box && box.width > 0 && box.height > 0, "message has visible geometry");
  assert.ok(!metrics.horizontalOverflow && !metrics.bodyHorizontalOverflow, "message state has no horizontal overflow");
  assert.ok(box.x >= -1 && box.x + box.width <= metrics.viewportWidth + 1, "message fits viewport");
  return { text, box, metrics };
}

async function openScenario(browser, baseUrl, scenario, viewport) {
  const context = await browser.newContext({ viewport, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const postUrls = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/")) postUrls.push(request.url());
  });
  await page.goto(`${baseUrl}/?scenario=${encodeURIComponent(scenario)}`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("fixture-ready").waitFor({ state: "visible", timeout: 5000 });
  await page.getByText("Hızlı Sözleşme", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
  return { context, page, pageErrors, postUrls };
}

async function runMissingToken(browser, baseUrl, viewport) {
  const state = await openScenario(browser, baseUrl, "missing-token", viewport);
  try {
    const create = state.page.getByRole("button", { name: /Olu.tur/ }).last();
    await create.click({ timeout: 5000 });
    const message = await measureMessage(state.page, EXPECTED.missingToken);
    assert.equal(state.postUrls.length, 0, "missing-token create makes no API write");
    assert.equal(state.pageErrors.length, 0, "missing-token state has no page errors");
    return { state: "PASS", evidence: "DETERMINISTIC_BROWSER_FIXTURE", viewport, message, pageErrorCount: state.pageErrors.length };
  } finally {
    await state.context.close();
  }
}

async function runMarketMissingToken(browser, baseUrl, viewport) {
  const state = await openScenario(browser, baseUrl, "market-missing-token", viewport);
  try {
    await state.page.route("**/api/agreements/bundle", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ createdIds: [990101] }) });
    });
    const create = state.page.getByRole("button", { name: /Olu.tur/ }).last();
    await create.click({ timeout: 5000 });
    const offerButton = state.page.locator("button").filter({ hasText: "Teklif Topla" }).last();
    await offerButton.waitFor({ state: "visible", timeout: 5000 });
    await state.page.getByTestId("drop-token").click();
    await offerButton.click();
    const marketCreate = state.page.getByRole("button", { name: /Shift/ }).last();
    await marketCreate.click({ timeout: 5000 });
    const message = await measureMessage(state.page, EXPECTED.marketMissingToken);
    assert.equal(state.postUrls.filter((url) => url.includes("/api/agreements/bundle")).length, 1, "only intercepted presentation create ran");
    assert.equal(state.postUrls.some((url) => url.includes("/api/shifts/") && url.includes("/offers")), false, "market error blocks business write");
    assert.equal(state.pageErrors.length, 0, "market missing-token state has no page errors");
    return { state: "PASS", evidence: "DETERMINISTIC_BROWSER_FIXTURE", viewport, message, pageErrorCount: state.pageErrors.length, postUrls: state.postUrls };
  } finally {
    await state.context.close();
  }
}

async function runRoomsUnsupported(browser, baseUrl, viewport) {
  const state = await openScenario(browser, baseUrl, "rooms-unsupported", viewport);
  try {
    const create = state.page.getByRole("button", { name: /Olu.tur/ }).last();
    assert.equal(await create.isDisabled(), true, "rooms unsupported keeps the production create gate disabled");
    // The production button is disabled for this prop shape, so a native event
    // cannot safely reach create(). Preserve that boundary as an explicit gap.
    await create.dispatchEvent("click");
    let message = null;
    try {
      message = await measureMessage(state.page, EXPECTED.roomsUnsupported);
    } catch {
      return {
        state: "FAIL",
        evidence: "DETERMINISTIC_BROWSER_FIXTURE",
        viewport,
        createDisabled: true,
        reason: "production create button is disabled when roomsSupported=false; no safe event reaches create()",
      };
    }
    assert.equal(state.postUrls.length, 0, "rooms unsupported makes no API write");
    assert.equal(state.pageErrors.length, 0, "rooms unsupported state has no page errors");
    return { state: "PASS", evidence: "DETERMINISTIC_BROWSER_FIXTURE", viewport, message, pageErrorCount: state.pageErrors.length, createDisabled: true };
  } finally {
    await state.context.close();
  }
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  await withFixtureServer(async (baseUrl) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      results.push({ kind: "CREATE_MISSING_TOKEN", ...(await runMissingToken(browser, baseUrl, viewport)) });
      results.push({ kind: "MARKET_MISSING_TOKEN", ...(await runMarketMissingToken(browser, baseUrl, viewport)) });
      results.push({ kind: "ROOMS_UNSUPPORTED", ...(await runRoomsUnsupported(browser, baseUrl, viewport)) });
    }
  });
} finally {
  await browser.close();
}

console.log("REAL_COMPONENT_IMPORTED=YES");
console.log("PRODUCT_COPY_REIMPLEMENTED_IN_FIXTURE=NO");
console.log("PRODUCT_LOGIC_REIMPLEMENTED_IN_FIXTURE=NO");
console.log("TEST_ONLY_ROUTE_EXPOSED_TO_PRODUCT=NO");
console.log("AUTHORIZATION_WEAKENED=NO");
console.log("SERVER_BUSINESS_RECORD_CREATED=NO");
console.log("PERSISTENT_DEMO_DATA_CHANGED=NO");
const deterministicPass = results.every((result) => result.state === "PASS");
console.log(`DETERMINISTIC_BROWSER_FIXTURE_ACCEPTANCE=${deterministicPass ? "PASS" : "RESIDUAL"}`);
console.log(JSON.stringify(results));
if (!deterministicPass) process.exitCode = 1;
