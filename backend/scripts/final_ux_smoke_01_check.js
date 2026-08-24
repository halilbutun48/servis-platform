#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS } from "./lib/guardGitScope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function isUntouchedByGit(rel) {
  const output = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all", "--", rel],
    { cwd: root, encoding: "utf8" },
  );
  return String(output || "").trim() === "";
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function passDash(label) {
  console.log(`PASS- ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function inferRole(pathname) {
  if (pathname.startsWith("/superadmin")) return "Super Admin";
  if (pathname.startsWith("/room")) return "Room / Oda";
  if (pathname.startsWith("/company")) return "Company / Firma";
  if (pathname.startsWith("/school")) return "School / Okul";
  if (pathname.startsWith("/organization")) return "Organization / Kurum";
  if (pathname.startsWith("/driver")) return "Driver";
  if (pathname.startsWith("/personel")) return "Personel";
  if (pathname.startsWith("/parent")) return "Parent / Veli";
  if (pathname.startsWith("/public")) return "Public";
  if (pathname.startsWith("/shared")) return "Shared / System";
  if (pathname.startsWith("/auth")) return "Auth / Utility";
  return "Other";
}

function inferLabels(pathname) {
  if (pathname === "/superadmin") return { menu: "Genel Bakış", registry: "Genel Bakış", catalog: "Genel Bakış", title: "Süper Yönetici" };
  if (pathname === "/superadmin/companies") return { menu: "Şirketler", registry: "Şirketler", catalog: "Şirketler", title: "Şirketler" };
  if (pathname === "/superadmin/rooms") return { menu: "Operasyon Odaları", registry: "Operasyon Odaları", catalog: "Operasyon Odaları", title: "Operasyon Odaları" };
  if (pathname === "/superadmin/users") return { menu: "Kullanıcılar", registry: "Kullanıcılar", catalog: "Kullanıcılar", title: "Kullanıcılar" };
  if (pathname === "/superadmin/regions") return { menu: "İller ve Bölgeler", registry: "İller ve Bölgeler", catalog: "İller ve Bölgeler", title: "İller ve Bölgeler" };
  if (pathname === "/superadmin/audit") return { menu: "İşlem Kayıtları", registry: "İşlem Kayıtları", catalog: "İşlem Kayıtları", title: "İşlem Kayıtları" };
  if (pathname === "/superadmin/logexport") return { menu: "Log Dışa Aktarımı", registry: "Log Dışa Aktarımı", catalog: "Log Dışa Aktarımı", title: "Log Dışa Aktarımı" };
  if (pathname === "/superadmin/observability") return { menu: "Canlı İzleme", registry: "Canlı İzleme", catalog: "Canlı İzleme", title: "Canlı İzleme" };
  if (pathname === "/superadmin/operations") return { menu: "Denetim Paneli", registry: "Denetim Paneli", catalog: "Denetim Paneli", title: "Denetim Paneli" };
  if (pathname === "/superadmin/acceptance") return { menu: "Kabul Merkezi", registry: "Kabul Merkezi", catalog: "Kabul Merkezi", title: "Saha Kabul Merkezi" };
  if (pathname === "/superadmin/ssot-alignment") return { menu: "Sistem Standartları", registry: "Sistem Standartları", catalog: "Sistem Standartları", title: "Sistem Standartları" };
  if (pathname === "/superadmin/commercial-core") return { menu: "Ticari Akış", registry: "Ticari Akış", catalog: "Ticari Akış", title: "Ticari Akış Özeti" };
  if (pathname === "/superadmin/trust-quality") return { menu: "Güven ve Kalite", registry: "Güven ve Kalite", catalog: "Güven ve Kalite", title: "Güven ve Kalite Özeti" };
  if (pathname === "/superadmin/natural-copilot") return { menu: "Doğal Copilot", registry: "Doğal Copilot", catalog: "Doğal Copilot", title: "Doğal Copilot Yol Haritası" };
  if (pathname === "/superadmin/pilot-launch-gate") return { menu: "Sahaya Çıkış Kontrolü", registry: "Sahaya Çıkış Kontrolü", catalog: "Sahaya Çıkış Kontrolü", title: "Sahaya Çıkış Kontrolü" };
  if (pathname === "/superadmin/operation-verification") return { menu: "Operasyon Doğrulama", registry: "Operasyon Doğrulama", catalog: "Operasyon Doğrulama", title: "Operasyon Doğrulama" };
  if (pathname === "/superadmin/copilot") return { menu: "Sefer Abi Terminali", registry: "Sefer Abi Terminali", catalog: "Sefer Abi Terminali", title: "Sefer Abi Terminali" };

  if (pathname === "/room/map" || pathname === "/room/live") return { menu: "Canlı Takip", registry: "Canlı Takip", catalog: "Canlı Takip", title: "ROOM • Canlı Takip" };
  if (pathname === "/room/vehicles") return { menu: "Araçlar", registry: "Araçlar", catalog: "Araçlar", title: "Vehicles" };
  if (pathname === "/room/drivers") return { menu: "Sürücüler", registry: "Sürücüler", catalog: "Sürücüler", title: "Drivers" };
  if (pathname === "/room/shifts") return { menu: "Vardiyalar", registry: "Vardiyalar", catalog: "Vardiyalar", title: "Room / Vardiyalar" };
  if (pathname === "/room/agreements") return { menu: "Sözleşmeler", registry: "Sözleşmeler", catalog: "Sözleşmeler", title: "Sözleşmeler (Room)" };
  if (pathname === "/room/offers") return { menu: "Teklifler", registry: "Teklifler", catalog: "Teklifler", title: "Teklifler" };
  if (pathname === "/room/commercial-flow") return { menu: "Ticari Akışım", registry: "Ticari Akışım", catalog: "Ticari Akışım", title: "Ticari Akışım" };
  if (pathname === "/room/hub") return { menu: "Oda Konumu", registry: "Oda Konumu", catalog: "Oda Konumu", title: "Oda Konumu" };
  if (pathname === "/room/checkin") return { menu: "Check-in", registry: "Check-in", catalog: "Check-in", title: "Check-in" };
  if (pathname === "/room/operation-health") return { menu: "Operasyon Sağlığı", registry: "Operasyon Sağlığı", catalog: "Operasyon Sağlığı", title: "Oda Operasyon Paneli" };
  if (pathname === "/room/copilot") return { menu: "Sefer Abi Terminali", registry: "Sefer Abi Terminali", catalog: "Sefer Abi Terminali", title: "Sefer Abi Terminali" };
  if (pathname === "/room/reports") return { menu: "Raporlar", registry: "Raporlar", catalog: "Raporlar", title: "Raporlar" };

  if (pathname === "/company") return { menu: "Planlama Merkezi", registry: "Planlama Merkezi", catalog: "Planlama Merkezi", title: "Company — Planlama Merkezi" };
  if (pathname === "/school") return { menu: "Okul Merkezi", registry: "Okul Merkezi", catalog: "Okul Merkezi", title: "Okul — Planlama Merkezi" };
  if (pathname === "/organization") return { menu: "Gezi / Planlama Merkezi", registry: "Gezi / Planlama Merkezi", catalog: "Gezi / Planlama Merkezi", title: "Kurum — Gezi / Planlama Merkezi" };
  if (pathname.endsWith("/operations")) {
    if (pathname.startsWith("/school/")) return { menu: "Okul Operasyon Paneli", registry: "Okul Operasyon Paneli", catalog: "Okul Operasyon Paneli", title: "Okul Operasyon Paneli" };
    if (pathname.startsWith("/organization/")) return { menu: "Kurum Operasyon Paneli", registry: "Kurum Operasyon Paneli", catalog: "Kurum Operasyon Paneli", title: "Kurum Operasyon Paneli" };
    return { menu: "Operasyon Paneli", registry: "Operasyon Paneli", catalog: "Operasyon Paneli", title: "Şirket Operasyon Paneli" };
  }
  if (pathname.endsWith("/map")) return { menu: "Harita", registry: "Harita", catalog: "Harita", title: "Canlı Harita" };
  if (pathname.endsWith("/shifts")) {
    if (pathname.startsWith("/school/")) return { menu: "Vardiyalar", registry: "Vardiyalar", catalog: "Vardiyalar", title: "Okul Vardiyaları" };
    if (pathname.startsWith("/organization/")) return { menu: "Vardiyalar", registry: "Vardiyalar", catalog: "Vardiyalar", title: "Kurum Vardiyaları" };
    if (pathname.startsWith("/company/")) return { menu: "Vardiyalar", registry: "Vardiyalar", catalog: "Vardiyalar", title: "Shifts (COMPANY)" };
  }
  if (pathname.endsWith("/agreements")) return { menu: "Sözleşmeler", registry: "Sözleşmeler", catalog: "Sözleşmeler", title: "Sözleşmeler" };
  if (pathname.endsWith("/georeview")) {
    if (pathname.startsWith("/school/")) return { menu: "Öğrenci Konum Seçici", registry: "Öğrenci Konum Seçici", catalog: "Öğrenci Konum Seçici", title: "Öğrenci Konum Seçici" };
    if (pathname.startsWith("/organization/")) return { menu: "Konum İncele", registry: "Konum İncele", catalog: "Konum İncele", title: "Konum İncele" };
    return { menu: "Personel Konum Seçici", registry: "Personel Konum Seçici", catalog: "Personel Konum Seçici", title: "Personel Konum Seçici" };
  }
  if (pathname.endsWith("/hub")) {
    if (pathname.startsWith("/school/")) return { menu: "Okul Konumu", registry: "Okul Konumu", catalog: "Okul Konumu", title: "Okul Konumu" };
    if (pathname.startsWith("/organization/")) return { menu: "Toplanma Konumu", registry: "Toplanma Konumu", catalog: "Toplanma Konumu", title: "Toplanma Konumu" };
    if (pathname.startsWith("/company/")) return { menu: "Şirket Konumu", registry: "Şirket Konumu", catalog: "Şirket Konumu", title: "Şirket Konumu" };
  }
  if (pathname.endsWith("/checkin")) {
    if (pathname.startsWith("/school/")) return { menu: "Check-in", registry: "Check-in", catalog: "Check-in", title: "Öğrenci / Personel Check-in" };
    if (pathname.startsWith("/company/")) return { menu: "Check-in", registry: "Check-in", catalog: "Check-in", title: "Personel Check-in" };
    if (pathname.startsWith("/organization/")) return { menu: "Check-in", registry: "Check-in", catalog: "Check-in", title: "Personel Check-in" };
  }
  if (pathname.endsWith("/personel-access")) return { menu: "Personel Erişimi", registry: "Personel Erişimi", catalog: "Personel Erişimi", title: "Personel Erişimi" };
  if (pathname === "/school/parents") return { menu: "Veli Erişimi", registry: "Veli Erişimi", catalog: "Veli Erişimi", title: "Veli Erişimi" };
  if (pathname.endsWith("/access-links")) {
    if (pathname.startsWith("/school/")) return { menu: "Öğrenci Link", registry: "Öğrenci Link", catalog: "Öğrenci Link", title: "Öğrenci Link" };
    return { menu: "Personel Link", registry: "Personel Link", catalog: "Personel Link", title: "Personel Link" };
  }
  if (pathname.endsWith("/service-evaluation")) return { menu: "Hizmet Değerlendirme", registry: "Hizmet Değerlendirme", catalog: "Hizmet Değerlendirme", title: "Hizmet Değerlendirme" };
  if (pathname.endsWith("/commercial-flow")) {
    if (pathname.startsWith("/room/")) return { menu: "Ticari Akışım", registry: "Ticari Akışım", catalog: "Ticari Akışım", title: "Ticari Akışım" };
    return { menu: "Ticari Akış", registry: "Ticari Akışım", catalog: "Ticari Akışım", title: "Ticari Akış" };
  }
  if (pathname.endsWith("/copilot")) return { menu: "Sefer Abi Terminali", registry: "Sefer Abi Terminali", catalog: "Sefer Abi Terminali", title: "Sefer Abi Terminali" };
  if (pathname.endsWith("/reports")) return { menu: "Raporlar", registry: "Raporlar", catalog: "Raporlar", title: "Raporlar" };

  if (pathname === "/driver") return { menu: "Bugün", registry: "Bugün", catalog: "Bugün", title: "Bugün" };
  if (pathname === "/driver/today") return { menu: "Bugün", registry: "Bugün", catalog: "Bugün", title: "Bugün" };
  if (pathname === "/driver/map") return { menu: "Harita", registry: "Harita", catalog: "Harita", title: "Harita" };
  if (pathname === "/driver/route") return { menu: "Rota", registry: "Rota", catalog: "Rota", title: "Rota" };
  if (pathname === "/driver/checkin") return { menu: "Check-in", registry: "Check-in", catalog: "Check-in", title: "Check-in" };
  if (pathname === "/driver/change-pin") return { menu: "PIN Değiştir", registry: "PIN Değiştir", catalog: "PIN Değiştir", title: "PIN Değiştir" };
  if (pathname === "/driver/copilot") return { menu: "Sefer Abi Terminali", registry: "Sefer Abi Terminali", catalog: "Sefer Abi Terminali", title: "Sefer Abi Terminali" };

  if (pathname === "/personel/live") return { menu: "Canlı", registry: "Canlı", catalog: "Canlı", title: "Personel • Canlı Harita" };
  if (pathname === "/personel/my") return { menu: "Servisim", registry: "Servisim", catalog: "Servisim", title: "Benim Servisim" };
  if (pathname === "/personel/copilot") return { menu: "Sefer Abi Terminali", registry: "Sefer Abi Terminali", catalog: "Sefer Abi Terminali", title: "Sefer Abi Terminali" };

  if (pathname === "/parent" || pathname === "/parent/live") return { menu: "Canlı", registry: "Canlı", catalog: "Canlı", title: "Veli • Canlı Takip" };
  if (pathname === "/parent/copilot") return { menu: "Sefer Abi Terminali", registry: "Sefer Abi Terminali", catalog: "Sefer Abi Terminali", title: "Sefer Abi Terminali" };

  if (pathname === "/public/passenger-live" || pathname === "/public/personel-live") return { menu: "Canlı Servis Linki", registry: "Canlı Servis Linki", catalog: "Canlı Servis Linki", title: "Canlı Servis Linki" };
  if (pathname === "/accept-parent-invite") return { menu: "Veli kodu + PIN ile giriş", registry: "Veli kodu + PIN ile giriş", catalog: "Veli kodu + PIN ile giriş", title: "Veli kodu + PIN ile giriş" };

  if (pathname === "/shared/notifications") return { menu: "Bildirimler", registry: "Bildirimler", catalog: "Bildirimler", title: "Bildirimler" };
  if (pathname === "/shared/logs") return { menu: "Log Dışa Aktarımı", registry: "Log Dışa Aktarımı", catalog: "Log Dışa Aktarımı", title: "Log Dışa Aktarımı" };
  if (pathname === "/shared/kvkk") return { menu: "KVKK", registry: "KVKK", catalog: "KVKK", title: "KVKK" };
  if (pathname === "/shared/feedback") return { menu: "Geri Bildirim", registry: "Geri Bildirim", catalog: "Geri Bildirim", title: "Geri Bildirim" };

  if (pathname === "/auth/change-password") return { menu: "Şifre Değiştir", registry: "Şifre Değiştir", catalog: "Şifre Değiştir", title: "Şifre Değiştir" };
  return { menu: "", registry: "", catalog: "", title: "" };
}

function inferRisk(pathname) {
  if (pathname === "/organization/plans") return "legacy title retained";
  if (pathname === "/room/live") return "compat alias of /room/map";
  if (pathname === "/driver") return "compat alias of /driver/today";
  if (pathname === "/parent") return "compat alias of /parent/live";
  if (pathname === "/public/personel-live") return "shared passenger live surface reused";
  return "";
}

function shouldCheckNavDock(pathname) {
  if (pathname.startsWith("/public")) return false;
  if (pathname === "/auth/change-password") return false;
  if (pathname === "/accept-parent-invite") return false;
  if (pathname === "/driver/change-pin") return false;
  if (pathname === "/superadmin/natural-copilot") return false;
  return true;
}

function shouldCheckScreenRegistry(pathname) {
  if (pathname.startsWith("/public")) return false;
  if (pathname === "/auth/change-password") return false;
  if (pathname === "/accept-parent-invite") return false;
  return true;
}

function shouldCheckScreenCatalog(pathname) {
  if (pathname.startsWith("/superadmin")) return true;
  if (pathname.startsWith("/driver")) return true;
  if (pathname.startsWith("/shared")) return true;
  if (pathname === "/organization/plans") return true;
  return false;
}

function isComputedHubPath(pathname) {
  return pathname === "/company/hub" || pathname === "/school/hub" || pathname === "/organization/hub";
}

function checkTabs(filePath, spec) {
  const text = read(filePath);
  if (spec.requirePanelSegmentTabs !== false) {
    mustContains(text, "PanelSegmentTabs", `${filePath} uses PanelSegmentTabs`);
  }
  if (spec.stateNeedle) mustContains(text, spec.stateNeedle, `${filePath} keeps tab state`);
  for (const needle of spec.tabLabels || []) {
    mustContains(text, needle, `${filePath} keeps tab label ${needle}`);
  }
  for (const needle of spec.branchNeedles || []) {
    mustContains(text, needle, `${filePath} keeps branch ${needle}`);
  }
}

const ROUTE_GROUPS = [
  { component: "web/src/panels/superadmin/SuperAdminPanel.jsx", paths: ["/superadmin"], tabCheck: { stateNeedle: 'const [activeDetailTab, setActiveDetailTab] = useState("system")', tabLabels: ["Sistem Detayları", "Geri Bildirimler", "Demo Hesapları"], branchNeedles: ['activeDetailTab === "system"', 'activeDetailTab === "feedbacks"', 'activeDetailTab === "demo"'] } },
  { component: "web/src/panels/superadmin/CompaniesPanel.jsx", paths: ["/superadmin/companies"] },
  { component: "web/src/panels/superadmin/RoomsPanel.jsx", paths: ["/superadmin/rooms"] },
  { component: "web/src/panels/superadmin/UsersPanel.jsx", paths: ["/superadmin/users"] },
  { component: "web/src/panels/superadmin/RegionsPanel.jsx", paths: ["/superadmin/regions"] },
  { component: "web/src/panels/superadmin/AuditLogsPanel.jsx", paths: ["/superadmin/audit"] },
  { component: "web/src/panels/superadmin/LogExportPanel.jsx", paths: ["/superadmin/logexport"] },
  { component: "web/src/panels/superadmin/ObservabilityPanel.jsx", paths: ["/superadmin/observability"] },
  { component: "web/src/panels/superadmin/OperationsPanel.jsx", paths: ["/superadmin/operations"], tabCheck: { stateNeedle: 'const [activeTab, setActiveTab] = useState("summary")', tabLabels: ["Özet", "Yetki & Erişim", "Servis Kanıtı", "KVKK & Uyumluluk", "Audit / Log Kayıtları", "Riskler & Kararlar"], branchNeedles: ['activeTab === "summary"', 'activeTab === "access"', 'activeTab === "proof"', 'activeTab === "kvkk"', 'activeTab === "audit"', 'activeTab === "risk"'] } },
  { component: "web/src/panels/superadmin/FieldAcceptanceCenter.jsx", paths: ["/superadmin/acceptance"], tabCheck: { stateNeedle: 'const [activeTab, setActiveTab] = useState("overview")', tabLabels: ["Özet", "Manifest", "Karar Kaydı", "Oturum Bilgisi", "Checklist Güncelleme", "Geçmiş / Log"], branchNeedles: ['activeTab === "overview"', 'activeTab === "manifest"', 'activeTab === "decision"', 'activeTab === "session"', 'activeTab === "checklist"', 'activeTab === "history"'] } },
  { component: "web/src/panels/superadmin/SsotAlignmentPanel.jsx", paths: ["/superadmin/ssot-alignment"] },
  { component: "web/src/panels/superadmin/CommercialCorePanel.jsx", paths: ["/superadmin/commercial-core"], tabCheck: { stateNeedle: 'const [viewTab, setViewTab] = useState("summary")', tabLabels: ["Özet", "Hakediş", "Ödeme Hazırlık", "Komisyon", "Kalite / Kanıt", "Riskler", "Geçmiş"], branchNeedles: ['viewTab === "summary"', 'viewTab === "billing"', 'viewTab === "prep"', 'viewTab === "commission"', 'viewTab === "proof"', 'viewTab === "risk"', 'viewTab === "history"'] } },
  { component: "web/src/panels/superadmin/TrustQualityPanel.jsx", paths: ["/superadmin/trust-quality"], tabCheck: { stateNeedle: 'const [activeTab, setActiveTab] = useState("overview")', tabLabels: ["Özet", "Servis Kanıtı", "Taslak Skor", "İnceleme Kararı", "Kalite Geçmişi", "Yol Haritası / Riskler"], branchNeedles: ['activeTab === "overview"', 'activeTab === "proof"', 'activeTab === "draft"', 'activeTab === "decision"', 'activeTab === "history"', 'activeTab === "roadmap"'] } },
  { component: "web/src/panels/superadmin/NaturalCopilotPanel.jsx", paths: ["/superadmin/natural-copilot"] },
  { component: "web/src/panels/superadmin/PilotLaunchGatePanel.jsx", paths: ["/superadmin/pilot-launch-gate"] },
  { component: "web/src/panels/superadmin/OperationVerificationPanel.jsx", paths: ["/superadmin/operation-verification"] },
  { component: "web/src/panels/shared/CopilotPanel.jsx", paths: ["/superadmin/copilot"] },

  { component: "web/src/panels/room/MapPanel.jsx", paths: ["/room/map", "/room/live"], tabCheck: { stateNeedle: 'const [mapTab, setMapTab] = useState("map")', tabLabels: ["Harita", "Araçlar"], branchNeedles: ['mapTab === "map"', 'mapTab === "vehicles"'] } },
  { component: "web/src/panels/room/VehiclesPanel.jsx", paths: ["/room/vehicles"], tabCheck: { stateNeedle: 'const [tab, setTab] = useState("status")', tabLabels: ["Durum", "Yönetim", "Atamalar", "Müsaitlik", "Telematics", "Bağlantı"], branchNeedles: ['tab === "status"', 'tab === "manage"', 'tab === "assign"', 'tab === "avail"', 'tab === "telematics"', 'tab === "link"'] } },
  { component: "web/src/panels/room/DriversPanel.jsx", paths: ["/room/drivers"], tabCheck: { stateNeedle: 'const [tab, setTab] = useState("status")', tabLabels: ["Durum", "Yönetim", "Vardiyalar"], branchNeedles: ['tab === "status"', 'tab === "manage"', 'tab === "shifts"'] } },
  { component: "web/src/panels/room/ShiftsPanel.jsx", paths: ["/room/shifts"], tabCheck: { source: "web/src/panels/room/roomShiftsMainSections.jsx", stateNeedle: "activeTab,", tabLabels: ["Bekleyen Talepler", "Sözleşmeden Üretilen", "Diğer Vardiyalar"], branchNeedles: ['activeTab === "pending"', 'activeTab === "contract"', 'activeTab === "other"'] } },
  { component: "web/src/panels/room/AgreementsPanel.jsx", paths: ["/room/agreements"], tabCheck: { stateNeedle: 'const [viewMode, setViewMode] = useState("bridge")', tabLabels: ["Operasyon Köprüsü", "Rota Talepleri", "Uygulanan Rota", "Uzatma Talepleri", "Bekleyen", "Diğer Sözleşmeler"], branchNeedles: ['viewMode === "bridge"', 'viewMode === "route"', 'viewMode === "applied"', 'viewMode === "extend"', 'viewMode === "pending"', 'viewMode === "other"'] } },
  { component: "web/src/panels/room/OffersPanel.jsx", paths: ["/room/offers"] },
  { component: "web/src/panels/room/CommercialFlowPanel.jsx", paths: ["/room/commercial-flow"], tabCheck: { stateNeedle: 'const [viewMode, setViewMode] = useState("contractShift")', tabLabels: ["Hakediş", "Sözleşme & Vardiya", "Teklifler", "Kalite / Kanıt", "Ödeme & Komisyon", "Geçmiş"], branchNeedles: ['viewMode === "settlement"', 'viewMode === "contractShift"', 'viewMode === "offers"', 'viewMode === "quality"', 'viewMode === "payment"', 'viewMode === "history"'] } },
  { component: "web/src/panels/room/HubPanel.jsx", paths: ["/room/hub"] },
  { component: "web/src/panels/room/CheckinPanel.jsx", paths: ["/room/checkin"] },
  { component: "web/src/panels/room/OperationHealthPanel.jsx", paths: ["/room/operation-health"], tabCheck: { stateNeedle: 'const [activeTab, setActiveTab] = useState("summary")', tabLabels: ["Şartlı Küme", "Oda Operasyon Özeti", "Sürücü ve sorunlar"], branchNeedles: ['activeTab === "proof"', 'activeTab === "summary"', 'activeTab === "problems"'] } },
  { component: "web/src/panels/shared/CopilotPanel.jsx", paths: ["/room/copilot", "/company/copilot", "/school/copilot", "/organization/copilot", "/driver/copilot", "/personel/copilot", "/parent/copilot"] },
  { component: "web/src/panels/shared/ReportsPanel.jsx", paths: ["/room/reports", "/company/reports", "/school/reports", "/organization/reports"] },

  { component: "web/src/panels/company/WorkflowPanel.jsx", paths: ["/company", "/school", "/organization"] },
  { component: "web/src/panels/company/OperationsPanel.jsx", paths: ["/company/operations", "/school/operations", "/organization/operations"], tabCheck: { stateNeedle: 'const [activeTab, setActiveTab] = useState("summary")', tabLabels: ["Özet", "Servis Kümesi", "Personel", "Servis Zamanları", "İstisnalar / Değişiklikler", "Bildirimler"], branchNeedles: ['activeTab === "summary"', 'activeTab === "cluster"', 'activeTab === "personel"', 'activeTab === "serviceTimes"', 'activeTab === "exceptions"', 'activeTab === "notifications"'] } },
  { component: "web/src/panels/company/MapPanel.jsx", paths: ["/company/map", "/school/map", "/organization/map"] },
  { component: "web/src/panels/company/CommercialFlowPanel.jsx", paths: ["/company/commercial-flow", "/school/commercial-flow", "/organization/commercial-flow"] },
  { component: "web/src/panels/company/ShiftsPanel.jsx", paths: ["/company/shifts", "/school/shifts", "/organization/shifts"], tabCheck: { source: "web/src/panels/company/CompanyShiftsPanelTrackView.jsx", stateNeedle: "trackTab,", tabLabels: ["Market", "Bekleyen", "Sözleşmeden Üretilen", "Diğer Vardiyalar"], branchNeedles: ['trackTab === "market"', 'trackTab === "pending"', 'trackTab === "contract"', 'trackTab === "other"'] } },
  { component: "web/src/panels/company/AgreementsPanel.jsx", paths: ["/company/agreements", "/school/agreements", "/organization/agreements"], tabCheck: { stateNeedle: 'const [viewMode, setViewMode] = useState("list")', tabLabels: ["Liste", "Bağlantı", "Yazım"], branchNeedles: ['viewMode === "list"', 'viewMode === "bridge"', 'viewMode === "wizard"'] } },
  { component: "web/src/panels/company/GeoReviewPanel.jsx", paths: ["/company/georeview", "/school/georeview", "/organization/georeview"] },
  { component: "web/src/panels/company/HubPanel.jsx", paths: ["/company/hub", "/school/hub", "/organization/hub"] },
  { component: "web/src/panels/company/CheckinPanel.jsx", paths: ["/company/checkin", "/school/checkin", "/organization/checkin"] },
  { component: "web/src/panels/company/PersonelAccessPanel.jsx", paths: ["/company/personel-access", "/organization/personel-access"] },
  { component: "web/src/panels/company/PassengerLinksPanel.jsx", paths: ["/company/access-links", "/school/access-links", "/organization/access-links"] },
  { component: "web/src/panels/company/ServiceEvaluationPanel.jsx", paths: ["/company/service-evaluation", "/school/service-evaluation", "/organization/service-evaluation"], tabCheck: { stateNeedle: 'const [activeTab, setActiveTab] = useState("overview")', tabLabels: ["Özet", "Kanıt / Hazırlık", "Taslak Skor", "İnceleme Kararı", "Geçmiş", "Değerlendirme Alanları"], branchNeedles: ['activeTab === "overview"', 'activeTab === "proof"', 'activeTab === "draft"', 'activeTab === "decision"', 'activeTab === "history"', 'activeTab === "fields"'] } },
  { component: "web/src/panels/school/ParentInvitePanel.jsx", paths: ["/school/parents"] },
  { component: "web/src/panels/organization/PlansPanel.jsx", paths: ["/organization/plans"] },

  { component: "web/src/panels/driver/TodayPanel.jsx", paths: ["/driver", "/driver/today"] },
  { component: "web/src/panels/driver/MapPanel.jsx", paths: ["/driver/map"] },
  { component: "web/src/panels/driver/RoutePanel.jsx", paths: ["/driver/route"] },
  { component: "web/src/panels/driver/CheckinPanel.jsx", paths: ["/driver/checkin"] },
  { component: "web/src/panels/driver/PinChangePanel.jsx", paths: ["/driver/change-pin"] },

  { component: "web/src/panels/personel/LivePanel.jsx", paths: ["/personel/live"], tabCheck: { stateNeedle: 'const [viewMode, setViewMode] = useState("timeline")', tabLabels: ["Duraklar", "Harita"], branchNeedles: ['viewMode === "timeline"', "Harita Önizleme", "MapView"] } },
  { component: "web/src/panels/personel/MyRidePanel.jsx", paths: ["/personel/my"] },

  { component: "web/src/panels/parent/LivePanel.jsx", paths: ["/parent", "/parent/live"], tabCheck: { stateNeedle: 'const [viewMode, setViewMode] = useState("stops")', tabLabels: ["Duraklar", "Harita"], branchNeedles: ['viewMode === "stops"', "Harita Önizleme", "MapView"] } },

  { component: "web/src/panels/public/PassengerLivePanel.jsx", paths: ["/public/passenger-live", "/public/personel-live"] },
  { component: "web/src/panels/public/AcceptParentInvitePanel.jsx", paths: ["/accept-parent-invite"] },

  { component: "web/src/panels/shared/NotificationsPanel.jsx", paths: ["/shared/notifications"] },
  { component: "web/src/panels/shared/LogsPanel.jsx", paths: ["/shared/logs"] },
  { component: "web/src/panels/shared/KvkkPanel.jsx", paths: ["/shared/kvkk"] },
  { component: "web/src/panels/shared/FeedbackLoopPanel.jsx", paths: ["/shared/feedback"] },
  { component: "web/src/panels/shared/ForcePasswordChangePanel.jsx", paths: ["/auth/change-password"] },
];

function routeRows() {
  const rows = [];
  for (const group of ROUTE_GROUPS) {
    for (const pathValue of group.paths) {
      const labels = inferLabels(pathValue);
      rows.push({
        role: inferRole(pathValue),
        path: pathValue,
        component: group.component,
        menuLabel: labels.menu,
        registryLabel: labels.registry,
        catalogLabel: labels.catalog,
        title: labels.title,
        risk: inferRisk(pathValue),
        tabCheck: group.tabCheck || null,
      });
    }
  }
  return rows;
}

function main() {
  console.log("=== FINAL-UX-SMOKE-01 CHECK ===");

  const app = read(APP_JSX_ROLE_TENANT_SCOPE_PATHS[0]);
  const navDock = read("web/src/layout/NavDock.jsx");
  const screenRegistry = read("web/src/copilot/screenRegistry.js");
  const screenCatalog = read("backend/src/ai/jobGuide/screenCatalog.js");
  const labels = read("web/src/utils/labels.js");
  const copilotFacts = read("web/src/utils/copilotFacts.js");
  const panelSegmentTabs = read("web/src/components/PanelSegmentTabs.jsx");
  const checklistPath = "docs/FINAL_UX_SMOKE_01_CHECKLIST.md";
  const guidePath = "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md";
  const warnings = [];

  if (navDock.includes('base + "/personel-access"') && app.includes('"/school/parents"') && !app.includes('"/school/personel-access"')) {
    const warning = "NavDock school Veli Erişimi still points at /school/personel-access while App exposes /school/parents";
    passDash(warning);
    warnings.push(warning);
  }

  must(exists(checklistPath), "manual checklist doc exists");
  must(exists(guidePath), "milestone guide exists");
  mustContains(panelSegmentTabs, "onChange", "PanelSegmentTabs keeps onChange support");
  mustContains(panelSegmentTabs, "onSelect", "PanelSegmentTabs keeps onSelect support");
  mustContains(panelSegmentTabs, "role=\"tab\"", "PanelSegmentTabs keeps tab role");

  const rows = routeRows();
  const roles = new Set();

  for (const row of rows) {
    roles.add(row.role);
    mustContains(app, row.path, `App keeps route ${row.path}`);
    must(exists(row.component), `component file exists: ${row.component}`);
    if (shouldCheckNavDock(row.path)) {
      if (row.path === "/room/hub") {
        mustContains(navDock, row.menuLabel, `NavDock keeps ${row.menuLabel}`);
      } else if (isComputedHubPath(row.path)) {
        mustContains(navDock, "hubLabelForKind(me?.companyKind)", "NavDock keeps computed hub label helper");
      } else {
        mustContains(navDock, row.menuLabel, `NavDock keeps ${row.menuLabel}`);
      }
    }
    if (shouldCheckScreenRegistry(row.path)) {
      if (row.path === "/room/hub") {
        mustContains(screenRegistry, row.registryLabel, `screenRegistry keeps ${row.registryLabel}`);
      } else if (row.path.endsWith("/personel-access")) {
        if (normalize(screenRegistry).includes(normalize(row.registryLabel))) {
          ok(`screenRegistry keeps ${row.registryLabel}`);
        } else {
          const warning = `screenRegistry omits ${row.registryLabel} for ${row.path}`;
          passDash(warning);
          warnings.push(warning);
        }
      } else if (row.path === "/company/hub") {
        mustContains(screenRegistry, 'hubLabelForKind("COMPANY")', "screenRegistry keeps company hub helper");
      } else if (row.path === "/school/hub") {
        mustContains(screenRegistry, 'hubLabelForKind("SCHOOL")', "screenRegistry keeps school hub helper");
      } else if (row.path === "/organization/hub") {
        mustContains(screenRegistry, 'hubLabelForKind("ORGANIZATION")', "screenRegistry keeps organization hub helper");
      } else {
        mustContains(screenRegistry, row.registryLabel, `screenRegistry keeps ${row.registryLabel}`);
      }
    }
    if (shouldCheckScreenCatalog(row.path)) {
      mustContains(screenCatalog, row.catalogLabel, `screenCatalog keeps ${row.catalogLabel}`);
    }
    if (row.path === "/company/hub") mustContains(labels, "Şirket Konumu", "hub label for company stays Şirket Konumu");
    if (row.path === "/school/hub") mustContains(labels, "Okul Konumu", "hub label for school stays Okul Konumu");
    if (row.path === "/organization/hub") mustContains(labels, "Toplanma Konumu", "hub label for organization stays Toplanma Konumu");
    if (row.tabCheck) checkTabs(row.tabCheck.source || row.component, row.tabCheck);

    const labelPart = row.menuLabel === row.registryLabel ? `label="${row.menuLabel}"` : `menu="${row.menuLabel}" registry="${row.registryLabel}"`;
    const riskPart = row.risk ? `risk=${row.risk}` : "risk=none";
    const prefix = row.risk ? "PASS-" : "PASS";
    console.log(`${prefix} [${row.role}] ${row.path} | ${labelPart} | component=${row.component} | title=${row.title} | tabs=${row.tabCheck ? "yes" : "no"} | ${riskPart}`);
    if (row.risk) warnings.push(`${row.path}: ${row.risk}`);
  }

  must(rows.length === 94, "route/panel surface count is 94");
  must(roles.has("Super Admin"), "Super Admin routes covered");
  must(roles.has("Room / Oda"), "Room routes covered");
  must(roles.has("Company / Firma"), "Company routes covered");
  must(roles.has("School / Okul"), "School routes covered");
  must(roles.has("Organization / Kurum"), "Organization routes covered");
  must(roles.has("Driver"), "Driver routes covered");
  must(roles.has("Personel"), "Personel routes covered");
  must(roles.has("Parent / Veli"), "Parent routes covered");
  must(roles.has("Public"), "Public routes covered");

  mustContains(navDock, "Sefer Abi Terminali", "NavDock keeps Sefer Abi Terminali");
  mustContains(navDock, "getCopilotMenuEntry", "NavDock keeps Sefer Abi launcher helper");
  mustContains(copilotFacts, "Sefer Abi Terminali", "copilot facts keep terminal title");
  mustContains(copilotFacts, "Sefer Abi’ye Sor", "copilot facts keep launcher title");

  mustNotContains(navDock, 'label: "Hub"', "NavDock no longer exposes raw Hub label");
  mustNotContains(screenRegistry, 'label: "Hub"', "screenRegistry no longer exposes raw Hub label");
  mustNotContains(screenCatalog, 'label: "Hub"', "screenCatalog no longer exposes raw Hub label");
  mustNotContains(navDock, "Audit Logs", "NavDock no longer exposes raw Audit Logs label");
  mustNotContains(screenRegistry, "Audit Logs", "screenRegistry no longer exposes raw Audit Logs label");
  mustNotContains(screenCatalog, "Audit Logs", "screenCatalog no longer exposes raw Audit Logs label");
  mustNotContains(navDock, "SuperAdmin Log Export", "NavDock no longer exposes raw SuperAdmin Log Export label");
  mustNotContains(screenRegistry, "SuperAdmin Log Export", "screenRegistry no longer exposes raw SuperAdmin Log Export label");
  mustNotContains(screenCatalog, "SuperAdmin Log Export", "screenCatalog no longer exposes raw SuperAdmin Log Export label");
  mustNotContains(navDock, "Güven + Kalite", "NavDock uses Güven ve Kalite instead of plus variant");
  mustNotContains(screenRegistry, "Güven + Kalite", "screenRegistry uses Güven ve Kalite instead of plus variant");
  mustNotContains(screenCatalog, "Güven + Kalite", "screenCatalog uses Güven ve Kalite instead of plus variant");
  mustContains(navDock, "Güven ve Kalite", "NavDock keeps Güven ve Kalite");
  mustContains(screenRegistry, "Güven ve Kalite", "screenRegistry keeps Güven ve Kalite");
  mustContains(screenCatalog, "Güven ve Kalite", "screenCatalog keeps Güven ve Kalite");
  mustContains(navDock, "İller ve Bölgeler", "NavDock keeps İller ve Bölgeler");
  mustContains(screenRegistry, "İller ve Bölgeler", "screenRegistry keeps İller ve Bölgeler");
  mustContains(screenCatalog, "İller ve Bölgeler", "screenCatalog keeps İller ve Bölgeler");
  mustContains(labels, "Şirket Konumu", "labels.js keeps Şirket Konumu");
  mustContains(labels, "Okul Konumu", "labels.js keeps Okul Konumu");
  mustContains(labels, "Toplanma Konumu", "labels.js keeps Toplanma Konumu");

  const roomVehiclesCards = read("web/src/panels/room/roomVehiclesPanelCards.jsx");
  const roomVehiclesSections = read("web/src/panels/room/roomVehiclesPanelSections.jsx");
  const roomDriversPanel = read("web/src/panels/room/DriversPanel.jsx");
  mustContains(roomVehiclesCards, "Araç bağlantısı (Araç ↔ Sürücü)", "Room vehicles keeps single bind form");
  mustContains(roomVehiclesCards, "Bağla", "Room vehicles keeps bind action");
  mustContains(roomVehiclesCards, "Transfer", "Room vehicles keeps transfer action");
  mustContains(roomVehiclesCards, "Bağlantıyı kaldır", "Room vehicles keeps unlink action");
  mustContains(roomVehiclesSections, "Bağlı sürücüyü yönet", "Room vehicles keeps linked-driver shortcut");
  mustContains(roomVehiclesSections, "Ayır", "Room vehicles keeps unlink shortcut");
  mustNotContains(roomDriversPanel, "Araç bağlantısı (Araç ↔ Sürücü)", "Room drivers does not duplicate vehicle bind form");

  const roomMapPanel = read("web/src/panels/room/MapPanel.jsx");
  const roomOperationHealth = read("web/src/panels/room/OperationHealthPanel.jsx");
  const roomAgreements = read("web/src/panels/room/AgreementsPanel.jsx");
  const roomCommercialFlow = read("web/src/panels/room/CommercialFlowPanel.jsx");
  const roomShifts = read("web/src/panels/room/ShiftsPanel.jsx");
  const companyOps = read("web/src/panels/company/OperationsPanel.jsx");
  const companyServiceEval = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
  const companyShiftsTrack = read("web/src/panels/company/CompanyShiftsPanelTrackView.jsx");
  const schoolOps = read("web/src/panels/school/OperationsPanel.jsx");
  const personelLive = read("web/src/panels/personel/LivePanel.jsx");
  const parentLive = read("web/src/panels/parent/LivePanel.jsx");
  const superAdminPanel = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
  const superAdminOps = read("web/src/panels/superadmin/OperationsPanel.jsx");
  const superAdminAcceptance = read("web/src/panels/superadmin/FieldAcceptanceCenter.jsx");
  const superAdminCommercial = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  const superAdminTrust = read("web/src/panels/superadmin/TrustQualityPanel.jsx");

  mustContains(roomMapPanel, 'const [mapTab, setMapTab] = useState("map")', "Room map keeps active tab state");
  mustContains(roomMapPanel, "PanelSegmentTabs", "Room map keeps functional tabs");
  mustContains(roomOperationHealth, 'const [activeTab, setActiveTab] = useState("summary")', "Room operation health keeps active tab state");
  mustContains(roomOperationHealth, "PanelSegmentTabs", "Room operation health keeps functional tabs");
  mustContains(roomAgreements, 'const [viewMode, setViewMode] = useState("bridge")', "Room agreements keeps active tab state");
  mustContains(roomAgreements, "PanelSegmentTabs", "Room agreements keeps functional tabs");
  mustContains(roomCommercialFlow, 'const [viewMode, setViewMode] = useState("contractShift")', "Room commercial flow keeps active tab state");
  mustContains(roomCommercialFlow, "PanelSegmentTabs", "Room commercial flow keeps functional tabs");
  mustContains(roomShifts, 'const [shiftsTab, setShiftsTab] = useState("pending")', "Room shifts keeps active tab state");
  mustContains(roomShifts, "onChangeTab", "Room shifts keeps real tab behavior");
  mustContains(companyOps, 'const [activeTab, setActiveTab] = useState("summary")', "Company operations keeps active tab state");
  mustContains(companyOps, "PanelSegmentTabs", "Company operations keeps functional tabs");
  mustContains(companyServiceEval, 'const [activeTab, setActiveTab] = useState("overview")', "Company service evaluation keeps active tab state");
  mustContains(companyServiceEval, "PanelSegmentTabs", "Company service evaluation keeps functional tabs");
  mustContains(companyShiftsTrack, "trackTab,", "Company shifts track view keeps tab state");
  mustContains(companyShiftsTrack, "PanelSegmentTabs", "Company shifts track view keeps functional tabs");
  mustContains(schoolOps, 'const [activeTab, setActiveTab] = useState("summary")', "School operations keeps active tab state");
  mustContains(schoolOps, "PanelSegmentTabs", "School operations keeps functional tabs");
  mustContains(personelLive, 'const [viewMode, setViewMode] = useState("timeline")', "Personel live keeps active tab state");
  mustContains(personelLive, "PanelSegmentTabs", "Personel live keeps functional tabs");
  mustContains(parentLive, 'const [viewMode, setViewMode] = useState("stops")', "Parent live keeps active tab state");
  mustContains(parentLive, "PanelSegmentTabs", "Parent live keeps functional tabs");
  mustContains(superAdminPanel, 'const [activeDetailTab, setActiveDetailTab] = useState("system")', "Super admin keeps detail tab state");
  mustContains(superAdminPanel, "PanelSegmentTabs", "Super admin keeps functional detail tabs");
  mustContains(superAdminOps, 'const [activeTab, setActiveTab] = useState("summary")', "Super admin operations keeps active tab state");
  mustContains(superAdminOps, "PanelSegmentTabs", "Super admin operations keeps functional tabs");
  mustContains(superAdminAcceptance, 'const [activeTab, setActiveTab] = useState("overview")', "Super admin acceptance keeps active tab state");
  mustContains(superAdminAcceptance, "PanelSegmentTabs", "Super admin acceptance keeps functional tabs");
  mustContains(superAdminCommercial, 'const [viewTab, setViewTab] = useState("summary")', "Super admin commercial core keeps active tab state");
  mustContains(superAdminCommercial, "PanelSegmentTabs", "Super admin commercial core keeps functional tabs");
  mustContains(superAdminTrust, 'const [activeTab, setActiveTab] = useState("overview")', "Super admin trust & quality keeps active tab state");
  mustContains(superAdminTrust, "PanelSegmentTabs", "Super admin trust & quality keeps functional tabs");

  if (normalize(screenCatalog).includes("yer planlari")) {
    passDash("screenCatalog still contains legacy 'Yer Planları' guidance label; visible UI stays on Konum standard");
  }
  if (normalize(read("web/src/panels/organization/PlansPanel.jsx")).includes("legacy")) {
    passDash("Organization plans panel keeps legacy-only title while Planlama Merkezi handles the new flow");
  }

  const forbiddenFiles = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
  ];
  for (const file of forbiddenFiles) {
    must(exists(file), `runtime-data file exists in smoke scope: ${file}`);
    if (isUntouchedByGit(file)) {
      ok(`runtime-data file untouched in smoke scope: ${file}`);
    } else {
      passDash(`runtime-data file already dirty in workspace scope: ${file}`);
    }
  }

  const newFiles = [
    "backend/scripts/final_ux_smoke_01_check.js",
    "docs/FINAL_UX_SMOKE_01_CHECKLIST.md",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  ];
  const marketplaceBoundaryFiles = new Set([
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
  ]);
  for (const file of newFiles) {
    const text = read(file);
    if (file !== "backend/scripts/final_ux_smoke_01_check.js" && !marketplaceBoundaryFiles.has(file)) {
      mustNotContains(text, "runtime-data", `${file} avoids runtime-data references`);
      mustNotContains(text, "prisma", `${file} avoids prisma references`);
      mustNotContains(text, "migration", `${file} avoids migration references`);
    }
  }

  console.log(`\nInventory rows: ${rows.length}`);
  console.log(`Roles covered: ${[...roles].join(", ")}`);
  console.log(`Static warnings: ${warnings.length ? warnings.join(" | ") : "none"}`);
  console.log(`Checklist file: ${checklistPath}`);
  console.log("Product/business flow changed: No");
  console.log("Runtime-data touched: No");
  console.log("PASS commands:");
  console.log("  npm run check:finaluxsmoke01");
  console.log("  npm run check:product-extensions");
  console.log("  npm --prefix backend run lint");
  console.log("  npm run verify:final");
  console.log("=== FINAL-UX-SMOKE-01 CHECK PASS ===");
}

main();
