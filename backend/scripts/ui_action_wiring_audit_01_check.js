#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const scanRoots = [
  "web/src/panels/company",
  "web/src/panels/school",
  "web/src/panels/organization",
  "web/src/panels/room",
  "web/src/panels/superadmin",
  "web/src/panels/driver",
  "web/src/panels/parent",
  "web/src/panels/personel",
  "web/src/panels/shared",
  "web/src/components",
  "web/src/utils/copilotFacts.js",
  "web/src/utils/labels.js",
  "backend/src/services/boardingRouteImpactPreview.js",
  "backend/src/services/boardingChangeRouteRefresh.js",
  "backend/src/routes/requests.js",
  "backend/src/routes/driver.js",
];

const actionLabelGroups = [
  { label: "Rota etkisini önizle", needles: ["Rota etkisini önizle", "Rota Önizleme", "Rota/Durak Önizleme", "Harita Önizleme", "Mini harita önizlemesi", "Konum Önizleme"] },
  { label: "Detay", needles: ["Detay", "Detaylar", "Kuyruk Detayı"] },
  { label: "Aç", needles: ["Aç", "Aç / Kapat", "Tümünü Aç", "İlgili ekrana git", "Canlı Takibi aç", "Sürücüleri aç", "Araçları aç"] },
  { label: "Yenile", needles: ["Yenile", "Özeti Yenile", "Listeyi yenile", "Dispatch Önizlemeyi Yenile", "Önizlemeyi Yenile"] },
  { label: "Kaydet", needles: ["Kaydet", "Güncelle", "Yaz"] },
  { label: "Gönder", needles: ["Gönder", "Gönderiliyor", "Teklif Gönder", "Toplu Teklifleri Gönder", "Kuyruğu Gönder"] },
  { label: "Davet", needles: ["Davet", "Davet Et", "Yeni Davet"] },
  { label: "Kabul", needles: ["Kabul et", "Kabul"] },
  { label: "Reddet", needles: ["Reddet", "Redded"] },
  { label: "Temizle", needles: ["Temizle", "Seçimi temizle", "Filtreyi Temizle", "Filtreleri temizle", "Filtre Temizle"] },
  { label: "Filtrele", needles: ["Filtrele", "Filtre", "Filtreleri"] },
  { label: "Haritada göster", needles: ["Haritada göster", "Harita Önizleme", "Harita Önizle", "Tam Rotayı Dış Navigasyonda Aç"] },
  { label: "Sefer Abi’ye Sor", needles: ["Sefer Abi’ye Sor", "Sefer Abi'ye Sor"] },
];

