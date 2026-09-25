import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceCorpus = fs.readFileSync(path.join(here, "../src/ai/chat/semanticIntentPlanner.js"), "utf8").toLocaleLowerCase("tr-TR");

const roles = [
  { role: "ROOM", companyKind: "", domain: "vardiya" },
  { role: "COMPANY", companyKind: "COMPANY", domain: "maliyet" },
  { role: "SCHOOL", companyKind: "SCHOOL", domain: "servis" },
  { role: "ORGANIZATION", companyKind: "ORGANIZATION", domain: "plan" },
  { role: "DRIVER", companyKind: "", domain: "durak" },
  { role: "PERSONEL", companyKind: "", domain: "servis" },
  { role: "PARENT", companyKind: "", domain: "çocuk" },
  { role: "SUPER_ADMIN", companyKind: "", domain: "platform" },
];

const variants = {
  CURRENT_SITUATION: [
    ["bugün", "işler"], ["abi", "burda"], ["şu an", "ne oluyor"], ["günün", "tablosu"],
  ],
  ISSUE_DIAGNOSTIC: [
    ["burada", "ne ters"], ["bu işte", "hangi arıza var"], ["abi", "bir aksaklık mı var"], ["şu kayıtta", "problem nedir"],
  ],
  PRIORITY: [
    ["önce neyi", "halledeyim"], ["hangisine", "el atcam"], ["ilk", "neye bakalım"], ["en acil", "olan hangisi"],
  ],
  NEXT_STEP: [
    ["ondan sonra", "ne yapayım"], ["şimdi", "hangi adım"], ["peki", "sonra ne"], ["devamında", "ne gerekiyor"],
  ],
  CAUSE_WHY: [
    ["şunun", "sebebi ne"], ["bunun", "niye böyle"], ["neden", "aksadı"], ["ne yüzünden", "bekliyor"],
  ],
  STATUS: [
    ["vardiya", "ne durumda"], ["servisim", "nasıl"], ["planım", "durumu ne"], ["şu kayıt", "hangi aşamada"],
  ],
  TEMPORAL_STATUS: [
    ["bugünkü", "vardiya"], ["şu an", "aktif sefer"], ["yaklaşan", "durak"], ["geçmiş", "kayıt"],
  ],
  COUNT: [
    ["kaç", "araç var"], ["toplam", "kaç durak"], ["kaç adet", "açık kayıt"], ["sayısı", "nedir"],
  ],
  ENTITY_LOOKUP: [
    ["Vardiya #2", "kim bağlı"], ["34ABC123", "hangi işte"], ["şu vardiya", "aracı hangisi"], ["seçili kayıt", "sürücüsü kim"],
  ],
  COMPARISON: [
    ["hangisi daha", "mantıklı"], ["biri mi diğeri mi", "iyi"], ["iki kaydı", "karşılaştır"], ["alternatiflerden", "hangisi"],
  ],
  COST_TREND: [
    ["maliyet", "arttı mı"], ["bütçe", "değişti mi"], ["gider", "yukarı mı"], ["maliyet", "öncekine göre"],
  ],
  COMMERCIAL_SUMMARY: [
    ["teklif", "neler var"], ["sözleşme", "hangi aşamada"], ["ticari", "özet"], ["açık", "rfq kayıtları"],
  ],
  SERVICE_SUMMARY: [
    ["bugün", "servis ne durumda"], ["servisim", "nasıl gidiyor"], ["saha", "operasyon özeti"], ["sefer", "günlük durum"],
  ],
  PLAN_STATUS: [
    ["planım", "ne durumda"], ["gezi planları", "var mı"], ["organizasyon", "plan özeti"], ["mevcut plan", "hangisi"],
  ],
  LOCATION_GPS: [["konum", "nerede"], ["gps", "canlı mı"], ["rota", "hangi durakta"], ["takip", "güncel mi"]],
  ETA: [["eta", "kaç dk"], ["tahmini süre", "ne kadar"], ["sıradaki durağa", "kaç dakika"], ["varış", "ne zaman"]],
  REQUEST_STATUS: [["servis talebim", "ne durumda"], ["talebim", "bekliyor mu"], ["başvurum", "hangi aşamada"], ["isteğim", "sonuçlandı mı"]],
  APPROVAL_STATUS: [["onay", "bekliyor mu"], ["bekleyen", "onay var mı"], ["kabul", "hangi aşamada"], ["karar", "çıktı mı"]],
  MULTI_DOMAIN_SUMMARY: [["teklif ve sözleşme", "durumu"], ["araç ve sürücü", "özeti"], ["konum ve eta", "birlikte"], ["veli erişimi ve servis planı", "nasıl"]],
  UI_GUIDANCE: [["hangi ekran", "açılır"], ["nereden", "bakayım"], ["hangi menü", "kullanılır"], ["bunu", "nereden yaparım"]],
};

