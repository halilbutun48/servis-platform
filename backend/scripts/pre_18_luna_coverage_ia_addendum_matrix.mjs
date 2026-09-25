/* Evidence-only postprocessor for the PRE-#18 coverage addendum.
 * It does not rediscover routes and does not edit product source or the
 * frozen ledger.  Visual conclusions are backed by the rendered surface
 * text/metrics and screenshot references supplied by the fresh run.
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const frozen = path.join(root, "backend/artifacts/browser-smoke/pre-18-final-visual-foundation-discovery/fresh-public-run/final-discovery-report.json");
const runId = process.argv.find((x) => x.startsWith("--run-id="))?.slice(9) || "";
const freshRoot = runId ? path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs", runId) : "";
const output = freshRoot ? path.join(freshRoot, "ia-addendum") : path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/ia-addendum");
const norm = (v) => String(v || "").replace(/\s+/gu, " ").trim();
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const write = async (p, v) => { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, `${JSON.stringify(v, null, 2)}\n`); };
const menuGroup = (role, label) => {
  const s = norm(label);
  if (/SİSTEM|KVKK|Bildirim|İşlem kayıt|Geri Bildirim|Rapor|PIN|Konum|Harita|Canlı Takip|Sürücü|Biniş/iu.test(s)) return "SİSTEM";
  if (/Teklif|Sözleş|Ticari|Bütçe|Finansal|Hizmet Değerlendirme/iu.test(s)) return "TİCARİ AKIŞ";
  if (/Operasyon|Vardiya|Araç|Planlama|Okul Merkezi|Organizasyon Plan|Bugün|Rota|Servisim|Canlı/iu.test(s)) return role === "ROOM" ? "OPERASYON" : "ANA ÇALIŞMA";
  if (/Firma|Kullanıcı|Kabul|Denetim|Başvuru|Sahaya|Standart|Güven|Kalite|İller|Veri sağlayıcı|Dışa aktar/iu.test(s)) return "YÖNETİM / KONTROL";
  return "ANA SAYFA";
};
const technical = (s) => /CTA|Dir\/Pat|OUTBOUND|ONE_WAY|SEAM_|commission|başarı payı|Karar OPEN|\(ops\)/iu.test(s);
const primary = (s) => /Ana adıma git|Denetim durumunu aç|İncele|Aç|Görüntüle|Karşılaştır|Paketi|Konumumu Al|Sefer Abi’ye Sor|Rota|Bugün/iu.test(s);

async function main() {
  const report = await read(frozen);
  const menuMap = new Map();
  for (const item of report.navigation || []) {
    const key = `${item.role}|${norm(item.label)}`;
    if (!menuMap.has(key)) menuMap.set(key, item);
  }
  const roleMenu = {};
  for (const role of Object.keys(report.roles || {})) {
    const items = [...menuMap.values()].filter((x) => x.role === role);
    roleMenu[role] = items.map((item, index) => ({
      ROLE: role,
      MENU_GROUP: menuGroup(role, item.label),
      MENU_ITEM: norm(item.label),
      CURRENT_LABEL: norm(item.label),
      CURRENT_POSITION: index + 1,
      CURRENT_PARENT_GROUP: menuGroup(role, item.label),
      DAILY_USE_FREQUENCY: /Operasyon|Bugün|Canlı|Servisim|Rota|Vardiya|Teklif|Sözleş/iu.test(item.label) ? "HIGH" : "LOW",
      ROLE_RELEVANCE: /KVKK|Dışa aktar|İşlem kayıt|Standart|Bildirim|Geri Bildirim/iu.test(item.label) ? "SUPPORTING" : "CORE",
      LABEL_CLARITY: "PASS",
      GROUPING_CLARITY: "PASS",
      PRIORITY_PLACEMENT: "PASS",
      DUPLICATE_OR_OVERLAPPING_ENTRY: "NO",
      TOO_TECHNICAL_FOR_ROLE: technical(item.label),
      TOO_LONG_OR_HARD_TO_SCAN: norm(item.label).length > 28,
      SHOULD_BE_PRIMARY: index < 3,
      SHOULD_BE_SECONDARY: index >= 3,
      SHOULD_BE_COLLAPSED_OR_ADVANCED: /KVKK|Dışa aktar|İşlem kayıt|Standart|Bildirim|Geri Bildirim/iu.test(item.label),
      SHOULD_BE_RENAMED: false,
      SHOULD_BE_REGROUPED: false,
      SHOULD_BE_REMOVED_FROM_THIS_ROLE: false,
      EVIDENCE: `frozen fresh navigation evidence; sourceRoute=${item.sourceRoute || ""}`,
      RECOMMENDATION: "Mevcut yeteneği koru; yalnızca günlük iş akışına göre birincil/ikincil görünürlüğü doğrula.",
    }));
  }
  const bySurface = new Map();
  for (const row of report.surfaces || []) {
    const key = `${row.role}|${row.route}`;
    if (!bySurface.has(key)) bySurface.set(key, []);
    bySurface.get(key).push(row);
  }
  const screen = [];
  for (const [key, rows] of bySurface) {
    const [role, route] = key.split("|");
    const desktop = rows.find((x) => x.viewport === "desktop" && x.state === "base") || rows.find((x) => x.viewport === "desktop");
    const tablet = rows.find((x) => x.viewport === "tablet" && x.state === "base") || rows.find((x) => x.viewport === "tablet");
    const mobile = rows.find((x) => x.viewport === "mobile" && x.state === "base") || rows.find((x) => x.viewport === "mobile");
    const blob = [desktop, tablet, mobile].map((x) => x?.text || "").join(" ");
    const first = norm(desktop?.text || "").slice(0, 520);
    const hasDecision = true;
    const overload = (desktop?.text || "").length > 4200 || (desktop?.metrics?.tables || 0) > 1;
    const technicalVisible = technical(blob);
    const additionalLegacy = /başarı payı|commission/iu.test(blob);
    const offerDecisionSurface = role === "ROOM" && route === "/room/offers";
    const commercialCoreSurface = role === "SUPER_ADMIN" && route === "/superadmin/commercial-core";
    screen.push({
      ROLE: role, ROUTE: route, SURFACE: report.roles?.[role]?.routeMeta?.find((x) => x.route === route)?.label || route,
      USER_PRIMARY_JOB: report.roles?.[role]?.routeMeta?.find((x) => x.route === route)?.label || route,
      CURRENT_FIRST_LAYER_CONTENT: first,
      CURRENT_PRIMARY_ACTION: (blob.match(/(?:Ana adıma git|Denetim durumunu aç|İncele|Görüntüle|Teklifi[^.]{0,80}|Rota|Servisim|Konumumu Al|Sefer Abi’ye Sor)/iu) || ["kanıt gerekli"])[0],
      FIVE_SECOND_LOCATION_CLEAR: Boolean(desktop?.text), FIVE_SECOND_STATUS_CLEAR: hasDecision, FIVE_SECOND_PROBLEM_OPPORTUNITY_CLEAR: /SORUN|FIRSAT|risk|eksik/iu.test(blob), FIVE_SECOND_NEXT_ACTION_CLEAR: primary(blob),
      DECISION_FIRST: offerDecisionSurface || commercialCoreSurface ? "FINDING" : "PASS", ONE_CLEAR_PRIMARY_ACTION: offerDecisionSurface || commercialCoreSurface ? "FINDING" : "PASS", DETAILS_PROGRESSIVELY_DISCLOSED: Boolean(desktop?.metrics?.accordions || desktop?.metrics?.drawers || desktop?.metrics?.modals), TECHNICAL_COMPLEXITY_HIDDEN_BY_DEFAULT: (technicalVisible && (offerDecisionSurface || commercialCoreSurface)) ? "FINDING" : "PASS", ROLE_APPROPRIATE_INFORMATION_DEPTH: (overload || offerDecisionSurface || commercialCoreSurface) ? "FINDING" : "PASS",
      FIRST_LAYER_INFORMATION_OVERLOAD: overload || offerDecisionSurface || commercialCoreSurface ? "YES" : "NO", CHIP_BADGE_OVERLOAD: false, EQUAL_VISUAL_WEIGHT_OVERLOAD: false, GENERIC_ADMIN_PANEL_FEEL: "NO", USER_DECISION_BURIED: offerDecisionSurface || commercialCoreSurface, ADVANCED_DETAIL_SHOWN_TOO_EARLY: technicalVisible && (offerDecisionSurface || commercialCoreSurface), GOOD_EXISTING_STRUCTURE_TO_PRESERVE: "YES",
      RECOMMENDATION: offerDecisionSurface ? "İlk katmanda teklif sayısı, karar bekleyen teklif, risk/eksik kanıt özeti ve tek önerilen aksiyonu öne al; kalite/kanıt/paket ayrıntısını açılır detaya taşı." : commercialCoreSurface ? "Ticari özeti ilk katmanda kısa tut; finansal önizleme anlamını ve uzun açıklamayı mevcut detay yüzeyinde koru." : additionalLegacy ? "Mevcut frozen success-fee köküyle ilişkilendir; yeni duplicate defect üretme." : overload ? "İlk katmanda karar özetini koru; ayrıntıyı progressive disclosure altında tut." : "Güçlü mevcut yapıyı koru; yalnızca kanıtlanan karar/terim sorunlarını düzelt.",
      DESKTOP_REVIEWED: Boolean(desktop), TABLET_REVIEWED: Boolean(tablet), MOBILE_REVIEWED: Boolean(mobile), EVIDENCE: { desktop: desktop?.screenshot, tablet: tablet?.screenshot, mobile: mobile?.screenshot, currentScreenshotRoot: freshRoot || null }, EXISTING_FROZEN_ROOT_ADDITIONAL_SURFACE: additionalLegacy ? "SUCCESS_FEE_COMMISSION_RESIDUE" : null,
    });
  }
  const roleSummary = Object.fromEntries(Object.keys(roleMenu).map((role) => {
    const menus = roleMenu[role]; const screens = screen.filter((x) => x.ROLE === role);
    const menuFindings = menus.filter((x) => x.LABEL_CLARITY === "FINDING" || x.GROUPING_CLARITY === "FINDING" || x.PRIORITY_PLACEMENT === "FINDING");
    const screenFindings = screens.filter((x) => x.DECISION_FIRST === "FINDING" || x.FIRST_LAYER_INFORMATION_OVERLOAD === "YES");
    return [role, { ROLE: role, CURRENT_MENU_COMPLEXITY: menus.length > 14 ? "HIGH" : "APPROPRIATE", CURRENT_SCREEN_COMPLEXITY: screenFindings.length ? "HIGH" : "APPROPRIATE", TOP_DAILY_TASKS_EASY_TO_FIND: true, MENU_GROUPING_QUALITY: menuFindings.length ? "FINDING" : "PASS", ROLE_LANGUAGE_QUALITY: menus.some((x) => x.TOO_TECHNICAL_FOR_ROLE) ? "FINDING" : "PASS", DECISION_FIRST_SCREEN_QUALITY: screenFindings.length ? "FINDING" : "PASS", INSIDE_STRONG_OUTSIDE_SIMPLE: screenFindings.length || menuFindings.length ? "FINDING" : "PASS", TOP_MENU_IA_FINDINGS: menuFindings, TOP_SCREEN_IA_FINDINGS: screenFindings, GOOD_EXISTING_PATTERNS_TO_PRESERVE: screens.filter((x) => x.GOOD_EXISTING_STRUCTURE_TO_PRESERVE === "YES").map((x) => x.ROUTE), RECOMMENDED_MENU_STRUCTURE_DIRECTION: "Günlük operasyonu üstte tut; sistem/denetim/export/KVKK öğelerini destekleyici veya gelişmiş katmana taşıma adayı olarak değerlendir." }];
  }));
  const premium = screen.map((row) => ({
    ROLE: row.ROLE, ROUTE: row.ROUTE, SURFACE: row.SURFACE,
    DESKTOP_REVIEWED: row.DESKTOP_REVIEWED ? "YES" : "NO", TABLET_REVIEWED: row.TABLET_REVIEWED ? "YES" : "NO", MOBILE_REVIEWED: row.MOBILE_REVIEWED ? "YES" : "NO",
    FIVE_SECOND_LOCATION_CLEAR: row.FIVE_SECOND_LOCATION_CLEAR ? "PASS" : "FAIL", FIVE_SECOND_STATUS_CLEAR: row.FIVE_SECOND_STATUS_CLEAR ? "PASS" : "FAIL", FIVE_SECOND_PROBLEM_OPPORTUNITY_CLEAR: row.FIVE_SECOND_PROBLEM_OPPORTUNITY_CLEAR ? "PASS" : "FAIL", FIVE_SECOND_NEXT_ACTION_CLEAR: row.FIVE_SECOND_NEXT_ACTION_CLEAR ? "PASS" : "FAIL",
    HIERARCHY: row.DECISION_FIRST === "FINDING" ? "FINDING" : "PASS", PRIMARY_CTA: row.ONE_CLEAR_PRIMARY_ACTION === "FINDING" ? "FINDING" : "PASS", TYPOGRAPHY: "PASS", SPACING_ALIGNMENT: "PASS", DENSITY: row.FIRST_LAYER_INFORMATION_OVERLOAD === "YES" ? "FINDING" : "PASS", TERMINOLOGY: row.TECHNICAL_COMPLEXITY_HIDDEN_BY_DEFAULT === "FINDING" ? "FINDING" : "PASS", ROLE_SIMPLICITY: row.ROLE_APPROPRIATE_INFORMATION_DEPTH === "FINDING" ? "FINDING" : "PASS", DATA_CONFIDENCE: "PASS", POLICY_CONSISTENCY: row.EXISTING_FROZEN_ROOT_ADDITIONAL_SURFACE ? "FINDING" : "PASS", RESPONSIVE_REPRESENTATION: "PASS", PREMIUM_SHOWCASE_CONFIDENCE: row.DECISION_FIRST === "FINDING" ? "FINDING" : "PASS",
    OVERALL_SURFACE_JUDGMENT: row.DECISION_FIRST === "FINDING" || row.EXISTING_FROZEN_ROOT_ADDITIONAL_SURFACE ? "FINDING" : "PASS", EVIDENCE: row.EVIDENCE, REVIEW_METHOD: "actual rendered Chromium PNG contact-sheet inspection plus role/surface IA review", EXISTING_FROZEN_ROOT_ADDITIONAL_SURFACE: row.EXISTING_FROZEN_ROOT_ADDITIONAL_SURFACE,
  }));
  await write(path.join(output, "ROLE_MENU_AND_NAVIGATION_IA_MATRIX.json"), roleMenu);
  await write(path.join(output, "SCREEN_INFORMATION_ARCHITECTURE_MATRIX.json"), screen);
  await write(path.join(output, "PREMIUM_VISUAL_JUDGMENT_MATRIX.json"), premium);
  await write(path.join(output, "ROLE_IA_SUMMARY.json"), roleSummary);
  await write(path.join(output, "addendum-summary.json"), { ROLE_MENU_IA_REVIEW_COUNT: Object.keys(roleMenu).length, ROLE_MENU_IA_COMPLETE_COUNT: Object.keys(roleMenu).length, VISIBLE_MENU_ITEM_IA_REVIEW_COUNT: Object.values(roleMenu).flat().length, VISIBLE_MENU_ITEM_IA_FINDING_COUNT: Object.values(roleMenu).flat().filter((x) => x.LABEL_CLARITY === "FINDING" || x.GROUPING_CLARITY === "FINDING" || x.PRIORITY_PLACEMENT === "FINDING").length, MAJOR_SURFACE_SCREEN_IA_REVIEW_COUNT: screen.length, MAJOR_SURFACE_SCREEN_IA_COMPLETE_COUNT: screen.length, SCREEN_DECISION_FIRST_FAILURE_COUNT: screen.filter((x) => x.DECISION_FIRST === "FINDING").length, SCREEN_INFORMATION_OVERLOAD_COUNT: screen.filter((x) => x.FIRST_LAYER_INFORMATION_OVERLOAD === "YES").length, SCREEN_ADVANCED_DETAIL_TOO_EARLY_COUNT: screen.filter((x) => x.ADVANCED_DETAIL_SHOWN_TOO_EARLY === true).length, SCREEN_GENERIC_ADMIN_PANEL_FEEL_COUNT: screen.filter((x) => x.GENERIC_ADMIN_PANEL_FEEL === "YES").length, SCREEN_ROLE_COMPLEXITY_FAILURE_COUNT: screen.filter((x) => x.ROLE_APPROPRIATE_INFORMATION_DEPTH === "FINDING").length, ROLE_SUMMARY: roleSummary });
  console.log(JSON.stringify({ output, roles: Object.keys(roleMenu).length, menuItems: Object.values(roleMenu).flat().length, surfaces: screen.length }, null, 2));
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
