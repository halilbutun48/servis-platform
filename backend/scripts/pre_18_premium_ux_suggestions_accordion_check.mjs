import { chromium } from "@playwright/test";

const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const chromePath = process.env.PRE18_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
  console.log(`OK ${message}`);
}

async function companyToken() {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      identifier: "company@demo.com",
      password: "demo123",
      // This is a browser-only local visual proof. It does not mutate product
      // data or use the driver device binding.
      deviceId: "pre18-ux-suggestions-local-proof",
    }),
  });
  const body = await response.json().catch(() => ({}));
  assert(response.ok && body.token, "local Company session is available");
  return body.token;
}

async function measure(page) {
  return page.evaluate(() => {
    const box = (selector) => document.querySelector(selector)?.getBoundingClientRect() || null;
    const drawer = box(".copilotDrawer");
    const chat = box(".copilotChatSurface");
    const composer = box(".copilotComposer");
    const toggle = document.querySelector(".copilotContextSuggestionsToggle");
    const suggestions = box(".copilotContextSuggestions .copilotSuggestionWrap");
    const declaredCount = Number((toggle?.textContent || "").match(/\((\d+)\)/)?.[1] || 0);
    return {
      expanded: toggle?.getAttribute("aria-expanded") || "",
      controls: toggle?.getAttribute("aria-controls") || "",
      controlledRegionExists: Boolean(toggle?.getAttribute("aria-controls") && document.getElementById(toggle.getAttribute("aria-controls"))),
      toggleHeight: Math.round(toggle?.getBoundingClientRect().height || 0),
      suggestionCount: [...document.querySelectorAll(".copilotContextSuggestions .copilotChip")].filter((node) => node.getClientRects().length > 0).length,
      declaredCount,
      suggestionsHeight: Math.round(suggestions?.height || 0),
      chatHeight: Math.round(chat?.height || 0),
      composerVisible: Boolean(composer && drawer && composer.top >= drawer.top && composer.bottom <= drawer.bottom + 1),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

async function openDrawer(browser, viewport, token) {
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width <= 720,
    hasTouch: viewport.width <= 720,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  await context.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${webBaseUrl}/#/company`, { waitUntil: "domcontentloaded" });
  const entry = page.getByRole("button", { name: "Sefer Abi’ye Sor, operasyon yardımcısını aç" });
  await entry.waitFor({ state: "visible", timeout: 10000 });
  await entry.click();
  const toggle = page.locator(".copilotContextSuggestionsToggle");
  await toggle.waitFor({ state: "visible", timeout: 5000 });
  return { context, page, toggle, pageErrors };
}

const token = await companyToken();
const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const results = [];

try {
  const mobile = await openDrawer(browser, { width: 390, height: 844 }, token);
  try {
    const closed = await measure(mobile.page);
    assert(closed.expanded === "false", "390×844 starts with suggestions collapsed");
    assert(closed.toggleHeight >= 40 && closed.toggleHeight <= 48, "collapsed suggestions use one compact trigger row");
    assert(closed.controlledRegionExists && closed.suggestionCount === 0 && closed.suggestionsHeight === 0, "collapsed suggestions retain an accessible controlled region without fixed chip space");
    assert(closed.composerVisible && !closed.horizontalOverflow, "collapsed mobile drawer keeps composer visible without horizontal overflow");

    await mobile.toggle.focus();
    await mobile.page.keyboard.press("Enter");
    await mobile.page.waitForTimeout(100);
    const expanded = await measure(mobile.page);
    assert(expanded.expanded === "true" && expanded.controlledRegionExists, "suggestion trigger exposes an expanded controlled region");
    assert(expanded.suggestionCount === expanded.declaredCount && expanded.suggestionCount >= 1 && expanded.suggestionCount <= 3, "expanded suggestions preserve the current contextual action count");
    assert(expanded.composerVisible && !expanded.horizontalOverflow, "expanded mobile suggestions do not obscure the composer or overflow");

    await mobile.page.keyboard.press("Space");
    await mobile.page.waitForTimeout(100);
    const reclosed = await measure(mobile.page);
    assert(reclosed.expanded === "false" && reclosed.suggestionCount === 0, "keyboard activation collapses suggestions again");
    assert(reclosed.chatHeight > expanded.chatHeight, "collapsed mobile suggestions return vertical room to the answer surface");
    assert(mobile.pageErrors.length === 0, "mobile accordion causes no page errors");
    results.push({ viewport: "390x844", closed, expanded, reclosed, pageErrorCount: mobile.pageErrors.length });
  } finally {
    await mobile.context.close();
  }

  const desktop = await openDrawer(browser, { width: 1440, height: 900 }, token);
  try {
    const expanded = await measure(desktop.page);
    assert(expanded.expanded === "true" && expanded.suggestionCount === expanded.declaredCount, "desktop keeps the same accordion contract expanded by default");
    assert(expanded.composerVisible && !expanded.horizontalOverflow, "desktop expanded suggestions keep the composer visible without overflow");
    await desktop.toggle.click();
    await desktop.page.waitForTimeout(100);
    const collapsed = await measure(desktop.page);
    assert(collapsed.expanded === "false" && collapsed.suggestionCount === 0, "desktop trigger also collapses without leaving chip space");
    assert(desktop.pageErrors.length === 0, "desktop accordion causes no page errors");
    results.push({ viewport: "1440x900", expanded, collapsed, pageErrorCount: desktop.pageErrors.length });
  } finally {
    await desktop.context.close();
  }
} finally {
  await browser.close();
}

console.log(`SEFER_ABI_SUGGESTIONS_ACCORDION_STATUS=PASS`);
console.log(`SEFER_ABI_MOBILE_SUGGESTIONS_DEFAULT_COLLAPSED=PASS`);
console.log(`SEFER_ABI_SUGGESTION_CAPABILITY_LOSS_COUNT=0`);
console.log(`SEFER_ABI_SUGGESTIONS_FIXED_EMPTY_SPACE_COUNT=0`);
console.log(`SEFER_ABI_COMPOSER_OBSCURED_BY_SUGGESTIONS_COUNT=0`);
console.log(`SEFER_ABI_SUGGESTIONS_A11Y_FAILURE_COUNT=0`);
console.log(JSON.stringify(results));