const forbiddenPatterns = [
  { rx: /onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/, label: "empty onClick handler" },
  { rx: /onClick\s*=\s*\{\s*undefined\s*\}/, label: "onClick={undefined}" },
  { rx: /onClick\s*=\s*\{\s*null\s*\}/, label: "onClick={null}" },
  { rx: /href\s*=\s*["']#["']/, label: 'href="#" placeholder' },
  { rx: /console\.log\s*\(/, label: "console.log in UI action surface" },
  { rx: /alert\s*\(/, label: "alert in UI action surface" },
  {
    rx: /(?:\/\/|\/\*)\s*(?:TODO|FIXME).*?(?:button|onClick|quickAction|action)|(?:button|onClick|quickAction|action).*?(?:\/\/|\/\*)\s*(?:TODO|FIXME)|(?:button|onClick|quickAction|action).{0,120}(?:mock action|placeholder action|deneme action)/is,
    label: "TODO/FIXME/mock/placeholder near action wiring",
  },
];

const keyFileExpectations = [
  {
    file: "web/src/components/copilot/FloatingCopilotDrawer.jsx",
    mustContain: [
      'filterMessageActions(m.quickActions, suggestions, m.followUpPrompt, me)',
      'kind === "COPY_TEXT"',
      'resolveGuideRoute(me, action?.routeKey || "")',
      'setErr("Bu hızlı aksiyon için geçerli bir hedef bulunamadı.")',
    ],
  },
  {
    file: "web/src/panels/shared/CopilotPanel.jsx",
    mustContain: [
      'if (!path) {',
      'Bu bağlantı bu rolde açılamıyor.',
      'entryHintQuickActions',
    ],
  },
  {
    file: "web/src/utils/copilotFacts.js",
    mustContain: [
      "fallback = ['Bu ekranda neye bakmalıyım?', 'Riskleri sırala', 'Sıradaki doğru işlem ne?']",
      "return finalizeStarterChips(",
      "readonly kalite puanı",
      "hakediş için kalite/kanıt hazırlık önizlemesi",
      "Rota etkisini önizle",
    ],
  },
  {
    file: "web/src/utils/labels.js",
    mustContain: [
      "Kişi bilgisi yok",
    ],
  },
  {
    file: "web/src/panels/company/OperationsPanel.jsx",
    mustContain: [
      'selectedPreviewRequestId',
      'previewLoading',
      'Kabul et',
      'Reddet',
      'Sürücü tarafında karar bekliyor.',
      'Readonly önizleme seçildi.',
      'Bu değişiklik için rota etkisi hesaplanamadı / yeterli veri yok.',
    ],
  },
  {
    file: "web/src/panels/school/OperationsPanel.jsx",
    mustContain: [
      'selectedPreviewRequestId',
      'previewLoading',
      'Kabul et',
      'Reddet',
      'Sürücü tarafında karar bekliyor.',
      'Readonly önizleme seçildi.',
      'Bu değişiklik için rota etkisi hesaplanamadı / yeterli veri yok.',
    ],
  },
  {
    file: "web/src/panels/room/roomOperationsBoard.jsx",
    mustContain: [
      'selectedPreviewRequestId',
      'previewLoading',
      'Kişi bilgisi eksik',
      'Readonly önizleme seçildi.',
      'Bu değişiklik için rota etkisi hesaplanamadı / yeterli veri yok.',
      'decisionOwnerNote',
    ],
    mustNotContain: [
      'Kabul et',
      'Reddet',
    ],
  },
  {
    file: "web/src/panels/room/OperationHealthPanel.jsx",
    mustContain: [
      'OperationProofMiniCard',
    ],
    mustNotContain: [
      'Kabul et',
      'Reddet',
    ],
  },
  {
    file: "web/src/panels/driver/RoutePanel.jsx",
    mustContain: [
      'decisionOwnerRole || "DRIVER"',
      'Kabul et',
      'Reddet',
      'Readonly önizleme — rota uygulanmaz, sürücü rotası yenilenmez, bildirim gönderilmez.',
      'Yenile',
    ],
  },
  {
    file: "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    mustContain: [
      'Harita önizlemesi için durak koordinatı eksik.',
      'Bu değişiklik için rota etkisi metinsel olarak önizleniyor.',
      'Readonly önizleme — rota uygulanmaz, sürücü rotası yenilenmez, bildirim gönderilmez',
      'Önizleme açılıyor…',
      'Önizleme gösterilemedi',
      'Seçimi temizle',
    ],
    mustNotContain: [
      'Bir satırdaki ‘Rota etkisini önizle’ butonuna basınca burada readonly önizleme açılır.',
    ],
  },
  {
    file: "backend/src/services/boardingRouteImpactPreview.js",
    mustContain: [
      'previewOnly',
      'previewOnlyNote',
      'Bu sadece önizlemedir.',
    ],
    mustNotContain: [
      'payment',
      'invoice',
      'penalty',
      'sms',
    ],
  },
  {
    file: "backend/src/routes/requests.js",
    mustContain: [
      'decisionOwnerRole',
      'DRIVER',
      'COMPANY',
    ],
    mustNotContain: [
      'payment',
      'invoice',
      'penalty',
      'sms',
      'push',
    ],
  },
  {
    file: "backend/src/routes/driver.js",
    mustContain: [
      'pendingBoardingChangeRequests',
      'decisionOwnerRole',
      'DRIVER',
    ],
    mustNotContain: [
      'payment',
      'invoice',
      'penalty',
    ],
  },
  {
    file: "backend/src/services/boardingChangeRouteRefresh.js",
    mustContain: [
      'routeRefreshState',
      'routeRefreshNote',
      'SMS/push yok',
      'kalıcı rota değişmez',
    ],
    mustNotContain: [
      'execute payment',
      'invoice',
      'penalty',
    ],
  },
];

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function walkFiles(dir, out = []) {
  if (!exists(dir)) return out;
  const abs = path.join(repoRoot, dir);
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    if (/\.(?:js|jsx|ts|tsx)$/i.test(path.basename(dir))) out.push(dir.replace(/\\/g, "/"));
    return out;
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const next = path.posix.join(dir.replace(/\\/g, "/"), entry.name);
    if (entry.isDirectory()) {
      walkFiles(next, out);
      continue;
    }
    if (entry.isFile() && /\.(?:js|jsx|ts|tsx)$/i.test(entry.name)) out.push(next);
  }
  return out;
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

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function mustContain(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContain(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function countMatches(text, rx) {
  const flags = rx.flags.includes("g") ? rx.flags : `${rx.flags}g`;
  const globalRx = new RegExp(rx.source, flags);
  const matches = String(text || "").match(globalRx);
  return matches ? matches.length : 0;
}

function labelHits(text, needles) {
  return needles.some((needle) => normalize(text).includes(normalize(needle)));
}

function main() {
  console.log("=== UI ACTION WIRING AUDIT 01 CHECK ===");
  console.log(`Repo root: ${repoRoot}`);

  const files = scanRoots.flatMap((root) => walkFiles(root));
  const uniqueFiles = [...new Set(files)].sort((a, b) => a.localeCompare(b));
  must(uniqueFiles.length > 0, "scan roots produced files");

  const fileText = new Map(uniqueFiles.map((relPath) => [relPath, read(relPath)]));
  const actionBearingFiles = uniqueFiles.filter((relPath) => {
    const text = fileText.get(relPath) || "";
    return /<button\b|onClick\s*=|href\s*=|role="button"|quickActions|starterChips|SuggestedChips/i.test(text);
  });

  for (const relPath of uniqueFiles) {
    const text = fileText.get(relPath) || "";
    for (const { rx, label } of forbiddenPatterns) {
      if (rx.test(text)) fail(`${relPath} contains forbidden pattern: ${label}`);
    }
  }

  const inventory = actionLabelGroups.map(({ label, needles }) => {
    const matchedFiles = uniqueFiles.filter((relPath) => labelHits(fileText.get(relPath) || "", needles));
    return { label, files: matchedFiles };
  });

  console.log(`Scanned files: ${uniqueFiles.length}`);
  console.log(`Action-bearing files: ${actionBearingFiles.length}`);
  console.log("Action label inventory:");
  for (const row of inventory) {
    console.log(`- ${row.label}: ${row.files.length}`);
  }

  const groupedRoots = [
    ["company", "web/src/panels/company"],
    ["school", "web/src/panels/school"],
    ["organization", "web/src/panels/organization"],
    ["room", "web/src/panels/room"],
    ["superadmin", "web/src/panels/superadmin"],
    ["driver", "web/src/panels/driver"],
    ["parent", "web/src/panels/parent"],
    ["personel", "web/src/panels/personel"],
    ["shared", "web/src/panels/shared"],
    ["components", "web/src/components"],
  ];
  console.log("Directory inventory:");
  for (const [label, root] of groupedRoots) {
    const count = uniqueFiles.filter((relPath) => relPath === "web/src/utils/copilotFacts.js" || relPath === "web/src/utils/labels.js" || relPath.startsWith(root.replace(/\\/g, "/"))).length;
    console.log(`- ${label}: ${count}`);
  }

  for (const { file, mustContain: requiredNeedles, mustNotContain: forbiddenNeedles = [] } of keyFileExpectations) {
    must(exists(file), `${file} exists`);
    const text = fileText.get(file) || read(file);
    for (const needle of requiredNeedles) {
      mustContain(text, needle, `${file} contains ${needle}`);
    }
    for (const needle of forbiddenNeedles) {
      mustNotContain(text, needle, `${file} does not contain ${needle}`);
    }
  }

  must(countMatches(fileText.get("web/src/components/copilot/FloatingCopilotDrawer.jsx"), /if \(!rawPath\) \{\s*setErr\("Bu hızlı aksiyon için geçerli bir hedef bulunamadı\."\);\s*return;\s*\}/s) === 1, "drawer has hard guard for missing quick-action target");
  must(countMatches(fileText.get("web/src/components/copilot/FloatingCopilotDrawer.jsx"), /filterMessageActions\(m\.quickActions, suggestions, m\.followUpPrompt, me\)/g) === 1, "drawer quick-actions are role-aware");

  must(countMatches(fileText.get("web/src/panels/company/OperationsPanel.jsx"), /decisionOwnerRole\s*\|\|\s*"COMPANY"/g) > 0, "company board carries decision owner role");
  must(countMatches(fileText.get("web/src/panels/company/OperationsPanel.jsx"), /Sürücü tarafında karar bekliyor\./g) > 0, "company board shows driver-held note");
  must(countMatches(fileText.get("web/src/panels/company/OperationsPanel.jsx"), /Rota etkisini önizle/g) > 0, "company board has preview button");

  must(countMatches(fileText.get("web/src/panels/school/OperationsPanel.jsx"), /decisionOwnerRole\s*\|\|\s*"COMPANY"/g) > 0, "school board carries decision owner role");
  must(countMatches(fileText.get("web/src/panels/school/OperationsPanel.jsx"), /Sürücü tarafında karar bekliyor\./g) > 0, "school board shows driver-held note");
  must(countMatches(fileText.get("web/src/panels/school/OperationsPanel.jsx"), /Rota etkisini önizle/g) > 0, "school board has preview button");

  must(countMatches(fileText.get("web/src/panels/room/roomOperationsBoard.jsx"), /Kabul et/g) === 0, "room boarding board does not show accept action");
  must(countMatches(fileText.get("web/src/panels/room/roomOperationsBoard.jsx"), /Reddet/g) === 0, "room boarding board does not show reject action");
  must(countMatches(fileText.get("web/src/panels/room/roomOperationsBoard.jsx"), /Readonly önizleme seçildi\./g) > 0, "room boarding board keeps readonly preview note");

  must(countMatches(fileText.get("web/src/panels/room/OperationHealthPanel.jsx"), /Kabul et/g) === 0, "room operation health does not show accept action");
  must(countMatches(fileText.get("web/src/panels/room/OperationHealthPanel.jsx"), /Reddet/g) === 0, "room operation health does not show reject action");

  must(countMatches(fileText.get("web/src/panels/driver/RoutePanel.jsx"), /decisionOwnerRole\s*\|\|\s*"DRIVER"/g) > 0, "driver route owns same-route decisions");
  must(countMatches(fileText.get("web/src/panels/driver/RoutePanel.jsx"), /Kabul et/g) > 0, "driver route shows accept action");
  must(countMatches(fileText.get("web/src/panels/driver/RoutePanel.jsx"), /Reddet/g) > 0, "driver route shows reject action");
  must(countMatches(fileText.get("web/src/panels/driver/RoutePanel.jsx"), /Readonly önizleme — rota uygulanmaz, sürücü rotası yenilenmez, bildirim gönderilmez\./g) > 0, "driver route keeps readonly boundary");

  must(countMatches(fileText.get("web/src/utils/copilotFacts.js"), /fallback = \['Bu ekranda neye bakmalıyım\?'/g) > 0, "copilot facts keep starter-chip fallback");
  must(countMatches(fileText.get("web/src/utils/copilotFacts.js"), /finalizeStarterChips\(/g) > 0, "copilot facts finalize starter chips");
  must(countMatches(fileText.get("web/src/utils/copilotFacts.js"), /readonly kalite puanı/g) > 0, "copilot facts include sefer-score preview chips");
  must(countMatches(fileText.get("web/src/utils/copilotFacts.js"), /hakediş için kalite\/kanıt hazırlık önizlemesi/g) > 0, "copilot facts include quality bridge preview chips");
  must(countMatches(fileText.get("web/src/utils/copilotFacts.js"), /Rota etkisini önizle/g) > 0, "copilot facts include boarding preview chips");

  must(countMatches(fileText.get("web/src/panels/shared/CopilotPanel.jsx"), /Bu bağlantı bu rolde açılamıyor\./g) > 0, "copilot panel guards missing route targets");
  must(countMatches(fileText.get("web/src/panels/shared/CopilotPanel.jsx"), /entryHintQuickActions/g) > 0, "copilot panel exposes quick actions for entry hints");

  must(countMatches(fileText.get("web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx"), /Bir satırdaki ‘Rota etkisini önizle’ butonuna basınca burada readonly önizleme açılır\./g) === 0, "old duplicate placeholder removed");
  must(countMatches(fileText.get("web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx"), /Harita önizlemesi için durak koordinatı eksik\./g) > 0, "preview card has map fallback");
  must(countMatches(fileText.get("web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx"), /Seçimi temizle/g) > 0, "preview card has clear-selection action");
  must(countMatches(fileText.get("web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx"), /Readonly önizleme — rota uygulanmaz, sürücü rotası yenilenmez, bildirim gönderilmez/g) > 0, "preview card keeps readonly boundary");

  const bannedBackendTerms = [
    { rx: /\bpayment\b/i, label: "payment" },
    { rx: /\binvoice\b/i, label: "invoice" },
    { rx: /\bcommission\b/i, label: "commission" },
    { rx: /\bplatform fee\b/i, label: "platform fee" },
    { rx: /\bpenalty\b/i, label: "penalty" },
  ];
  for (const relPath of ["backend/src/services/boardingRouteImpactPreview.js", "backend/src/services/boardingChangeRouteRefresh.js", "backend/src/routes/requests.js", "backend/src/routes/driver.js"]) {
    const text = fileText.get(relPath) || "";
    const termsForFile = relPath === "backend/src/services/boardingRouteImpactPreview.js"
      ? bannedBackendTerms.filter((item) => item.label !== "push")
      : bannedBackendTerms;
    for (const { rx, label } of termsForFile) {
      must(!rx.test(text), `${relPath} does not introduce ${label}`);
    }
  }

  const runtimeDataPaths = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
  ];
  for (const relPath of runtimeDataPaths) {
    must(exists(relPath), `${relPath} still exists outside this audit scope`);
  }

  console.log("=== UI ACTION WIRING AUDIT 01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
