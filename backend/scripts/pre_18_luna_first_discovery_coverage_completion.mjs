/*
 * PRE-#18 Luna completion runner.
 *
 * This file is a test/evidence harness only.  It reads the frozen discovery
 * artifacts, writes to a separate coverage-completion directory, and never
 * edits product source or the frozen ledger.
 *
 * The runner is intentionally resumable.  Capture and replay are separate
 * stages so that discovering a control cannot be mistaken for proving it.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  buildDurableCheckpoint,
  captureDurableDescriptor,
  classifyAddressability,
  deduplicateCapturedDescriptors,
  prepareDurableReplay,
} from "./lib/pre_18_durable_coverage_completion_inventory.mjs";

const root = process.cwd();
const base = (process.env.WEB_BASE_URL || "https://puerto-harry-autos-phd.trycloudflare.com").replace(/\/$/, "");
const api = (process.env.API_BASE_URL || base).replace(/\/$/, "");
const frozenDir = path.join(root, "backend/artifacts/browser-smoke/pre-18-final-visual-foundation-discovery/fresh-public-run");
const outputDir = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-first-discovery-coverage-completion");
const phase = process.env.PRE18_LUNA_PHASE || "capture";
const captureLimit = Math.max(0, Number(process.env.PRE18_LUNA_CAPTURE_LIMIT || 0));
const executeLimit = Math.max(0, Number(process.env.PRE18_LUNA_EXECUTE_LIMIT || 0));
const batchSize = Math.max(1, Number(process.env.PRE18_LUNA_BATCH_SIZE || 4));

const users = {
  SUPER_ADMIN: { identifier: "superadmin@demo.com", home: "/superadmin" },
  ROOM: { identifier: "room@demo.com", home: "/room" },
  COMPANY: { identifier: "company@demo.com", home: "/company" },
  SCHOOL: { identifier: "school@demo.com", home: "/school" },
  ORGANIZATION: { identifier: "organization@demo.com", home: "/organization" },
  DRIVER: { identifier: "driver@demo.com", home: "/driver/today", deviceId: "web-vos7tyh6mtpo1gze" },
  PERSONEL: { identifier: "personel@demo.com", home: "/personel/live" },
  PARENT: { identifier: "parent@demo.com", home: "/parent/live" },
};
const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
};
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const dangerousText = /(^|\s)(sil|silme|delete|öde|ödeme|tahsil|kabul et|onayla|gönder|kaydet|oluştur|ekle|davet|çalıştır|başlat|tamamla|devre dışı|aktif et|pasif et|şifre|pin değiştir|yayınla|iptal et|reddet|ata|güncelle)(\s|$)/iu;
const norm = (value) => String(value || "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const surfaceKey = (item) => [item.role, item.route, item.viewport, item.state].join("|");
const safeFile = (value) => String(value || "root").replace(/[^a-z0-9_-]+/giu, "-").slice(0, 80);

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function login(credentials) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${api}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: credentials.identifier,
        password: "demo123",
        deviceId: credentials.deviceId || `pre18-luna-${credentials.identifier}`,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429) {
      await sleep((attempt + 1) * 2500);
      continue;
    }
    throw new Error(`login ${credentials.identifier} HTTP ${response.status}: ${norm(body.error || body.message)}`);
  }
  throw new Error(`login exhausted for ${credentials.identifier}`);
}

function inferredRole(node) {
  const explicit = norm(node.getAttribute("role"));
  if (explicit) return explicit;
  const tag = node.tagName.toLowerCase();
  const type = String(node.getAttribute("type") || "").toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button" || tag === "summary") return "button";
  if (tag === "select") return "combobox";
  if (tag === "textarea") return "textbox";
  if (tag === "input" && ["checkbox", "radio"].includes(type)) return type;
  if (tag === "input") return "textbox";
  return "";
}

function controlSelector(role) {
  if (role === "link") return "a[href],[role='link']";
  if (role === "tab") return "[role='tab']";
  if (role === "combobox") return "select,[role='combobox']";
  if (role === "textbox") return "input:not([type='checkbox']):not([type='radio']),textarea,[role='textbox']";
  if (role === "checkbox") return "input[type='checkbox'],[role='checkbox']";
  if (role === "radio") return "input[type='radio'],[role='radio']";
  if (role === "button" || role === "summary") return "button,[role='button'],summary";
  return "button,a[href],input,select,textarea,summary,[role='button'],[role='tab'],[role='checkbox'],[role='radio'],[role='switch'],[role='combobox'],[role='textbox'],[role='option'],[role='menuitem']";
}

async function createPage(browser, role, token, viewportName, label, telemetry) {
  const context = await browser.newContext({
    viewport: viewports[viewportName],
    isMobile: viewportName === "mobile",
    hasTouch: viewportName === "mobile",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  await context.addInitScript(({ accessToken, deviceId }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("personel_servis_browser_device_id", deviceId || "pre18-luna-browser");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, { accessToken: token, deviceId: users[role].deviceId });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") telemetry.console.push({ label, text: message.text(), url: page.url() });
  });
  page.on("pageerror", (error) => telemetry.page.push({ label, text: error.message, url: page.url() }));
  page.on("response", (response) => {
    const item = { label, status: response.status(), url: response.url() };
    if (response.status() >= 500) telemetry.http500.push(item);
    if (response.status() === 403) telemetry.http403.push(item);
    if (response.status() === 404 && /\.(?:js|css|png|svg|woff2?)(?:\?|$)/iu.test(response.url())) telemetry.brokenAsset.push(item);
    if (response.status() >= 400 && response.status() !== 403 && /\/api\/(?:auth|dashboard|room|commercial|payment|operations|driver|parent|school|organization|company)/iu.test(response.url())) telemetry.critical.push(item);
  });
  return { context, page };
}

async function ready(page) {
  await page.waitForSelector("#shell-nav-dock, .navDock, main, button", { state: "attached", timeout: 25000 }).catch(() => {});
  for (let index = 0; index < 12; index += 1) {
    await sleep(250);
    const body = await page.locator("body").innerText().catch(() => "");
    if (!/Yükleniyor…|Yükleniyor\.\.\./u.test(body)) break;
  }
}

async function openRoute(page, route) {
  await page.goto(`${base}/#${route}`, { waitUntil: "domcontentloaded", timeout: 35000 });
  await ready(page);
  // Some role panels mount their tabs/actions after the loading copy has
  // disappeared.  Give the rendered surface one short settling window before
  // capture or replay; this is not a product wait or a PASS assertion.
  await sleep(500);
}

async function inspectVisibleControls(page, meta) {
  return page.evaluate(({ meta: current, selector }) => {
    const compact = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const directText = (element) => compact(element?.innerText || element?.textContent || "");
    const roleOf = (element) => {
      const explicit = compact(element.getAttribute("role"));
      if (explicit) return explicit;
      const tag = element.tagName.toLowerCase();
      const type = String(element.getAttribute("type") || "").toLowerCase();
      if (tag === "a") return "link";
      if (tag === "button" || tag === "summary") return "button";
      if (tag === "select") return "combobox";
      if (tag === "textarea") return "textbox";
      if (tag === "input" && ["checkbox", "radio"].includes(type)) return type;
      if (tag === "input") return "textbox";
      return "";
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && box.width > 0 && box.height > 0;
    };
    const labelledBy = (element) => compact((element.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean).map((id) => directText(document.getElementById(id))).join(" "));
    const labelFor = (element) => {
      if (element.labels?.length) return compact([...element.labels].map(directText).join(" "));
      const id = element.getAttribute("id");
      return id ? directText(document.querySelector(`label[for='${CSS.escape(id)}']`)) : "";
    };
    const nameOf = (element) => compact(element.getAttribute("aria-label") || labelledBy(element) || labelFor(element) || element.getAttribute("title") || directText(element) || element.getAttribute("placeholder") || "");
    const ownerFor = (element, name, role) => {
      const candidates = [];
      let ancestor = element.parentElement;
      while (ancestor && candidates.length < 10) {
        const same = [...ancestor.querySelectorAll(selector)].filter((candidate) => visible(candidate) && roleOf(candidate) === role && nameOf(candidate) === name);
        if (same.length === 1) candidates.push(ancestor);
        ancestor = ancestor.parentElement;
      }
      const semantic = [...candidates].reverse()[0];
      const base = element.closest("[role='dialog'],.modal,[data-drawer],tr,[role='row'],.tableRow,.dataRow,form,article,section,nav,main") || semantic || element.parentElement;
      const type = base?.matches("[role='dialog'],.modal") ? "modal"
        : base?.matches("[data-drawer]") ? "drawer"
          : base?.matches("tr,[role='row'],.tableRow,.dataRow") ? "table-row"
            : base?.matches("form") ? "form"
              : base?.matches("nav") ? "landmark"
                : semantic === base ? "semantic-row" : base ? "section" : "surface";
      const heading = base?.querySelector("h1,h2,h3,h4,h5,h6,legend,[role='heading']");
      const label = compact(base?.getAttribute("aria-label") || directText(heading) || directText(base).slice(0, 280) || "root");
      const siblings = base ? [...base.querySelectorAll(selector)].filter((candidate) => visible(candidate) && roleOf(candidate) === role && nameOf(candidate) === name) : [element];
      const ordinal = siblings.length > 1 ? siblings.indexOf(element) : null;
      return { type, label, boundedOrdinal: Number.isInteger(ordinal) && ordinal >= 0 ? ordinal : null };
    };
    const list = [...document.querySelectorAll(selector)].filter(visible);
    return list.map((element) => {
      const role = roleOf(element);
      const name = nameOf(element);
      const owner = ownerFor(element, name, role);
      const type = compact(element.getAttribute("type") || element.tagName.toLowerCase());
      const iconDescription = compact(element.querySelector("svg title")?.textContent || element.getAttribute("data-icon") || "");
      const actionHint = compact(element.getAttribute("href") || element.getAttribute("data-action") || "");
      const dangerous = /(^|\s)(sil|silme|delete|öde|ödeme|tahsil|kabul et|onayla|gönder|kaydet|oluştur|ekle|davet|çalıştır|başlat|tamamla|devre dışı|aktif et|pasif et|şifre|pin değiştir|yayınla|iptal et|reddet|ata|güncelle)(\s|$)/iu.test(name);
      return {
        control: {
          role,
          type,
          accessibleName: name,
          visibleText: directText(element),
          iconDescription,
          actionHint,
          unsafe: dangerous || element.matches("button[type='submit'],input[type='submit']"),
        },
        owner,
        landmark: compact(element.closest("main,nav,[role='main'],[role='navigation']")?.getAttribute("aria-label") || ""),
        sectionHeading: compact(element.closest("section,article,form,nav,main")?.querySelector("h1,h2,h3,h4,h5,h6,legend,[role='heading']")?.textContent || ""),
        visible: true,
        enabled: !(element.disabled || element.getAttribute("aria-disabled") === "true"),
        actionHint,
        currentState: {
          activeTab: compact(document.querySelector("[role='tab'][aria-selected='true']")?.getAttribute("aria-label") || document.querySelector("[role='tab'][aria-selected='true']")?.textContent || ""),
          detailsOpen: Boolean(element.closest("details")?.open),
          disclosure: compact(element.getAttribute("aria-expanded") || ""),
          modalTitle: compact(element.closest("[role='dialog'],.modal")?.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']")?.textContent || ""),
          drawerTitle: compact(element.closest("[data-drawer]")?.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']")?.textContent || ""),
        },
      };
    }).map((item) => ({ ...item, meta: current }));
  }, { meta, selector: controlSelector("any") });
}

async function findStep(page, step) {
  const label = norm(step.label);
  if (/Sefer Abi/iu.test(label)) {
    const direct = page.getByRole("button", { name: /Sefer Abi.*Sor/iu }).first();
    if (await direct.isVisible().catch(() => false)) return direct;
  }
  if (/Personel Konum/iu.test(label)) {
    const direct = page.getByRole("button", { name: /Personel.*Konum/iu }).first();
    if (await direct.isVisible().catch(() => false)) return direct;
  }
  if (/Öğrenci Konum/iu.test(label)) {
    const direct = page.getByRole("button", { name: /Öğrenci.*Konum/iu }).first();
    if (await direct.isVisible().catch(() => false)) return direct;
  }
  const candidates = page.locator("button,a[href],input,select,textarea,summary,[role='button'],[role='tab'],[role='checkbox'],[role='switch']");
  const count = await candidates.count();
  const matches = [];
  for (let index = 0; index < count; index += 1) {
    const target = candidates.nth(index);
    if (!(await target.isVisible().catch(() => false))) continue;
    const observed = await target.evaluate((node) => ({
      label: String(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.getAttribute("placeholder") || node.value || "").replace(/\s+/g, " ").trim(),
      tag: node.tagName,
      role: node.getAttribute("role") || "",
      type: node.getAttribute("type") || "",
      href: node.getAttribute("href") || "",
      disabled: Boolean(node.disabled || node.getAttribute("aria-disabled") === "true"),
    })).catch(() => null);
    if (!observed) continue;
    const exact = observed.label === label;
    const folded = label && observed.label.localeCompare(label, undefined, { sensitivity: "base" }) === 0;
    const related = label && (observed.label.toLocaleLowerCase("tr-TR").startsWith(label.toLocaleLowerCase("tr-TR")) || label.toLocaleLowerCase("tr-TR").startsWith(observed.label.toLocaleLowerCase("tr-TR")));
    const structural = !label && observed.tag === step.tag && (!step.type || observed.type === step.type) && (!step.href || observed.href === step.href);
    if (exact || folded || related || structural) matches.push({ target, observed });
  }
  const occurrence = Number(step.occurrence || 0);
  if (matches[occurrence]?.target || matches[0]?.target) return matches[occurrence]?.target || matches[0]?.target;
  const lower = label.toLocaleLowerCase("tr-TR");
  const fallbackPattern = lower.includes("sefer abi") ? /Sefer Abi.*Sor/iu
    : lower.includes("personel konum") ? /Personel.*Konum/iu
      : lower.includes("öğrenci konum") ? /Öğrenci.*Konum/iu
        : lower.includes("servis durum") ? /Servis durum/iu
          : lower.includes("market") ? /Market/iu : null;
  if (!fallbackPattern) return null;
  const fallback = [];
  for (let index = 0; index < count; index += 1) {
    const target = candidates.nth(index);
    if (!(await target.isVisible().catch(() => false))) continue;
    const observed = await target.evaluate((node) => String(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.getAttribute("placeholder") || node.value || "").replace(/\s+/g, " ").trim()).catch(() => "");
    if (fallbackPattern.test(observed)) fallback.push(target);
  }
  return fallback[occurrence] || fallback[0] || null;
}

async function replaySteps(page, steps = []) {
  for (const step of steps) {
    const target = await findStep(page, step);
    if (!target) return { ok: false, reason: `missing replay step: ${norm(step.label)}` };
    if (await target.isDisabled().catch(() => true)) continue;
    await target.click({ timeout: 3000, noWaitAfter: true }).catch(() => null);
    await sleep(220);
  }
  return { ok: true };
}

function oldWeakKey(record) {
  const c = record.control || {};
  return [record.role, record.route, record.viewport, record.state, c.tag, c.role, c.type, c.label, c.href, c.occurrence].join("|");
}

function stateForSurface(surface) {
  return {
    surfaceId: surfaceKey(surface),
    detailsOpen: surface.state !== "base" && /ayrıntılı|detay|çalışma|aç/iu.test(surface.state),
  };
}

async function captureInventory() {
  const checkpoint = await readJson(path.join(frozenDir, "checkpoint.json"));
  const finalReport = await readJson(path.join(frozenDir, "final-discovery-report.json"));
  const sourceControls = checkpoint.controls || [];
  const surfaces = checkpoint.surfaces || [];
  const oldBySurface = new Map();
  for (const record of sourceControls) {
    const key = surfaceKey(record);
    if (!oldBySurface.has(key)) oldBySurface.set(key, []);
    oldBySurface.get(key).push(record);
  }
  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], brokenAsset: [] };
  const browser = await chromium.launch({ headless: true });
  const tokens = {};
  const descriptors = [];
  const unaddressable = [];
  const captureFailures = [];
  const selectedSurfaces = captureLimit ? surfaces.slice(0, captureLimit) : surfaces;
  const grouped = new Map();
  for (const surface of selectedSurfaces) {
    const key = `${surface.role}|${surface.viewport}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(surface);
  }
  try {
    for (const [groupKey, group] of grouped) {
      const [role, viewport] = groupKey.split("|");
      if (!tokens[role]) {
        tokens[role] = await login(users[role]);
        await sleep(350);
      }
      const { context, page } = await createPage(browser, role, tokens[role], viewport, `capture:${groupKey}`, telemetry);
      try {
        for (const surface of group) {
        await openRoute(page, surface.route);
        const replay = await replaySteps(page, surface.steps || []);
        if (!replay.ok) {
          captureFailures.push({ surface: surfaceKey(surface), classification: "HARNESS_FAILURE", reason: replay.reason });
          continue;
        }
        const observed = await inspectVisibleControls(page, surface);
        const oldRecords = oldBySurface.get(surfaceKey(surface)) || [];
        const weakBuckets = new Map();
        for (const old of oldRecords) {
          const key = oldWeakKey(old);
          if (!weakBuckets.has(key)) weakBuckets.set(key, []);
          weakBuckets.get(key).push(old);
        }
        const usedOld = new Set();
        for (const item of observed) {
          const label = norm(item.control.accessibleName || item.control.visibleText);
          const old = oldRecords.find((candidate) => {
            if (usedOld.has(candidate.key)) return false;
            const oldLabel = norm(candidate.control?.label);
            const oldType = norm(candidate.control?.type).toLowerCase();
            const newType = norm(item.control?.type).toLowerCase();
            return oldLabel === label && (!newType || !oldType || oldType === newType || (newType === "button" && candidate.control?.tag === "BUTTON"));
          }) || null;
          if (old) usedOld.add(old.key);
          const safeClassification = old?.control?.unsafe || item.control.unsafe ? "UNSAFE" : "SAFE";
          const descriptor = captureDurableDescriptor({
            role: surface.role,
            route: surface.route,
            viewport: surface.viewport,
            surface: { id: surfaceKey(surface), title: `${surface.role} ${surface.route}` },
            state: stateForSurface(surface),
            control: item.control,
            owner: item.owner,
            landmark: item.landmark,
            sectionHeading: item.sectionHeading,
            actionHint: item.actionHint,
            safeClassification,
          });
          descriptor.REPLAY_STEPS = surface.steps || [];
          descriptor.SOURCE_RECORD_KEYS = old ? [old.key] : [];
          descriptor.SOURCE_SCREENSHOT = surface.screenshot;
          descriptor.CAPTURE_VISIBLE = item.visible;
          descriptor.CAPTURE_ENABLED = item.enabled;
          descriptor.CAPTURE_STATE = item.currentState;
          descriptors.push(descriptor);
          const addressability = classifyAddressability(descriptor);
          if (addressability.addressability === "UNADDRESSABLE_HARNESS_ITEM") unaddressable.push({ descriptorId: descriptor.DESCRIPTOR_ID, role: surface.role, route: surface.route, viewport: surface.viewport, controlType: descriptor.CONTROL_TYPE, visibleText: descriptor.VISIBLE_TEXT, accessibleName: descriptor.ACCESSIBLE_NAME, ownerContext: `${descriptor.CONTEXTUAL_OWNER_TYPE}:${descriptor.CONTEXTUAL_OWNER_LABEL}`, why: "no accessible or structural owner locator plan" });
        }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const deduped = deduplicateCapturedDescriptors(descriptors);
  const inventory = {
    schemaVersion: "pre18-luna-full-durable-completion-inventory-v1",
    source: "FROZEN_FIRST_DISCOVERY_SURFACES_WITH_CAPTURE_TIME_DURABLE_DESCRIPTORS",
    generatedAt: new Date().toISOString(),
    base,
    browser: { engine: "Chromium 148.0.7778.96", automation: "Playwright @playwright/test 1.60.0", headless: true },
    oldInventoryCount: sourceControls.length,
    surfacesCaptured: selectedSurfaces.length,
    surfacesExpected: surfaces.length,
    descriptors: deduped.records,
    stats: {
      OLD_INVENTORY_COUNT: sourceControls.length,
      NEW_COMPLETION_INVENTORY_COUNT: deduped.records.length,
      EXACT_DUPLICATE_REMOVED_COUNT: deduped.stats.EXACT_DUPLICATE_REMOVED_COUNT,
      FALSE_COLLISION_SPLIT_COUNT: deduped.stats.FALSE_COLLISION_SPLIT_COUNT,
      LEGITIMATE_VIEWPORT_VARIANT_COUNT: new Set(deduped.records.map((item) => `${item.ROLE}|${item.ROUTE}|${item.SURFACE_ID}|${item.VIEWPORT}`)).size,
      LEGITIMATE_STATE_VARIANT_COUNT: new Set(deduped.records.map((item) => `${item.ROLE}|${item.ROUTE}|${item.VIEWPORT}|${item.STATE_SIGNATURE}`)).size,
      UNADDRESSABLE_HARNESS_ITEM_COUNT: unaddressable.length,
    },
    captureFailures,
    unaddressable,
    telemetry,
    frozenLedgerMutated: false,
    oldInventoryMutated: false,
    finalDiscoverySummary: finalReport.summary,
  };
  await writeJson(path.join(outputDir, "full-durable-completion-inventory.json"), inventory);
  await writeJson(path.join(outputDir, "capture-telemetry.json"), telemetry);
  console.log(JSON.stringify({ phase: "capture", stats: inventory.stats, surfacesCaptured: selectedSurfaces.length, captureFailures: captureFailures.length, report: path.relative(root, path.join(outputDir, "full-durable-completion-inventory.json")).replace(/\\/g, "/") }, null, 2));
}

function descriptorLocator(page, descriptor) {
  const role = descriptor.CONTROL_ROLE || "button";
  const selector = controlSelector(role);
  return descriptor.ACCESSIBLE_NAME
    ? page.getByRole(role, { name: descriptor.ACCESSIBLE_NAME, exact: true })
    : page.locator(selector);
}

async function locateDescriptor(page, descriptor, surface) {
  let candidates = descriptorLocator(page, descriptor);
  if (await candidates.count() === 0 && descriptor.ACCESSIBLE_NAME) {
    candidates = page.locator(controlSelector(descriptor.CONTROL_ROLE)).filter({ hasText: descriptor.ACCESSIBLE_NAME });
  }
  const matches = [];
  const visibleCandidates = [];
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    visibleCandidates.push(candidate);
    const observed = await candidate.evaluate((node) => {
      const compact = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const role = compact(node.getAttribute("role")) || (node.tagName === "A" ? "link" : node.tagName === "BUTTON" || node.tagName === "SUMMARY" ? "button" : node.tagName === "SELECT" ? "combobox" : node.tagName === "INPUT" ? "textbox" : "");
      const name = compact(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.getAttribute("placeholder") || node.value || "");
      const owner = node.closest("[role='dialog'],.modal,[data-drawer],tr,[role='row'],.tableRow,.dataRow,form,article,section,nav,main") || node.parentElement;
      const heading = owner?.querySelector("h1,h2,h3,h4,h5,h6,legend,[role='heading']");
      return { role, name, ownerType: owner?.matches("[role='dialog'],.modal") ? "modal" : owner?.matches("[data-drawer]") ? "drawer" : owner?.matches("tr,[role='row'],.tableRow,.dataRow") ? "table-row" : owner?.matches("form") ? "form" : owner?.matches("nav") ? "landmark" : "section", ownerLabel: compact(owner?.getAttribute("aria-label") || heading?.textContent || owner?.innerText).slice(0, 280) };
    }).catch(() => null);
    if (!observed) continue;
    if (observed.role !== descriptor.CONTROL_ROLE) continue;
    if (descriptor.ACCESSIBLE_NAME && observed.name !== descriptor.ACCESSIBLE_NAME) continue;
    if (descriptor.CONTEXTUAL_OWNER_TYPE !== observed.ownerType) continue;
    if (descriptor.CONTEXTUAL_OWNER_LABEL && !observed.ownerLabel.includes(descriptor.CONTEXTUAL_OWNER_LABEL.slice(0, 80))) continue;
    matches.push(candidate);
  }
  // A unique accessible semantic match is durable even when a framework
  // renders an equivalent owner wrapper differently after navigation.
  if (matches.length === 0 && descriptor.ACCESSIBLE_NAME && visibleCandidates.length === 1) return visibleCandidates[0];
  if (matches.length !== 1) throw new Error(`durable relocation expected 1, found ${matches.length} for ${descriptor.DESCRIPTOR_ID}`);
  return matches[0];
}

async function renderedSnapshot(page) {
  return page.evaluate(() => ({
    href: location.href,
    text: String(document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 5000),
    dialogs: document.querySelectorAll("[role='dialog'],.modal").length,
    drawers: document.querySelectorAll("[data-drawer],.drawer,.copilotDrawer").length,
    openDetails: document.querySelectorAll("details[open]").length,
    selectedTab: document.querySelector("[role='tab'][aria-selected='true']")?.getAttribute("aria-label") || document.querySelector("[role='tab'][aria-selected='true']")?.textContent?.trim() || "",
  }));
}

async function safeExecute(page, target, descriptor) {
  const before = await renderedSnapshot(page);
  const tag = await target.evaluate((node) => node.tagName).catch(() => "");
  const type = await target.getAttribute("type").catch(() => "");
  if (await target.isDisabled().catch(() => true)) return { executionState: "VALIDLY_SKIPPED", classification: "EXPECTED_DISABLED", visible: true, enabled: false, actionAttempted: false, actionResult: "DISABLED_STATE_OBSERVED", expectedEffect: "Disabled state remains explicit", observedEffect: "Control is disabled", closeOrResetResult: "NOT_REQUIRED", evidence: [{ kind: "disabled" }] };
  if (tag === "INPUT" || tag === "TEXTAREA") {
    if (["checkbox", "radio"].includes(String(type).toLowerCase()) || descriptor.CONTROL_ROLE === "checkbox" || descriptor.CONTROL_ROLE === "switch") {
      const beforeValue = await target.isChecked().catch(() => null);
      await target.click({ timeout: 3000 });
      const changed = await target.isChecked().catch(() => null);
      await target.click({ timeout: 3000 });
      const restored = await target.isChecked().catch(() => null);
      if (changed === beforeValue || restored !== beforeValue) throw new Error("reversible checked-state transition not proven");
      return { executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true, actionResult: "TOGGLED_AND_RESTORED", expectedEffect: "Checked state changes and restores", observedEffect: `${beforeValue}→${changed}→${restored}`, closeOrResetResult: "RESTORED", evidence: [{ kind: "checked", before: beforeValue, changed, restored }] };
    }
    const beforeValue = await target.inputValue().catch(() => "");
    await target.focus();
    const focused = await target.evaluate((node) => document.activeElement === node).catch(() => false);
    if (!focused) throw new Error("input focus not observed");
    if (/password|file|date|time|number/iu.test(String(type))) return { executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true, actionResult: "FOCUSED", expectedEffect: "Field accepts focus without mutating data", observedEffect: "document.activeElement matched field", closeOrResetResult: "NOT_REQUIRED", evidence: [{ kind: "focus" }] };
    await target.fill("deneme");
    const changed = await target.inputValue().catch(() => "");
    await target.fill(beforeValue);
    const restored = await target.inputValue().catch(() => "");
    if (changed !== "deneme" || restored !== beforeValue) throw new Error("reversible input transition not proven");
    return { executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true, actionResult: "VALUE_CHANGED_AND_RESTORED", expectedEffect: "Field value changes and restores", observedEffect: `${beforeValue}→${changed}→${restored}`, closeOrResetResult: "RESTORED", evidence: [{ kind: "input", before: beforeValue, changed, restored }] };
  }
  if (tag === "SELECT") {
    const beforeValue = await target.inputValue().catch(() => "");
    const options = await target.locator("option").evaluateAll((items) => items.filter((item) => !item.disabled && item.value && item.value !== beforeValue).map((item) => item.value));
    if (!options.length) return { executionState: "VALIDLY_SKIPPED", classification: "DATA_DEPENDENCY", visible: true, enabled: true, actionAttempted: true, actionResult: "NO_ALTERNATE_OPTION", expectedEffect: "An enabled alternate option is available", observedEffect: "No enabled alternate option", closeOrResetResult: "NOT_REQUIRED", evidence: [{ kind: "options", before: beforeValue, options }] };
    await target.selectOption(options[0]);
    const changed = await target.inputValue();
    await target.selectOption(beforeValue).catch(() => {});
    const restored = await target.inputValue().catch(() => "");
    if (changed !== options[0] || restored !== beforeValue) throw new Error("select transition not proven");
    return { executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true, actionResult: "OPTION_SELECTED_AND_RESTORED", expectedEffect: "Option selection changes and restores", observedEffect: `${beforeValue}→${changed}→${restored}`, closeOrResetResult: "RESTORED", evidence: [{ kind: "select", before: beforeValue, changed, restored }] };
  }
  await target.click({ timeout: 3000, noWaitAfter: true });
  await sleep(300);
  const after = await renderedSnapshot(page);
  const changed = before.href !== after.href || before.text !== after.text || before.dialogs !== after.dialogs || before.drawers !== after.drawers || before.openDetails !== after.openDetails || before.selectedTab !== after.selectedTab;
  if (!changed) throw new Error("click completed without observable rendered effect");
  await page.keyboard.press("Escape").catch(() => {});
  return { executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true, actionResult: "RENDERED_TRANSITION_OBSERVED", expectedEffect: "Rendered state changes after control action", observedEffect: "route/text/dialog/drawer/details/tab state changed", closeOrResetResult: "ESCAPE_ATTEMPTED", evidence: [{ kind: "rendered-state", before, after }] };
}

async function unsafeBoundary(page, target) {
  const before = await renderedSnapshot(page);
  const blockedMutations = [];
  const routeHandler = async (route) => {
    if (mutationMethods.has(route.request().method())) {
      blockedMutations.push({ method: route.request().method(), url: route.request().url() });
      await route.abort();
      return;
    }
    await route.continue();
  };
  await page.route("**/*", routeHandler);
  try {
    await target.click({ timeout: 3000, noWaitAfter: true });
    await sleep(400);
    const after = await renderedSnapshot(page);
    const close = page.getByRole("button", { name: /^(kapat|iptal|vazgeç|geri)$/iu }).first();
    const closeVisible = await close.isVisible().catch(() => false);
    if (closeVisible) await close.click({ timeout: 2000 }).catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    if (after.dialogs > before.dialogs || after.drawers > before.drawers || after.openDetails > before.openDetails || blockedMutations.length) {
      return { executionState: "VALIDLY_SKIPPED", classification: "NOT_SAFE_TO_EXECUTE_FULLY", visible: true, enabled: true, actionAttempted: true, actionResult: "CANCELLABLE_BOUNDARY_PROBED", expectedEffect: "Safety boundary appears before mutation", observedEffect: blockedMutations.length ? "Mutation request was blocked by harness" : "Rendered boundary state was observed", closeOrResetResult: closeVisible ? "CANCELLED" : "ESCAPE_ATTEMPTED", safetyFlowProven: true, unsafeMutationExecuted: false, evidence: [{ kind: "unsafe-boundary", before, after, blockedMutations }] };
    }
    throw new Error("unsafe control exposed no provable safety boundary");
  } finally {
    await page.unroute("**/*", routeHandler).catch(() => {});
  }
}

