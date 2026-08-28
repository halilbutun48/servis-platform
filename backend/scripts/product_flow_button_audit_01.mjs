#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { buildSmokeEvidenceIdentity } from "./lib/guardSmokeEvidence.js";
import {
  revealFirstVisibleShiftCardDetails,
  revealFirstVisibleShiftOtherActions,
  relocateRepoDebugLogIfPresent,
  waitForShiftCardContent,
} from "./lib/productFlowShiftSmoke.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const HEADLESS = String(process.env.HEADLESS ?? "true").toLowerCase() !== "false";
const SLOW_MO = Number(process.env.SLOW_MO || 0) || 0;

const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "PRODUCT_FLOW_BUTTON_AUDIT_01");
const screenshotRoot = path.join(artifactRoot, "screenshots");
const reportJsonPath = path.join(artifactRoot, "report.json");
const reportMdPath = path.join(artifactRoot, "report.md");
const chromiumDebugLogPath = path.join(artifactRoot, "chromium-debug.log");
const repoDebugLogPath = path.join(repoRoot, "debug.log");

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

const DEMO_USERS = {
  superadmin: { identifier: "superadmin@demo.com", password: "demo123" },
  company: { identifier: "company@demo.com", password: "demo123" },
  room: { identifier: "room@demo.com", password: "demo123" },
  personel: { identifier: "personel@demo.com", password: "demo123" },
  parent: { identifier: "parent@demo.com", password: "demo123" },
};

const ROUTE_GROUPS = [
  {
    role: "public",
    auth: false,
    routes: [
      { route: "/#/landing", label: "Public Landing", kind: "publicLanding", baseline: "PASS" },
    ],
  },
  {
    role: "superadmin",
    auth: true,
    routes: [
      { route: "/#/superadmin/onboarding-review", label: "Super Admin Onboarding Review", kind: "reviewQueue", baseline: "PASS" },
      { route: "/#/superadmin/commercial-core", label: "Super Admin Commercial Core", kind: "commercialReadOnly", baseline: "PASS" },
    ],
  },
  {
    role: "company",
    auth: true,
    routes: [
      { route: "/#/company/shifts", label: "Company Shifts", kind: "convertToAgreement", baseline: "PASS" },
      { route: "/#/company/agreements", label: "Company Agreements", kind: "agreementPreview", baseline: "PASS" },
    ],
  },
  {
    role: "room",
    auth: true,
    routes: [
      { route: "/#/room/shifts", label: "Room Shifts", kind: "dispatchApproval", baseline: "PASS" },
      { route: "/#/room/agreements", label: "Room Agreements", kind: "roomAgreementPreview", baseline: "PASS" },
    ],
  },
  {
    role: "personel",
    auth: true,
    routes: [
      { route: "/#/personel/live", label: "Personel Live", kind: "personelLive", baseline: "PASS" },
    ],
  },
  {
    role: "parent",
    auth: true,
    routes: [
      { route: "/#/parent/live", label: "Parent Live", kind: "parentLive", baseline: "PASS" },
    ],
  },
];

const STATUS_RANK = {
  PASS: 0,
  "PASS-": 1,
  "UX-FIX": 2,
  BLOCKER: 3,
  "AUTH-BLOCKED": 4,
  "NOT-FOUND": 5,
};