const generated = [];
for (const [family, pairs] of Object.entries(variants)) {
  // This is a focused local guard, not a substitute for the public-tunnel
  // audit. Keep it below the Terra corrective proof limit while retaining a
  // cross-family, cross-role sample of generated (not copied) utterances.
  for (const [left, right] of pairs.slice(0, 1)) {
    for (const role of roles.slice(0, 5)) {
      const query = `${left} ${role.domain} ${right}`.replace(/\s+/g, " ").trim();
      generated.push({ family, query, role });
    }
  }
}

const results = generated.map((item) => {
  const semantic = resolveSemanticIntent({ message: item.query, user: item.role });
  const exactSourceMatch = sourceCorpus.includes(item.query.toLocaleLowerCase("tr-TR"));
  return { ...item, resolved: semantic.family, exactSourceMatch, domains: semantic.requestedDomains, temporalMode: semantic.temporalMode };
});

const exactMatches = results.filter((item) => item.exactSourceMatch).length;
const familyCoverage = Object.fromEntries(Object.keys(variants).map((family) => [family, results.filter((item) => item.family === family && item.resolved === family).length]));
const summary = {
  generatedQueryCount: results.length,
  newlyGeneratedQueryCount: results.filter((item) => !item.exactSourceMatch).length,
  exactSourceMatchRatio: results.length ? exactMatches / results.length : 1,
  familyCoverage,
  roleCount: roles.length,
  semanticPlanner: "resolveSemanticIntent",
};

const focusedLocationSignalCases = [
  { message: "Sürücünün telefon GPS’i devrede mi?", role: "ROOM", expected: "LOCATION_GPS" },
  { message: "Sürücünün telefonundan konum sinyali devrede mi?", role: "ROOM", expected: "LOCATION_GPS" },
  { message: "Sürücünün telefonundan konum bilgisi geliyor mu?", role: "COMPANY", expected: "LOCATION_GPS" },
  { message: "Sürücünün telefon konum sinyali aktif mi?", role: "COMPANY", expected: "LOCATION_GPS" },
  { message: "Sürücü kim?", role: "COMPANY", expected: "CURRENT_SITUATION" },
  { message: "Sürücünün telefonu nedir?", role: "COMPANY", expected: "CURRENT_SITUATION" },
  { message: "Araç 34ABC123 hangisi?", role: "COMPANY", expected: "ENTITY_LOOKUP" },
  { message: "Konum sinyali aktif mi?", role: "COMPANY", expected: "ENTITY_LOOKUP" },
  { message: "Telefon numarası kayıtlı mı?", role: "COMPANY", expected: "CURRENT_SITUATION" },
];
const focusedLocationSignalFailures = focusedLocationSignalCases.filter(({ message, role, expected }) => (
  resolveSemanticIntent({ message, user: { role } }).family !== expected
));
const personelLocationSignal = resolveSemanticIntent({
  message: "Sürücünün telefonundan konum sinyali devrede mi?",
  user: { role: "PERSONEL" },
});
summary.focusedLocationSignalCaseCount = focusedLocationSignalCases.length;
summary.focusedLocationSignalFailureCount = focusedLocationSignalFailures.length;
summary.personelLocationSignalAuthorizationBoundary = personelLocationSignal.family === "AUTHORIZATION_BOUNDARY";

console.log(JSON.stringify(summary, null, 2));
if (summary.exactSourceMatchRatio >= 0.5) process.exitCode = 1;
if (summary.generatedQueryCount < 50 || summary.newlyGeneratedQueryCount < 50) process.exitCode = 1;
if (summary.focusedLocationSignalFailureCount || !summary.personelLocationSignalAuthorizationBoundary) process.exitCode = 1;