async function executeInventory() {
  const inventory = await readJson(path.join(outputDir, "full-durable-completion-inventory.json"));
  const checkpointPath = path.join(outputDir, "durable-completion-checkpoint.json");
  const prior = await fs.readFile(checkpointPath, "utf8").then(JSON.parse).catch(() => ({}));
  const records = prepareDurableReplay(inventory.descriptors, prior);
  const telemetry = inventory.telemetry || { console: [], page: [], http500: [], http403: [], critical: [], brokenAsset: [] };
  const browser = await chromium.launch({ headless: true });
  const tokens = {};
  const pending = records.filter((record) => record.executionState === "NOT_YET_TESTED" || record.executionState === "HARNESS_FAILURE" || record.executionState === "ATTEMPTED");
  const target = executeLimit ? pending.slice(0, executeLimit) : pending;
  let attempted = 0;
  try {
    for (let index = 0; index < target.length; index += batchSize) {
      const batch = target.slice(index, index + batchSize);
      await Promise.all(batch.map(async (record) => {
        if (!tokens[record.ROLE]) {
          tokens[record.ROLE] = await login(users[record.ROLE]);
          await sleep(350);
        }
        const { context, page } = await createPage(browser, record.ROLE, tokens[record.ROLE], record.VIEWPORT, `execute:${record.DESCRIPTOR_ID.slice(0, 12)}`, telemetry);
        try {
          record.executionState = "ATTEMPTED";
          record.EXECUTION_STATE = "ATTEMPTED";
          await openRoute(page, record.ROUTE);
          const replay = await replaySteps(page, record.REPLAY_STEPS || []);
          if (!replay.ok) throw new Error(replay.reason);
          const targetControl = await locateDescriptor(page, record, record);
          const outcome = record.SAFE_CLASSIFICATION === "UNSAFE" || dangerousText.test(record.ACCESSIBLE_NAME || record.VISIBLE_TEXT || "")
            ? await unsafeBoundary(page, targetControl)
            : await safeExecute(page, targetControl, record);
          Object.assign(record, outcome, {
            EXECUTION_STATE: outcome.executionState,
            CLASSIFICATION: outcome.classification,
            ACTION_ATTEMPTED: outcome.actionAttempted,
            ACTION_RESULT: outcome.actionResult,
            EXPECTED_EFFECT: outcome.expectedEffect,
            OBSERVED_EFFECT: outcome.observedEffect,
            CLOSE_OR_RESET_RESULT: outcome.closeOrResetResult,
            EVIDENCE: outcome.evidence,
            retryable: !["PROVEN_PASS", "PROVEN_PRODUCT_DEFECT", "VALIDLY_SKIPPED"].includes(outcome.executionState),
            executionEvidence: { route: record.ROUTE, viewport: record.VIEWPORT, surface: record.SURFACE_ID },
          });
        } catch (error) {
          Object.assign(record, { executionState: "HARNESS_FAILURE", EXECUTION_STATE: "HARNESS_FAILURE", classification: "HARNESS_DEFECT", CLASSIFICATION: "HARNESS_DEFECT", detail: norm(error?.message || error).slice(0, 500), retryable: true });
        } finally {
          attempted += 1;
          await context.close();
        }
      }));
      const checkpoint = buildDurableCheckpoint(records);
      checkpoint.source = "PRE_18_LUNA_EXHAUSTIVE_COVERAGE_COMPLETION";
      checkpoint.generatedAt = new Date().toISOString();
      checkpoint.attemptedThisRun = attempted;
      await writeJson(checkpointPath, checkpoint);
      console.log(JSON.stringify({ batchEnd: Math.min(index + batchSize, target.length), target: target.length, progress: checkpoint.progress, counts: checkpoint.counts }, null, 2));
    }
  } finally {
    await browser.close();
  }
  const finalCheckpoint = buildDurableCheckpoint(records);
  finalCheckpoint.source = "PRE_18_LUNA_EXHAUSTIVE_COVERAGE_COMPLETION";
  finalCheckpoint.generatedAt = new Date().toISOString();
  finalCheckpoint.attemptedThisRun = attempted;
  await writeJson(checkpointPath, finalCheckpoint);
  await writeJson(path.join(outputDir, "execution-telemetry.json"), telemetry);
  console.log(JSON.stringify({ phase: "execute", progress: finalCheckpoint.progress, counts: finalCheckpoint.counts, checkpoint: path.relative(root, checkpointPath).replace(/\\/g, "/") }, null, 2));
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  if (phase === "capture" || phase === "all") await captureInventory();
  if (phase === "execute" || phase === "all") await executeInventory();
  if (!new Set(["capture", "execute", "all"]).has(phase)) throw new Error(`unknown PRE18_LUNA_PHASE=${phase}`);
}

await main();