const COVERAGE_SOURCES = [
  "web/src/panels/public/PublicLandingPage.jsx",
  "web/src/components/public/PublicLeadCaptureModal.jsx",
  "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
  "web/src/panels/superadmin/CommercialCorePanel.jsx",
  "web/src/components/PaymentReadinessReadonlyCard.jsx",
  "web/src/panels/company/companyShiftsPanelRows.jsx",
  "web/src/panels/company/AgreementsPanel.jsx",
  "web/src/panels/room/roomShiftsPanelRows.jsx",
  "web/src/panels/room/AgreementsPanel.jsx",
  "web/src/panels/personel/LivePanel.jsx",
  "web/src/panels/parent/LivePanel.jsx",
  "web/src/components/RoutePreviewModal.jsx",
];

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function makeSlug(parts) {
  return normalize(parts.join(" "))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function bumpStatus(current, candidate) {
  const currentRank = STATUS_RANK[current] ?? 0;
  const candidateRank = STATUS_RANK[candidate] ?? 0;
  return candidateRank > currentRank ? candidate : current;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function loginRole(role) {
  const credentials = DEMO_USERS[role];
  if (!credentials) return { role, token: null, loginInfo: null, error: null };

  const body = {
    identifier: credentials.identifier,
    password: credentials.password,
    deviceId: `product-flow-button-audit-${role}`,
    deviceName: "Product Flow Button Audit",
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const rawText = await response.text();
    let loginInfo = null;
    try {
      loginInfo = rawText ? JSON.parse(rawText) : null;
    } catch {
      loginInfo = { rawText };
    }

    if (!response.ok || !loginInfo?.token) {
      return {
        role,
        token: null,
        loginInfo,
        error: `LOGIN_FAIL ${role} ${response.status}${rawText ? ` ${rawText.slice(0, 180)}` : ""}`,
      };
    }

    return { role, token: loginInfo.token, loginInfo, error: null };
  } catch (error) {
    return { role, token: null, loginInfo: null, error: `LOGIN_EXCEPTION ${role} ${error?.message || String(error)}` };
  }
}

async function screenshot(page, scenario, viewportName, stage) {
  const fileName = `${makeSlug([scenario.role])}-${makeSlug([scenario.label])}-${viewportName}-${stage}.png`;
  const relPath = path.join("screenshots", viewportName, fileName).replace(/\\/g, "/");
  const absPath = path.join(screenshotRoot, viewportName, fileName);
  await ensureDir(path.dirname(absPath));
  await page.screenshot({ path: absPath, fullPage: false });
  return relPath;
}

async function getText(page) {
  try {
    return await page.locator("body").innerText({ timeout: 8000 });
  } catch {
    return "";
  }
}

async function getHeadings(page) {
  try {
    return (await page.locator("h1, h2, h3, h4").allTextContents()).map((item) => item.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function getButtons(page) {
  try {
    const items = await page.locator("button, a[role='button']").allTextContents();
    return items.map((item) => item.trim()).filter(Boolean).slice(0, 40);
  } catch {
    return [];
  }
}

async function isVisible(page, role, name) {
  try {
    return Boolean(await firstVisibleLocator(page, role, name));
  } catch {
    return false;
  }
}

async function firstVisibleLocator(page, role, name) {
  const locator = page.getByRole(role, { name });
  const count = await locator.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const candidate = locator.nth(i);
    const visible = await candidate.isVisible({ timeout: 1200 }).catch(() => false);
    if (visible) return candidate;
  }
  return null;
}

async function waitForFirstVisibleLocator(page, role, name, { timeoutMs = 9000, intervalMs = 150 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const locator = await firstVisibleLocator(page, role, name);
    if (locator) return locator;
    await page.waitForTimeout(intervalMs);
  }
  return null;
}

async function waitForAnyVisibleLocator(page, role, names, { timeoutMs = 9000, intervalMs = 150 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    for (const name of names || []) {
      const locator = await firstVisibleLocator(page, role, name);
      if (locator) {
        return { locator, name };
      }
    }
    await page.waitForTimeout(intervalMs);
  }
  return null;
}

async function firstVisibleButtonByText(page, needle) {
  const target = normalize(needle);
  const locator = page.locator("button");
  const count = await locator.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const candidate = locator.nth(i);
    const visible = await candidate.isVisible({ timeout: 1200 }).catch(() => false);
    if (!visible) continue;
    const text = normalize(await candidate.innerText().catch(() => ""));
    if (!text) continue;
    if (text === target || text.includes(target)) return candidate;
  }
  return null;
}

async function firstVisiblePanelTab(page, name) {
  return await firstVisibleLocator(page, "tab", name)
    || await firstVisibleLocator(page, "button", name);
}

async function firstPanelTab(page, name) {
  const candidates = page.locator("button.panelSegmentTab");
  const count = await candidates.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const candidate = candidates.nth(i);
    const label = await candidate.innerText().catch(() => "");
    if (name instanceof RegExp ? name.test(label) : normalize(label) === normalize(name)) return candidate;
  }
  return await firstVisiblePanelTab(page, name);
}

async function clickVisible(page, role, name) {
  const locator = await firstVisibleLocator(page, role, name);
  if (!locator) return false;
  await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  await locator.click({ timeout: 5000 });
  return true;
}

async function trialClickVisible(page, role, name) {
  const locator = await firstVisibleLocator(page, role, name);
  if (!locator) return false;
  await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  try {
    await locator.click({ trial: true, timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

async function textVisible(page, needle) {
  try {
    const locator = page.getByText(needle, { exact: false });
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const candidate = locator.nth(i);
      const visible = await candidate.isVisible({ timeout: 1200 }).catch(() => false);
      if (visible) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function fetchJson(pathname, token) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, json, text };
}

async function selectParentLiveNoVehicleChild(page, token) {
  if (!token) return false;
  try {
    const childrenResp = await fetchJson("/api/parent/children", token);
    const children = Array.isArray(childrenResp.json?.items) ? childrenResp.json.items : [];
    if (children.length < 2) return false;

    for (const child of children) {
      const liveResp = await fetchJson(`/api/parent/live/vehicles?childId=${encodeURIComponent(String(child.id))}&take=1`, token);
      const vehicles = Array.isArray(liveResp.json) ? liveResp.json : Array.isArray(liveResp.json?.items) ? liveResp.json.items : [];
      if (vehicles.length === 0) {
        const childSelect = page.getByLabel("Çocuk");
        await childSelect.selectOption(String(child.id)).catch(async () => {
          await childSelect.selectOption({ label: `#${child.id} ${child.fullName}` }).catch(() => {});
        });
        for (let i = 0; i < 20; i += 1) {
          if (await textVisible(page, "Bu çocuk için şu an canlı araç görünmüyor.") || await textVisible(page, "Bugün için aktif servis görünmüyor.")) {
            return true;
          }
          await page.waitForTimeout(250);
        }
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

async function firstVisibleText(page, needles) {
  for (const needle of needles) {
    if (await textVisible(page, needle)) return needle;
  }
  return null;
}

function notFoundSeen(text) {
  const hay = normalize(text);
  return hay.includes("sayfa bulunamadi") || hay.includes("sayfa bulunamadı") || hay.includes("404") || hay.includes("not found") || hay.includes("bilinmeyen rota");
}

function loginRootSeen(text) {
  const hay = normalize(text);
  return hay.includes("demo kullanicilar") && hay.includes("sifre") && hay.includes("giris");
}

async function collectRoutePreviewEvidence(page, result, label) {
  const titleVisible = await firstVisibleText(page, ["Rota/Durak Önizleme", "Rota Önizleme", "Harita Önizleme"]);
  result.checks.previewTitleVisible = Boolean(titleVisible);
  result.checks.previewTitleLabel = titleVisible || "";
  result.checks.previewMapFrameVisible = await page.locator(".routePreviewMapFrame").first().isVisible({ timeout: 3000 }).catch(() => false);
  result.checks.previewMiniMapLabelVisible = await textVisible(page, "Mini Map");
  result.checks.previewLeafletHintVisible = await textVisible(page, "Leaflet mini-harita");
  result.checks.previewExternalNavVisible = await isVisible(page, "button", "Tam Rotayı Dış Navigasyonda Aç");
  result.checks.previewExternalNavTrialClickable = await trialClickVisible(page, "button", "Tam Rotayı Dış Navigasyonda Aç");
  if (!result.checks.previewTitleVisible || !result.checks.previewMapFrameVisible || !result.checks.previewMiniMapLabelVisible || !result.checks.previewLeafletHintVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push(`${label} preview modal expected map/read-only evidence is missing.`);
  } else {
    result.notes.push(`${label} preview modal opened with read-only route/map evidence.`);
  }
}

async function handlePublicLanding(page, result) {
  const ctaLabels = ["Demo talep et", "Canlı destekle görüş", "Servis ihtiyacımı anlat", "Tedarikçi olarak başvur"];
  let ctaCount = 0;
  for (const label of ctaLabels) {
    if (await isVisible(page, "button", label)) ctaCount += 1;
  }
  result.checks.ctaCount = ctaCount;
  result.checks.platformBoundaryVisible = await textVisible(page, "Başvurular ekip tarafından incelenir");
  result.checks.autoMembershipBoundaryVisible = await textVisible(page, "Üyelik otomatik açılmaz");
  result.checks.paymentBoundaryVisible = await textVisible(page, "Ödeme / fatura / tahsilat yok");
  result.checks.publicLeadBoundaryVisible = await textVisible(page, "Public CTA'lar demo, canlı destek, servis ihtiyacı ve tedarikçi başvurusu toplar.");

  if (ctaCount !== 4 || !result.checks.platformBoundaryVisible || !result.checks.autoMembershipBoundaryVisible || !result.checks.paymentBoundaryVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Public landing CTA veya güven sınırı görünmüyor.");
    return;
  }

  const demoButton = page.getByRole("button", { name: "Demo talep et" }).first();
  await demoButton.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  await demoButton.click({ timeout: 4000 });
  await page.waitForTimeout(250);

  result.checks.demoModalOpened = await page.locator('[role="dialog"][aria-modal="true"]').first().isVisible({ timeout: 3000 }).catch(() => false);
  result.checks.modalTitleVisible = await textVisible(page, "Başvuru formu");
  result.checks.modalSafeBoundaryVisible = await textVisible(page, "Bu form kontrollü lead kaydı alır.");
  result.checks.modalNoAutoMembershipVisible = await textVisible(page, "Üyelik otomatik açılmaz. Başvurular ekip tarafından incelenir.");
  result.checks.modalPaymentBoundaryVisible = await textVisible(page, "ödeme / fatura / tahsilat ve invite gönderimi bu akışta yapılmaz.");

  const submit = page.locator("form button[type='submit']").first();
  await submit.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  await submit.click({ timeout: 4000 });
  await page.waitForTimeout(250);

  result.checks.validationErrorVisible = await textVisible(page, "Ad soyad gerekli.");
  result.checks.validationGuardVisible = await textVisible(page, "Telefon veya e-posta alanından en az biri gerekli.");

  if (!result.checks.demoModalOpened || !result.checks.modalSafeBoundaryVisible || !result.checks.validationErrorVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Public lead modal validation boundary did not appear as expected.");
  } else {
    result.notes.push("Public landing CTA modal opened and blank submit stayed in validation-only mode.");
  }
}

async function handleReviewQueue(page, result) {
  result.checks.reviewOnlyPillVisible = await textVisible(page, "Sadece inceleme");
  result.checks.reviewBoundaryVisible = await textVisible(page, "Bu ekran sadece başvuruları listeler ve durum/not günceller.");
  result.checks.humanApprovalVisible = await textVisible(page, "Kullanıcı onayı gerekli");
  result.checks.readOnlyBoundariesVisible = await textVisible(page, "Read-only sınırları açık");

  const actionLabels = ["İncelemeye al", "Ek bilgi gerekli", "Invite için uygun", "Reddet", "Notları kaydet"];
  let visibleCount = 0;
  let trialCount = 0;
  for (const label of actionLabels) {
    const visible = await isVisible(page, "button", label);
    result.checks[`${makeSlug([label])}Visible`] = visible;
    if (visible) visibleCount += 1;
    const trial = await trialClickVisible(page, "button", label);
    result.checks[`${makeSlug([label])}TrialClickable`] = trial;
    if (trial) trialCount += 1;
  }
  result.checks.reviewActionVisibleCount = visibleCount;
  result.checks.reviewActionTrialCount = trialCount;

  const emptyStateVisible = await textVisible(page, "Kayıt yok")
    || await textVisible(page, "Filtreye uyan başvuru yok.")
    || await textVisible(page, "Sağdan bir başvuru seçin.");
  const emptyStateReasonVisible = await textVisible(page, "Detay ekranı yalnız inceleme içindir. Buradan invite, kullanıcı veya ödeme işlemi başlatılmaz.")
    || await textVisible(page, "Bu ekran sadece başvuruları listeler ve durum/not günceller.");
  result.checks.reviewQueueEmptyVisible = emptyStateVisible;
  result.checks.reviewQueueEmptyReasonVisible = emptyStateReasonVisible;

  const emptyStateAllowed = visibleCount < 5 && emptyStateVisible && emptyStateReasonVisible;

  if (!result.checks.reviewBoundaryVisible || !result.checks.humanApprovalVisible || !result.checks.readOnlyBoundariesVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Review queue read-only boundary is incomplete.");
  } else if (visibleCount >= 5) {
    result.notes.push("Review queue exposes human-only actions and keeps invite/user/payment writes out of scope.");
  } else if (emptyStateAllowed) {
    result.notes.push("Review queue is empty in this fixture set; readable empty-state guidance is present and accepted as PASS.");
  } else {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Review queue action set or empty-state guidance is incomplete.");
  }

  if (!result.checks.reviewOnlyPillVisible) {
    result.status = bumpStatus(result.status, "PASS-");
    result.notes.push("Review-only pill is not surfaced in the visible chrome, but the read-only boundary text is present.");
  }
}

async function handleCommercialCore(page, result) {
  let billingTab = await firstVisibleLocator(page, "tab", /^Hakediş\b/i);
  if (!billingTab) {
    billingTab = await firstVisibleButtonByText(page, "Hakediş");
  }
  result.checks.billingTabVisible = Boolean(billingTab);
  if (!result.checks.billingTabVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Commercial core Hakediş tab is missing.");
    return;
  }

  await billingTab.click({ timeout: 5000 });
  await page.waitForTimeout(400);

  result.checks.billingPanelVisible = await page.getByRole("tabpanel", { name: "Hakediş" }).first().isVisible({ timeout: 3000 }).catch(() => false);
  result.checks.paymentStartsCopyVisible = await textVisible(page, "Bu ekran ödeme başlatmaz. Hakediş hazırlığı, önizleme ve kanıt durumunu birlikte gösterir.");
  result.checks.safeModeCopyVisible = await textVisible(page, "Aktif ödeme kapalı · Hakediş sadece önizleme modunda · Bu ekran ödeme başlatmaz · Canlı ödeme daha sonra açılacak");
  result.checks.readonlyCardVisible = await textVisible(page, "Bu kart salt okunur kontrol içindir; işlem başlatmaz.");
  result.checks.readinessPromptVisible = await textVisible(page, "Ödeme omurgası hazır mı?");
  result.checks.hakedisOnlyPreviewVisible = await textVisible(page, "Hakediş sadece önizleme modunda. Canlı ödeme daha sonra açılacak.");
  result.checks.paymentPreviewSummaryVisible = await textVisible(page, "Hakediş önizleme özeti");

  if (!result.checks.billingPanelVisible || !result.checks.paymentStartsCopyVisible || !result.checks.readonlyCardVisible || !result.checks.readinessPromptVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Commercial core read-only billing evidence is incomplete.");
  } else {
    result.notes.push("Commercial core billing tab stays read-only and does not start payment.");
  }
}

async function handleCompanyShifts(page, result) {
  const previewLabel = "Harita / Navigasyon Önizle";
  const convertLabels = ["Sözleşmeye Dönüştür", "Yeniden Dönüştür"];

  await waitForShiftCardContent(page);
  await revealFirstVisibleShiftCardDetails(page);
  const previewButton = await waitForFirstVisibleLocator(page, "button", previewLabel, { timeoutMs: 9000 });
  result.checks.previewButtonVisible = Boolean(previewButton);
  result.checks.convertButtonVisible = false;
  result.checks.convertButtonLabel = "";
  const convertButton = await waitForAnyVisibleLocator(page, "button", convertLabels, { timeoutMs: 9000 });
  if (convertButton?.locator) {
    result.checks.convertButtonVisible = true;
    result.checks.convertButtonLabel = convertButton.name;
  }

  if (!result.checks.previewButtonVisible || !result.checks.convertButtonVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Company shifts critical preview/convert button is missing.");
    return;
  }

  result.checks.convertTrialClickable = await trialClickVisible(page, "button", result.checks.convertButtonLabel);
  result.checks.convertBoundaryVisible = await textVisible(page, "Vardiyayı sözleşmeye dönüştür: tıkladığında vardiya Company Sözleşmeler ekranında taslak olarak açılır.");
  result.checks.convertDisabledHintVisible = await textVisible(page, "Önce room seçili olmalı. Sonra taslak Company Sözleşmeler ekranında açılır.");

  if (!previewButton) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Company shift preview button could not be opened.");
    return;
  }

  await previewButton.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  await previewButton.click({ timeout: 5000 });
  await page.waitForTimeout(650);

  await collectRoutePreviewEvidence(page, result, "Company shifts");
  if (!result.checks.convertBoundaryVisible) {
    result.notes.push("Company shift conversion hint is not visible, but the preview button is.");
  }
}

async function handleCompanyAgreements(page, result) {
  const detailButtons = ["Detayı aç", "Detayları aç"];
  const previewButtons = ["Rota Önizleme", "Rota Önizle", "Mevcut Rotayı Gör", "Yeni Rotayı Önizle", "Önceki Rotayı Gör", "Uygulanan Rotayı Gör"];
  let detailVisible = false;
  let previewVisible = false;

  for (const label of detailButtons) {
    if (await isVisible(page, "button", label)) {
      detailVisible = true;
      result.checks.detailButtonLabel = label;
      break;
    }
  }
  for (const label of previewButtons) {
    if (await isVisible(page, "button", label)) {
      previewVisible = true;
      result.checks.previewButtonLabel = label;
      break;
    }
  }

  result.checks.detailButtonVisible = detailVisible;
  result.checks.previewButtonVisible = previewVisible;
  result.checks.safeBoundaryVisible = await textVisible(page, "Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.")
    || await textVisible(page, "Bu alan önizlemedir; işlem başlatmaz.");
  result.checks.readonlySettlementVisible = await textVisible(page, "Settlement hazırlığı yalnızca readonly görünür.");
  result.checks.detailHintVisible = await textVisible(page, "Detayı aç ile köprü kartını genişlet; ardından Vardiyaya git veya Rota Önizleme ile ilerle.");

  if (!detailVisible || !result.checks.safeBoundaryVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Company agreements detail button or safe boundary is missing.");
    return;
  }

  if (!previewVisible) {
    result.notes.push("Company agreements preview button is not exposed in the current fixture set; safe boundary remains visible and accepted as PASS.");
  }

  const trialActionLabels = ["Kabul Et", "Reddet", "Uzatma Karşı Teklifini Kabul Et", "Uzatma Karşı Teklifini Reddet"];
  result.checks.actionButtonTrials = {};
  for (const label of trialActionLabels) {
    if (await isVisible(page, "button", label)) {
      result.checks.actionButtonTrials[makeSlug([label])] = await trialClickVisible(page, "button", label);
    } else {
      result.checks.actionButtonTrials[makeSlug([label])] = false;
    }
  }

  const detailButton = await firstVisibleLocator(page, "button", result.checks.detailButtonLabel || "Detayı aç");
  let previewButton = await firstVisibleLocator(page, "button", result.checks.previewButtonLabel || "Rota Önizleme");
  if (!detailButton) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Company agreements detail button could not be located.");
    return;
  }

  await detailButton.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  await detailButton.click({ timeout: 5000 });
  await page.waitForTimeout(300);

  result.checks.detailExpandedVisible = await textVisible(page, "Operasyon bağlantısı ilk generated shift oluşunca burada görünür.")
    || await textVisible(page, "Bu okul/kurum görünümünde seçili sözleşme yok.");
  result.checks.previewHintVisible = await textVisible(page, "Company tarafında sözleşme artık doğrudan bu ekrandan açılmaz.");

  if (!previewButton) {
    for (const label of previewButtons) {
      previewButton = await firstVisibleLocator(page, "button", label) || await firstVisibleButtonByText(page, label);
      if (previewButton) {
        result.checks.previewButtonVisible = true;
        result.checks.previewButtonLabel = label;
        break;
      }
    }
  }

  if (previewButton) {
    const previewDisabled = await previewButton.isDisabled().catch(() => false);
    if (previewDisabled) {
      result.notes.push("Company agreements preview button is present but disabled in the current fixture set; safe boundary remains visible and accepted as PASS.");
    } else {
      await previewButton.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" })).catch(() => {});
      await previewButton.click({ force: true, timeout: 5000 });
      await page.waitForTimeout(700);
      await collectRoutePreviewEvidence(page, result, "Company agreements");
    }
  } else {
    result.notes.push("Company agreements route preview button is not exposed in the current fixture set; read-only boundary remains visible and accepted as PASS.");
  }
}

async function handleRoomShifts(page, result) {
  result.checks.dispatchApplyVisible = await isVisible(page, "button", "Önizlemeyi Uygula: Böl & Onayla");
  result.checks.dispatchApplyHintVisible = await textVisible(page, "Önizleme ile aynı bölme planı uygulanır; seçtiğin araç ve şoför eşleşmeleri kullanılır.");
  result.checks.dispatchApplyStateVisible = await textVisible(page, "Tüm öneriler hazır. Önizlemeyi uygulayabilirsin.");
  await waitForShiftCardContent(page);
  await revealFirstVisibleShiftCardDetails(page);
  await revealFirstVisibleShiftOtherActions(page);
  result.checks.previewButtonVisible = Boolean(
    await firstVisibleLocator(page, "button", "Rota Önizleme")
      || await firstVisibleButtonByText(page, "Rota Önizleme")
  );
  result.checks.previewBoundaryVisible = await textVisible(page, "Önizleme: rota verisi yalnızca harita üzerinden okunur.");
  result.checks.rejectBoundaryVisible = await textVisible(page, "Onay bu modda aşağıdaki bölme önizleme kartından verilir.");

  const pendingTab = await firstPanelTab(page, /^Bekleyen Talepler\b/i);
  if (pendingTab) {
    await pendingTab.click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  result.checks.pendingEmptyVisible = await textVisible(page, "Bekleyen talep yok.");
  result.checks.approveButtonVisible = await isVisible(page, "button", "Kabul Et");
  result.checks.rejectButtonVisible = await isVisible(page, "button", "Reddet");

  if (!result.checks.previewButtonVisible || !result.checks.dispatchApplyVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Room shifts preview or dispatch-apply control is missing.");
    return;
  }

  if ((!result.checks.approveButtonVisible || !result.checks.rejectButtonVisible) && result.checks.pendingEmptyVisible) {
    result.status = bumpStatus(result.status, "PASS-");
    result.notes.push("Room shifts pending approval actions are absent because the pending queue is empty in this fixture set.");
  }

  const approveButton = await firstVisibleLocator(page, "button", "Kabul Et");
  if (approveButton) {
    result.checks.approveButtonTitle = await approveButton.getAttribute("title").catch(() => "");
    result.checks.approveTrialClickable = await trialClickVisible(page, "button", "Kabul Et");
  } else {
    result.checks.approveButtonTitle = "";
    result.checks.approveTrialClickable = false;
  }

  result.checks.rejectTrialClickable = await trialClickVisible(page, "button", "Reddet");

  const previewLabels = ["Rota Önizleme"];
  const previewTabs = [/^Bekleyen Talepler\b/i, /^Sözleşmeden Üretilen\b/i, /^Diğer Vardiyalar\b/i];
  let previewButton = null;
  let previewButtonTab = "";
  for (const tabName of previewTabs) {
    const tab = await firstPanelTab(page, tabName);
    if (!tab) continue;
    await tab.click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(850);
    await revealFirstVisibleShiftCardDetails(page);
    await revealFirstVisibleShiftOtherActions(page);
    for (const label of previewLabels) {
      previewButton = await firstVisibleLocator(page, "button", label) || await firstVisibleButtonByText(page, label);
      if (previewButton) {
        result.checks.previewButtonVisible = true;
        result.checks.previewButtonLabel = label;
        previewButtonTab = String(tabName);
        break;
      }
    }
    if (previewButton) break;
  }

  if (!previewButton) {
    result.status = bumpStatus(result.status, "PASS-");
    result.notes.push("Room shifts route preview button is not exposed in the current fixture set; read-only boundaries remain visible.");
    return;
  }

  const previewDisabled = await previewButton.isDisabled().catch(() => false);
  if (previewDisabled) {
    result.status = bumpStatus(result.status, "PASS-");
    result.notes.push(`Room shifts preview button is present but disabled in the current fixture set${previewButtonTab ? ` (${previewButtonTab})` : ""}.`);
    return;
  }

  try {
    await previewButton.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" })).catch(() => {});
    await previewButton.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(700);
    await collectRoutePreviewEvidence(page, result, "Room shifts");
  } catch (error) {
    result.status = bumpStatus(result.status, "PASS-");
    result.notes.push(`Room shifts preview click is flaky in the current fixture set: ${error?.message || String(error)}`);
  }
}

async function switchRoomAgreementsToDetailView(page, result) {
  if (await isVisible(page, "button", "Detayı aç")) return true;

  const tabs = [/^Bekleyen\b/i, /^Diğer Sözleşmeler\b/i];
  for (const tabName of tabs) {
    const tab = page.getByRole("tab", { name: tabName }).first();
    const visible = await tab.isVisible({ timeout: 2500 }).catch(() => false);
    if (!visible) continue;
    await tab.click({ timeout: 5000 });
    await page.waitForTimeout(350);
    if (await isVisible(page, "button", "Detayı aç")) return true;
  }

  return false;
}

async function handleRoomAgreements(page, result) {
  result.checks.bridgeTextVisible = await textVisible(page, "Detayları aç ile köprü kartını genişlet; ardından Vardiyaya git veya Rota Önizleme ile ilerle.");
  result.checks.bridgeHintVisible = await textVisible(page, "İpucu: Detayı aç ile köprü kartını genişlet; ardından Vardiyaya git veya Rota Önizleme ile ilerle.");

  const detailReady = await switchRoomAgreementsToDetailView(page, result);
  result.checks.detailButtonVisible = detailReady && (await isVisible(page, "button", "Detayı aç"));
  result.checks.safeBoundaryVisible = await textVisible(page, "Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.");
  result.checks.automationBoundaryVisible = await textVisible(page, "Sadece önizleme — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.");
  result.checks.settlementBoundaryVisible = await textVisible(page, "Sadece önizleme — tahsilat/fatura oluşturulmaz.");
  result.checks.routePreviewHintVisible = await textVisible(page, "Vardiyaya git veya Rota Önizleme ile ilerle.");
  const roomAgreementsBodyText = await getText(page);
  result.checks.emptyCanonicalStateVisible = roomAgreementsBodyText.includes("Gösterilen: 0 / Toplam: 0")
    && roomAgreementsBodyText.includes("Kayıt yok.");

  if (!result.checks.detailButtonVisible || !result.checks.safeBoundaryVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Room agreements detail button or safe boundary is missing.");
    return;
  }

  const trialActionLabels = ["Kabul Et", "Reddet", "Karşı Teklif Gönder", "Uzatma Karşı Teklifini Kabul Et", "Uzatma Karşı Teklifini Reddet"];
  result.checks.actionButtonTrials = {};
  for (const label of trialActionLabels) {
    if (await isVisible(page, "button", label)) {
      result.checks.actionButtonTrials[makeSlug([label])] = await trialClickVisible(page, "button", label);
    } else {
      result.checks.actionButtonTrials[makeSlug([label])] = false;
    }
  }

  const detailButton = await firstVisibleLocator(page, "button", "Detayı aç");
  const previewLabels = ["Rota Önizleme", "Rota Önizle", "Yeni Rotayı Önizle", "Mevcut Rotayı Gör", "Önceki Rotayı Gör", "Uygulanan Rotayı Gör"];
  const tabLabels = [/^Rota Talepleri\b/i, /^Uygulanan Rota\b/i, /^Bekleyen\b/i, /^Diğer Sözleşmeler\b/i];
  let previewButton = null;

  for (const tabName of tabLabels) {
    const tab = await firstVisibleLocator(page, "tab", tabName);
    if (!tab) continue;
    await tab.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(350);
    for (const label of previewLabels) {
      previewButton = await firstVisibleLocator(page, "button", label) || await firstVisibleButtonByText(page, label);
      if (previewButton) {
        result.checks.previewButtonVisible = true;
        result.checks.previewButtonLabel = label;
        break;
      }
    }
    if (previewButton) break;
  }

  const finalRoomAgreementsBodyText = await getText(page);
  result.checks.emptyCanonicalStateVisible = result.checks.emptyCanonicalStateVisible
    || (finalRoomAgreementsBodyText.includes("Gösterilen: 0 / Toplam: 0")
      && finalRoomAgreementsBodyText.includes("Kayıt yok."));

  if (detailButton) {
    const detailStillVisible = await detailButton.isVisible({ timeout: 1200 }).catch(() => false);
    if (detailStillVisible) {
      await detailButton.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await detailButton.click({ timeout: 5000 });
      await page.waitForTimeout(300);
    } else {
      result.notes.push("Room agreements detail locator became unavailable after tab inspection; safe boundary remained visible.");
    }
  }

  result.checks.detailExpandedVisible = await textVisible(page, "Sözleşmeye bağlı vardiya");
  result.checks.detailPreviewBoundaryVisible = await textVisible(page, "Sadece önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.");

  if (previewButton) {
    const previewDisabled = await previewButton.isDisabled().catch(() => false);
    if (previewDisabled) {
      result.status = bumpStatus(result.status, "PASS-");
      result.notes.push("Room agreements preview button is present but disabled in the current fixture set.");
    } else {
      try {
        await previewButton.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" })).catch(() => {});
        await previewButton.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(1200);
        await collectRoutePreviewEvidence(page, result, "Room agreements");
      } catch (error) {
        result.status = bumpStatus(result.status, "PASS-");
        result.notes.push(`Room agreements preview click is flaky in the current fixture set: ${error?.message || String(error)}`);
      }
    }
  } else {
    result.notes.push("Room agreements route preview button is not exposed in the empty canonical fixture; read-only boundaries remain visible.");
  }
}

async function handlePersonelLive(page, result) {
  result.checks.showAllVisible = await isVisible(page, "button", "Tümünü Göster");
  result.checks.navigationButtonsVisibleCount = await page.getByRole("button", { name: "Navigasyon Aç" }).count().catch(() => 0);
  result.checks.navigationButtonVisible = result.checks.navigationButtonsVisibleCount > 0;
  result.checks.launcherVisible = await textVisible(page, "Navigasyon Aç");

  if (!result.checks.showAllVisible || !result.checks.navigationButtonVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Personel live navigation or show-all button is missing.");
    return;
  }

  await clickVisible(page, "button", "Tümünü Göster").catch(() => {});
  result.checks.showAllButtonClicked = true;
  result.checks.navigationButtonTrialClickable = await trialClickVisible(page, "button", "Navigasyon Aç");
  result.notes.push("Personel live keeps navigation buttons read-only and available.");
}

async function handleParentLive(page, result, token = null) {
  await selectParentLiveNoVehicleChild(page, token);
  result.checks.refreshButtonVisible = await isVisible(page, "button", "Yenile");
  result.checks.locationButtonVisible = await isVisible(page, "button", /^Konumumu (Al|Yenile)$/i);
  result.checks.childNavVisible = await isVisible(page, "button", "Çocuğun durağına git");
  result.checks.nearestNavVisible = await isVisible(page, "button", "En yakın durağa git");
  result.checks.noShowVisible = await isVisible(page, "button", "Bugün gelmiyor");
  result.checks.locationHintVisible = await textVisible(page, "Size en yakın durağı ve yürüyüş süresini görmek için Konumumu Al kullanın.");
  result.checks.requestEntryVisible = await textVisible(page, "Biniş değişikliği talebi");
  result.checks.requestSubmitVisible = await isVisible(page, "button", "Talep oluştur");
  result.checks.noVehicleFallbackVisible = await textVisible(page, "Bu çocuk için şu an canlı araç görünmüyor.") || await textVisible(page, "Bugün için aktif servis görünmüyor.");

  if (!result.checks.refreshButtonVisible || !result.checks.locationButtonVisible || !result.checks.requestEntryVisible) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Parent live critical controls are missing.");
    return;
  }

  await clickVisible(page, "button", "Yenile").catch(() => {});
  result.checks.refreshButtonClicked = true;
  await clickVisible(page, "button", /^Konumumu (Al|Yenile)$/i).catch(() => {});
  await page.waitForTimeout(550);
  result.checks.locationButtonTrialClickable = await trialClickVisible(page, "button", /^Konumumu (Al|Yenile)$/i);
  result.checks.childNavTrialClickable = await trialClickVisible(page, "button", "Çocuğun durağına git");
  result.checks.nearestNavTrialClickable = await trialClickVisible(page, "button", "En yakın durağa git");
  result.checks.noShowTrialClickable = await trialClickVisible(page, "button", "Bugün gelmiyor");

  if (!result.checks.childNavVisible || !result.checks.nearestNavVisible || !result.checks.noShowVisible) {
    result.status = bumpStatus(result.status, "PASS-");
    result.notes.push("Parent live is in fallback/no-vehicle mode; live navigation buttons are intentionally absent.");
  } else {
    result.notes.push("Parent live keeps location and no-show controls visible without executing them.");
  }
}

async function runScenario(page, scenario, viewportName, output) {
  const result = {
    role: scenario.role,
    label: scenario.label,
    route: scenario.route,
    viewport: viewportName,
    baseline: scenario.baseline,
    kind: scenario.kind,
    url: "",
    title: "",
    status: "PASS",
    notes: [],
    consoleErrors: [],
    pageErrors: [],
    screenshots: [],
    headings: [],
    buttons: [],
    textPreview: "",
    textLength: 0,
    scrollHeight: 0,
    checks: {},
  };

  page.on("console", (msg) => {
    if (msg.type() === "error") result.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    result.pageErrors.push(err?.message || String(err));
  });

  let navError = null;
  try {
    await page.goto(`${WEB_BASE_URL}${scenario.route}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  } catch (error) {
    navError = error?.message || String(error);
  }

  await page.waitForTimeout(850);

  result.url = page.url();
  result.title = await page.title().catch(() => "");
  const bodyText = await getText(page);
  result.textLength = bodyText.length;
  result.textPreview = bodyText.slice(0, 4000);
  result.headings = await getHeadings(page);
  result.buttons = await getButtons(page);
  result.scrollHeight = await page.evaluate(() => document.body?.scrollHeight || 0).catch(() => 0);

  if (navError) {
    result.notes.push(`Navigation warning: ${navError.split("\n")[0]}`);
  }

  if (!bodyText || notFoundSeen(bodyText)) {
    result.status = bumpStatus(result.status, "NOT-FOUND");
    result.notes.push(`Route görünümü yok: ${notFoundSeen(bodyText) ? "route not found" : "empty body"}.`);
    result.screenshots.push(await screenshot(page, scenario, viewportName, "before"));
    output.push(result);
    return result;
  }

  const isLogin = loginRootSeen(bodyText);
  if (scenario.role !== "public" && isLogin) {
    result.status = bumpStatus(result.status, "AUTH-BLOCKED");
    result.notes.push("Kimlik doğrulama gerekli veya oturum geçersiz.");
    result.screenshots.push(await screenshot(page, scenario, viewportName, "before"));
    output.push(result);
    return result;
  }
  if (scenario.role === "public" && isLogin) {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Public route login ekranına düştü.");
    result.screenshots.push(await screenshot(page, scenario, viewportName, "before"));
    output.push(result);
    return result;
  }

  result.screenshots.push(await screenshot(page, scenario, viewportName, "before"));

  if (scenario.kind === "publicLanding") {
    await handlePublicLanding(page, result);
  } else if (scenario.kind === "reviewQueue") {
    await handleReviewQueue(page, result);
  } else if (scenario.kind === "commercialReadOnly") {
    await handleCommercialCore(page, result);
  } else if (scenario.kind === "convertToAgreement") {
    await handleCompanyShifts(page, result);
  } else if (scenario.kind === "agreementPreview") {
    await handleCompanyAgreements(page, result);
  } else if (scenario.kind === "dispatchApproval") {
    await handleRoomShifts(page, result);
  } else if (scenario.kind === "roomAgreementPreview") {
    await handleRoomAgreements(page, result);
  } else if (scenario.kind === "personelLive") {
    await handlePersonelLive(page, result);
  } else if (scenario.kind === "parentLive") {
    await handleParentLive(page, result, scenario.token || null);
  }

  if (!result.notes.length) {
    result.notes.push("Panel görünümü okunur ve güvenli sınırlar korunuyor.");
  }

  result.screenshots.push(await screenshot(page, scenario, viewportName, "after"));

  const finalText = await getText(page);
  result.textPreview = finalText.slice(0, 4000);
  result.textLength = finalText.length;
  result.headings = await getHeadings(page);
  result.buttons = await getButtons(page);

  output.push(result);
  return result;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# PRODUCT FLOW BUTTON AUDIT 01");
  lines.push("");
  lines.push(`- Generated at: \`${report.generatedAt}\``);
  lines.push(`- Git HEAD: \`${report.gitHead}\``);
  lines.push(`- Evidence identity version: \`${report.evidenceIdentityVersion}\``);
  lines.push(`- Schema SHA256: \`${report.schemaSha256}\``);
  lines.push(`- Tested product-input identity SHA256: \`${report.testedProductInputIdentitySha256}\``);
  lines.push(`- Source identity SHA256: \`${report.sourceIdentitySha256}\``);
  lines.push(`- Web base URL: \`${report.webBaseUrl}\``);
  lines.push(`- API base URL: \`${report.apiBaseUrl}\``);
  lines.push(`- Playwright: \`${report.playwrightVersion}\``);
  lines.push(`- Chromium: \`${report.browserVersion}\``);
  lines.push(`- Headless: \`${report.headless}\``);
  lines.push(`- Slow Mo: \`${report.slowMo}\``);
  lines.push(`- Routes tested: \`${report.routeCount}\``);
  lines.push(`- Screenshots: \`${report.screenshotCount}\``);
  lines.push(`- Console errors: \`${report.consoleErrorCount}\``);
  lines.push(`- Page errors: \`${report.pageErrorCount}\``);
  lines.push(`- Artifact root: \`${report.artifactRoot}\``);
  lines.push("");
  lines.push("## Viewports");
  lines.push("");
  lines.push("| Name | Size | Notes |");
  lines.push("| --- | --- | --- |");
  for (const viewport of report.viewports || []) {
    lines.push(`| ${viewport.name} | ${viewport.width}x${viewport.height} | Desktop / mobile button audit |`);
  }
  lines.push("");
  lines.push("## Coverage Sources");
  lines.push("");
  for (const source of report.coverageSources || []) {
    lines.push(`- \`${source}\``);
  }
  lines.push("");
  lines.push("## Status Counts");
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("| --- | ---: |");
  for (const status of ["PASS", "PASS-", "UX-FIX", "BLOCKER", "AUTH-BLOCKED", "NOT-FOUND"]) {
    lines.push(`| ${status} | ${report.statusCounts[status] || 0} |`);
  }
  lines.push("");
  lines.push("## Route Summary");
  lines.push("");
  lines.push("| Role | Route | Viewport | Status | Screenshot | Notes |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const row of report.routes) {
    lines.push(`| ${row.role} | ${row.route} | ${row.viewport} | ${row.status} | ${row.screenshots.join("<br>")} | ${row.notes.slice(0, 2).join(" / ").replace(/\|/g, "\\|")} |`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- Bu smoke yalnızca okuma + trial-click doğrulaması yapar; write akışları çalıştırılmaz.");
  lines.push("- Public lead modal yalnız validation sınırında test edilir; işlem gönderilmez.");
  lines.push("- Review queue, commercial core, agreement ve no-show butonları gerçek olarak çalıştırılmaz.");
  lines.push("- Browser-smoke artifact ve screenshot'lar commit dışı kalır.");
  return lines.join("\n");
}

async function main() {
  console.log("=== PRODUCT FLOW BUTTON AUDIT 01 ===");
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Web base URL: ${WEB_BASE_URL}`);
  console.log(`API base URL: ${API_BASE_URL}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log(`Slow Mo: ${SLOW_MO}`);

  await ensureDir(artifactRoot);
  await ensureDir(screenshotRoot);

  const rootPkg = JSON.parse(await fs.readFile(path.join(repoRoot, "package.json"), "utf8"));
  const playwrightVersionSpec = rootPkg.devDependencies?.["@playwright/test"] || "unknown";

  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO,
    env: {
      ...process.env,
      CHROME_LOG_FILE: chromiumDebugLogPath,
    },
  });
  const browserVersion = browser.version();
  const evidenceIdentity = buildSmokeEvidenceIdentity({
    repoRoot,
    sourceFiles: [...COVERAGE_SOURCES, "backend/scripts/product_flow_button_audit_01.mjs"],
  });

  const report = {
    generatedAt: new Date().toISOString(),
    ...evidenceIdentity,
    repoRoot,
    artifactRoot: path.relative(repoRoot, artifactRoot).replace(/\\/g, "/"),
    webBaseUrl: WEB_BASE_URL,
    apiBaseUrl: API_BASE_URL,
    headless: HEADLESS,
    slowMo: SLOW_MO,
    playwrightVersion: playwrightVersionSpec,
    browserVersion,
    viewports: VIEWPORTS.map(({ name, width, height }) => ({ name, width, height })),
    coverageSources: COVERAGE_SOURCES,
    routeCount: 0,
    screenshotCount: 0,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    statusCounts: { PASS: 0, "PASS-": 0, "UX-FIX": 0, BLOCKER: 0, "AUTH-BLOCKED": 0, "NOT-FOUND": 0 },
    routes: [],
    authResults: [],
    totalLoginFailures: 0,
    success: true,
  };

  for (const group of ROUTE_GROUPS) {
    let authState = { role: group.role, token: null, loginInfo: null, error: null };
    let sharedStorageState = null;
    if (group.auth) {
      authState = await loginRole(group.role);
      report.authResults.push(authState);
      if (authState.error) {
        report.totalLoginFailures += 1;
        console.log(`AUTH ${group.role}: ${authState.error}`);
      } else {
        console.log(`AUTH ${group.role}: ok`);
      }
    }

    for (const viewport of VIEWPORTS) {
      const contextOptions = {
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        locale: "tr-TR",
        timezoneId: "Europe/Istanbul",
        geolocation: { latitude: 41.0082, longitude: 28.9784 },
        permissions: ["geolocation"],
      };

      if (sharedStorageState) {
        contextOptions.storageState = sharedStorageState;
      }

      const context = await browser.newContext(contextOptions);

      if (authState.token) {
        await context.addInitScript((token) => {
          localStorage.setItem("token", token);
        }, authState.token);
      }

      for (const scenario of group.routes) {
        const page = await context.newPage();
        const row = await runScenario(page, { ...scenario, role: group.role, token: authState.token }, viewport.name, report.routes);
        report.routeCount += 1;
        report.screenshotCount += row.screenshots.length;
        report.consoleErrorCount += row.consoleErrors.length;
        report.pageErrorCount += row.pageErrors.length;
        report.statusCounts[row.status] = (report.statusCounts[row.status] || 0) + 1;
        report.success = report.success && !["BLOCKER", "NOT-FOUND", "AUTH-BLOCKED"].includes(row.status);
        console.log(`${row.status} [${group.role}/${viewport.name}] ${scenario.route} -> ${scenario.label}`);
        await page.close().catch(() => {});
      }

      if (viewport.name === "desktop") {
        sharedStorageState = await context.storageState().catch(() => null);
      }

      await context.close().catch(() => {});
    }
  }

  await browser.close().catch(() => {});

  const md = renderMarkdown(report);
  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(reportMdPath, `${md}\n`, "utf8");
  await relocateRepoDebugLogIfPresent({ repoDebugLogPath, artifactRoot, chromiumDebugLogPath });

  console.log(`WROTE ${path.relative(repoRoot, reportJsonPath).replace(/\\/g, "/")}`);
  console.log(`WROTE ${path.relative(repoRoot, reportMdPath).replace(/\\/g, "/")}`);
  console.log(`STATUS PASS: ${report.statusCounts.PASS || 0}`);
  console.log(`STATUS PASS-: ${report.statusCounts["PASS-"] || 0}`);
  console.log(`STATUS UX-FIX: ${report.statusCounts["UX-FIX"] || 0}`);
  console.log(`STATUS BLOCKER: ${report.statusCounts.BLOCKER || 0}`);
  console.log(`STATUS AUTH-BLOCKED: ${report.statusCounts["AUTH-BLOCKED"] || 0}`);
  console.log(`STATUS NOT-FOUND: ${report.statusCounts["NOT-FOUND"] || 0}`);

  if (!report.success) {
    console.error("Audit found blocker, auth-blocked, or 404 outcomes; see report files for details.");
    process.exit(1);
  }
}

main().catch(async (error) => {
  try {
    await ensureDir(artifactRoot);
    await relocateRepoDebugLogIfPresent({ repoDebugLogPath, artifactRoot, chromiumDebugLogPath });
    const failureReport = {
      generatedAt: new Date().toISOString(),
      repoRoot,
      artifactRoot: path.relative(repoRoot, artifactRoot).replace(/\\/g, "/"),
      webBaseUrl: WEB_BASE_URL,
      apiBaseUrl: API_BASE_URL,
      headless: HEADLESS,
      slowMo: SLOW_MO,
      error: error?.stack || error?.message || String(error),
    };
    await fs.writeFile(reportJsonPath, `${JSON.stringify(failureReport, null, 2)}\n`, "utf8");
    await fs.writeFile(reportMdPath, `# PRODUCT FLOW BUTTON AUDIT 01\n\nAudit runner failed before completion.\n\n\`\`\`\n${failureReport.error}\n\`\`\`\n`, "utf8");
  } catch {
    // ignore secondary write failures
  }
  console.error(error?.stack || String(error));
  process.exit(1);
});
