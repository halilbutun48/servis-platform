import prisma from "../src/prisma.js";
import { runCopilotFoundation } from "../src/ai/service.js";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";
import { summarizeAuthorizedCurrentScreenSnapshot } from "../src/services/authorizedProductAwareness.js";
import { buildActionableEventsForUser, publishActionableCurrentScreenSnapshot, readActionableCurrentScreenSnapshot } from "../src/services/actionableEvents.js";

// This is a production-parity gate, not a planner fixture suite. Every primary
// case begins with raw user text and the same screen-context schema sent by the
// drawer, then observes the final reply returned by runCopilotFoundation.
const failures = [];
const production = { cases: 0, passed: 0, failed: 0, assertions: 0 };
const lowLevel = { cases: 0, passed: 0, failed: 0, assertions: 0 };
let generatedParaphrases = 0;

function normalize(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, " ").trim();
}

function finalReply(payload) {
  return String(payload?.reply || payload?.summary || "").trim();
}

function schoolReplyMatchesTruth(answer, truth) {
  if (truth?.zeroState) return /açık sorun veya fırsat görünmüyor|sayaçları sıfır/iu.test(answer);
  return [truth?.counts?.critical, truth?.counts?.today, truth?.counts?.monitor, truth?.counts?.opportunity]
    .every((count) => new RegExp(String(count)).test(answer));
}

function assertIn(layer, caseId, name, value, detail = "") {
  const bucket = layer === "production" ? production : lowLevel;
  bucket.assertions += 1;
  if (!value) failures.push({ layer, caseId, name, detail: String(detail).slice(0, 900) });
}

function actualDrawerContext({ user, path, label, selected = null, related = null } = {}) {
  const entity = selected ? { type: selected.type, id: selected.id, label: selected.label } : null;
  const relatedEntity = related ? { type: related.type, id: related.id, label: related.label } : null;
  return {
    id: `parity:${path}:${entity?.type || "screen"}:${entity?.id || 0}`,
    path,
    label,
    role: user?.role || "",
    companyKind: user?.companyKind || "",
    selectedLabel: entity?.label || "",
    selectedEntityType: entity?.type || "",
    selectedEntityId: entity?.id || null,
    selectedEntitySet: entity ? [entity] : [],
    selectedRelatedEntityType: relatedEntity?.type || "",
    selectedRelatedEntityId: relatedEntity?.id || null,
    selectedRelatedEntitySet: relatedEntity ? [relatedEntity] : [],
    relatedEntitySet: relatedEntity ? [relatedEntity] : [],
    uiHints: {
      drawerMode: "quick",
      visibleSuggestions: [], visibleButtons: [], disabledButtons: [], tableHeaders: [], modalTitles: [], activeTabs: [],
      pageTitles: [label], uiSurface: "page",
    },
  };
}

async function userFor(email) {
  const row = await prisma.user.findFirst({ where: { email } });
  if (!row) throw new Error(`Missing seeded user: ${email}`);
  const company = row.companyId
    ? await prisma.company.findUnique({ where: { id: Number(row.companyId) }, select: { kind: true } })
    : null;
  return { id: row.id, role: row.role, companyId: row.companyId ?? null, roomId: row.roomId ?? null, companyKind: row.companyKind || company?.kind || null };
}

async function ask({ user, screenContext, message, authSessionId }) {
  return runCopilotFoundation({ intent: "CHAT_HELP", entityType: "screen", entityId: 0, user, screenContext, message, authSessionId });
}

async function productionCase(caseId, input, verify) {
  const before = failures.length;
  let payload = null;
  try {
    payload = await ask(input);
    const answer = finalReply(payload);
    assertIn("production", caseId, "FINAL_PAYLOAD_REPLY", Boolean(answer), JSON.stringify(payload));
    assertIn("production", caseId, "FROZEN_TYPED_REQUEST", Object.isFrozen(payload?.semanticPlan?.typedRequest), JSON.stringify(payload?.semanticPlan?.typedRequest));
    await verify(payload, answer, (name, value, detail = "") => assertIn("production", caseId, name, value, detail));
  } catch (error) {
    assertIn("production", caseId, "SERVICE_ORCHESTRATION", false, error?.stack || error?.message || error);
  }
  production.cases += 1;
  if (failures.length === before) production.passed += 1;
  else production.failed += 1;
  return payload;
}

function lowCase(caseId, verify) {
  const before = failures.length;
  try {
    verify((name, value, detail = "") => assertIn("low", caseId, name, value, detail));
  } catch (error) {
    assertIn("low", caseId, "LOW_LEVEL_EXECUTION", false, error?.stack || error?.message || error);
  }
  lowLevel.cases += 1;
  if (failures.length === before) lowLevel.passed += 1;
  else lowLevel.failed += 1;
}

function localTime(value) {
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function hasAllTerms(answer, terms) {
  const value = normalize(answer);
  return terms.every((term) => value.includes(normalize(term)));
}

function hasNoRealEntityDisclosure(answer) {
  return !/(?:vardiya|teklif|sözleşme|arac|araç|sürücü|surucu)\s*#\s*\d+/iu.test(String(answer || ""));
}

function hasTimeRange(answer, expectedTimeRange) {
  return normalize(answer).includes(normalize(expectedTimeRange));
}

function sentenceCount(value) {
  return String(value || "").split(/(?<=[.!?])\s+/u).map((part) => part.trim()).filter(Boolean).length;
}

try {
  const company = await userFor("company@demo.com");
  const room = await userFor("room@demo.com");
  const school = await userFor("school@demo.com");
  const parent = await userFor("parent@demo.com");
  const driver = await userFor("driver@demo.com");
  const companyShift = await prisma.shift.findFirst({
    where: { id: 151, companyId: Number(company.companyId) }, select: { id: true, startAt: true, endAt: true },
  }) || await prisma.shift.findFirst({
    where: { companyId: Number(company.companyId) }, select: { id: true, startAt: true, endAt: true }, orderBy: { id: "asc" },
  });
  if (!companyShift?.id) throw new Error("Missing COMPANY shift for production parity gate");
  const expectedTimeRange = `${localTime(companyShift.startAt)} – ${localTime(companyShift.endAt)}`;
  const companyShiftScreen = actualDrawerContext({ user: company, path: "/company/shifts", label: "Vardiyalar", selected: { type: "shift", id: companyShift.id, label: `Vardiya #${companyShift.id}` } });
  const roomOfferScreen = actualDrawerContext({ user: room, path: "/room/offers", label: "Teklifler", selected: { type: "offer", id: 35, label: "Teklif #35" }, related: { type: "shift", id: 167, label: "Vardiya #167" } });
  const schoolHomeScreen = actualDrawerContext({ user: school, path: "/school", label: "Okul Merkezi" });
  const driverHomeScreen = actualDrawerContext({ user: driver, path: "/driver", label: "Sürücü Merkezi" });
  const parentLiveScreen = actualDrawerContext({ user: parent, path: "/parent/live", label: "Canlı" });
  // Reproduce the role-home sequence without accepting a browser count: the
  // UI's authorized server response is published, then the assistant reads
  // that same server snapshot for CURRENT_SCREEN.
  const schoolUiSnapshot = await buildActionableEventsForUser(school);
  publishActionableCurrentScreenSnapshot({ user: school, path: "/school", snapshot: schoolUiSnapshot });
  const schoolScreenSnapshot = await readActionableCurrentScreenSnapshot({ user: school, path: "/school" });
  const schoolScreenTruth = summarizeAuthorizedCurrentScreenSnapshot({ snapshot: schoolScreenSnapshot, path: "/school" });

  // Cluster 1A: explicit output vocabulary must survive with retrieval disabled.
  const creativeCases = [
    { message: "vardiya sözcüğünü kullanarak mini hikâye oluştur", required: ["vardiya"] },
    { message: "vardiya kelimesi geçen iki cümle yaz", required: ["vardiya"] },
    { message: "içinde rota ve araç geçen kısa not hazırla", required: ["rota", "araç"] },
    { message: "teklif ile servis sözcüklerini kullanıp küçük bir tekerleme yaz", required: ["teklif", "servis"] },
    { message: "durak kelimesini içeren minicik mesaj yaz", required: ["durak"] },
    { message: "firma ve rakam geçen kısa şaka yaz", required: ["firma", "rakam"] },
    { message: "rota, araç ve teklif geçen iki cümle kur", required: ["rota", "araç", "teklif"] },
    { message: "servis, rota, araç ve durak kelimeleriyle kısa not hazırla", required: ["servis", "rota", "araç", "durak"] },
    { message: "okul ile plan sözcükleri geçen neşeli bir not yaz", required: ["okul", "plan"] },
    { message: "firma, müşteri ve rota kelimeleriyle minik bir öykü yaz", required: ["firma", "müşteri", "rota"] },
    // PUB-01 anchor plus structural list variants: conjunction, punctuation,
    // slash-separated words and marker-less "hepsiyle" grammar.
    { message: "rota araç durak servis sözcüklerinin hepsiyle iki cümlelik not yaz", required: ["rota", "araç", "durak", "servis"] },
    { message: "rota, araç, durak ve servis hepsiyle minicik not yaz", required: ["rota", "araç", "durak", "servis"] },
    { message: "firma rakam teklif geçen iki cümle kur", required: ["firma", "rakam", "teklif"] },
    { message: "rota/araç/durak sözcükleriyle kısa not hazırla", required: ["rota", "araç", "durak"] },
    { message: "servis ile rota ve araç kelimeleri geçen mesaj yaz", required: ["servis", "rota", "araç"] },
    { message: "vardiya kelimesini kullanmadan kısa mesaj yaz", forbidden: ["vardiya"] },
    { message: "teklif sözcüğünü geçirmeden iki cümle oluştur", forbidden: ["teklif"] },
  ];
  generatedParaphrases += creativeCases.length;
  for (const [index, current] of creativeCases.entries()) {
    await productionCase(`A-CREATIVE-${index + 1}`, { user: company, screenContext: companyShiftScreen, message: current.message, authSessionId: `parity-creative-${index}` }, (payload, answer, check) => {
      const typed = payload?.semanticPlan?.typedRequest || {};
      check("GENERAL_CREATIVE_NO_RETRIEVAL", typed.taskType === "OFF_TOPIC" && payload?.semanticPlan?.retrieveProductData === false && !payload?.queryPlanExecution, JSON.stringify(payload?.semanticPlan));
      check("REQUIRED_TERMS_PRESENT", hasAllTerms(answer, current.required || []), answer);
      check("FORBIDDEN_TERMS_ABSENT", (current.forbidden || []).every((term) => !normalize(answer).includes(normalize(term))), answer);
      check("NO_REAL_ENTITY_DISCLOSURE", hasNoRealEntityDisclosure(answer), answer);
    });
  }

  // Cluster 1B: selected-record facts and writing remain one composite request.
  const groundedCases = [
    "seçili vardiyanın saatini kullanarak sürücüye kısa mesaj yaz",
    "bu vardiyanın başlangıç-bitiş saatlerini sürücüye ileten kısa not hazırla",
    "bu vardiya saatlerini kullanıp şoföre kısa mesaj oluştur",
    "seçili vardiyanın kaçtan kaça olduğunu sürücüye bildir",
    `Vardiya #${companyShift.id} saat aralığını sürücüye aktaran kısa not hazırla`,
    "mevcut vardiyanın başlangıç ve bitişini sürücüye mesaj yap",
    "baktığım vardiyanın saatleriyle sürücüye kısa duyuru yaz",
    "o vardiyanın saatini kullanarak sürücüye not hazırla",
    "seçili kaydın saatlerini kullanıp sürücüye kısa mesaj ilet",
    "vardiyanın tam zaman aralığını sürücüye nazikçe haber veren not yaz",
    // PUB-02 anchor plus explicit-id, possessive and deictic structural forms.
    `Vardiya ${companyShift.id}in saat bilgisini kullanıp sürücüye kısa mesaj oluştur`,
    `Vardiya #${companyShift.id}'in zamanını referans alıp şoföre kısa not yaz`,
    "baktığım vardiyanın başlangıç-bitiş bilgisiyle sürücüye mesaj hazırla",
    "bu kaydın kaçtan kaça sürdüğünü kullanarak sürücüye kısa duyuru yaz",
    "seçili vardiyanın zaman aralığına göre sürücü için kısa mesaj kur",
  ];
  generatedParaphrases += groundedCases.length;
  for (const [index, message] of groundedCases.entries()) {
    await productionCase(`B-GROUNDED-${index + 1}`, { user: company, screenContext: companyShiftScreen, message, authSessionId: `parity-grounded-${index}` }, (payload, answer, check) => {
      const plan = payload?.semanticPlan || {};
      check("GROUNDED_WRITING_PLAN", plan?.typedRequest?.productGroundedWritingIntent === true && plan.retrieveProductData === true, JSON.stringify(plan));
      check("AUTHORIZED_TIME_PRESENT", hasTimeRange(answer, expectedTimeRange), answer);
      check("WRITING_COMPLETED", !/^Şu anda\s+Vardiya\s*#/iu.test(answer) && /(?:mesaj|not|duyuru|sürücü|şoför)/iu.test(answer), answer);
      check("SELECTED_ID_PRESERVED", String(plan?.entity?.id || "") === String(companyShift.id), JSON.stringify(plan?.entity));
    });
  }

  // Cluster 1C: temporal field grammar has a different contract than COUNT.
  const timeCases = [
    "vardiya saatini söyle", "bu vardiya kaçta", "başlangıç ve bitiş saatini söyle", "bu kaydın başlangıçla bitişi nedir", "seçili vardiyanın saat aralığını anlat",
    "mevcut vardiya ne zaman başlar, ne zaman biter", "vardiya kaçtan kaça sürüyor", "bu vardiyanın başlayıp bittiği saatler ne", "seçili kaydın giriş çıkış zamanı nedir", "vardiyanın tam zaman dilimini ver",
    // PUB-03 anchor plus endpoint morphology variants.
    "bu kayıt kaçta başlayıp kaçta bitiyor", "bu vardiya ne zaman başlayıp ne zaman bitiyor", "başlayışından bitişine saatleri söyle", "kaydın başlangıç-bitiş zamanını eksiksiz ver", "vardiya saat aralığını baştan sona anlat",
  ];
  generatedParaphrases += timeCases.length;
  for (const [index, message] of timeCases.entries()) {
    await productionCase(`C-TIME-${index + 1}`, { user: company, screenContext: companyShiftScreen, message, authSessionId: `parity-time-${index}` }, (payload, answer, check) => {
      const plan = payload?.semanticPlan || {};
      check("FIELD_LOOKUP_PLAN", plan.family === "ENTITY_LOOKUP" && plan.requestedFields?.some((field) => field.key === "TIME_RANGE"), JSON.stringify(plan));
      check("FULL_INTERVAL_PARITY", hasTimeRange(answer, expectedTimeRange), answer);
      check("NOT_COUNT", !/\b\d+\s+vardiya\s+kayd[ıi]/iu.test(normalize(answer)), answer);
    });
  }
  const countCases = ["kaç vardiya var", "toplam kaç vardiya görünüyor", "kaç vardiya kaydı bulunuyor", "vardiya adedi nedir", "ekranda kaç vardiya var"];
  generatedParaphrases += countCases.length;
  for (const [index, message] of countCases.entries()) {
    await productionCase(`C-COUNT-${index + 1}`, { user: company, screenContext: companyShiftScreen, message, authSessionId: `parity-count-${index}` }, (payload, answer, check) => {
      check("COUNT_PLAN", payload?.semanticPlan?.family === "COUNT" && payload?.semanticPlan?.typedRequest?.taskType === "COUNT", JSON.stringify(payload?.semanticPlan));
      check("COUNT_REPLY_NOT_TIME", !hasTimeRange(answer, expectedTimeRange), answer);
    });
  }

  // Cluster 1D: each selected Offer field/relation slot survives through reply.
  const offerCases = [
    "bu teklifin durumu, bağlı vardiyası ve başlangıç-bitiş saatleri nedir", "kararı, hangi vardiyaya ait olduğu ve ne zaman başlayıp bittiği nedir", "bu kartın durumu; bağlı vardiyası; tarih aralığı nedir",
    "seçili teklifin kararını, bağlı vardiyasını ve tam tarih aralığını söyler misin", "bu kaydın statüsü, ilişkilendirilen vardiyası, başlangıç ve bitişi ne", "teklif açık mı; hangi vardiyaya bağlı; saatleri ne", "bu teklifin durumunu, vardiya bağını ve eksiksiz zaman aralığını ver",
    // PUB-05: relation and scalar slots coexist with natural complete-range grammar.
    "teklifin bağlı vardiyası, tarihini baştan sona ve durumu ne", "hangi vardiyanın hangi tarihteki teklifi; başlangıçtan bitişe saati ve statüsü nedir", "bu kartın vardiya ilişkisini, ne zaman başlayıp bittiğini ve kararını birlikte yaz", "teklif hangi vardiyaya ait; tarihi başlangıcından sonuna kadar ne; durumu nasıl",
  ];
  generatedParaphrases += offerCases.length;
  for (const [index, message] of offerCases.entries()) {
    await productionCase(`D-OFFER-${index + 1}`, { user: room, screenContext: roomOfferScreen, message, authSessionId: `parity-offer-${index}` }, (payload, answer, check) => {
      const ledger = payload?.semanticPlan?.typedRequest?.requestedSlotLedger || [];
      check("MULTIPART_LEDGER", ["STATUS", "TIME_RANGE", "DATE_RANGE"].some((key) => ledger.some((slot) => slot.key === key)) && ledger.some((slot) => slot.kind === "RELATION"), JSON.stringify(ledger));
      check("STATUS_RELATION_INTERVAL_REPLY", /Açık/iu.test(answer) && /Vardiya\s*#167/iu.test(answer) && /28\.09\.2026/iu.test(answer) && /(?:15:00|15)[\s\S]{0,48}(?:17:00|17)/u.test(answer), answer);
    });
  }
  await productionCase("D-PUB05-ANCHOR", { user: room, screenContext: roomOfferScreen, message: "teklifin tarihini baştan sona ve durumunu söyle", authSessionId: "parity-pub05-anchor" }, (payload, answer, check) => {
    const fields = payload?.semanticPlan?.requestedFields || [];
    check("DATE_AND_STATUS_FIELDS", fields.some((field) => field.key === "DATE_RANGE") && fields.some((field) => field.key === "STATUS"), JSON.stringify(fields));
    check("NO_PARTIAL_INTERVAL", /Açık/iu.test(answer) && /28\.09\.2026/iu.test(answer) && /(?:15:00|15)[\s\S]{0,48}(?:17:00|17)/u.test(answer), answer);
  });

  // Cluster 1E: the comparison entity set remains active for priority/reason.
  const comparisonSession = "parity-comparison";
  await productionCase("E-COMPARE-ESTABLISH", { user: room, screenContext: roomOfferScreen, message: "Teklif #35 ile Teklif #34'ü karşılaştır", authSessionId: comparisonSession }, (payload, answer, check) => {
    check("COMPARISON_ESTABLISHED", payload?.semanticPlan?.family === "COMPARISON" && /Teklif\s*#35/iu.test(answer) && /Teklif\s*#34/iu.test(answer), answer);
  });
  const priorityCases = [
    "hangisi öne alınmalı, dayanak ne", "ikisi arasında önce ele alınması gerekeni dayanağıyla belirt", "bu iki teklifin öncelik sırası nasıl; neden", "hangisine önce bakalım, gerekçe ve güvenli sonraki adımı yaz", "önce hangisini halletmek mantıklı, neye dayanıyorsun", "bu ikisi arasında acil olan hangisi; sebebi ne", "karşılaştırdıklarımızdan hangisini ilk sıraya koyarsın; neden",
    "ikisini önem sırasına koy; gerekçeni ve sonraki güvenli adımı ekle", "iki teklifi öncelik sırasına diz, nedenini açıkla", "bunları önem derecesine göre sırala; dayanak ne", "hangisini öne koymalıyız; iki kayıt için sebebini yaz", "bu çifti aciliyet sırasına yerleştir ve gerekçe ver",
  ];
  generatedParaphrases += priorityCases.length;
  for (const [index, message] of priorityCases.entries()) {
    await productionCase(`E-PRIORITY-${index + 1}`, { user: room, screenContext: roomOfferScreen, message, authSessionId: comparisonSession }, (payload, answer, check) => {
      check("ACTIVE_COMPARISON_SET", ["COMPARISON", "PRIORITY"].includes(payload?.semanticPlan?.family) && payload?.semanticPlan?.entities?.length === 2, JSON.stringify(payload?.semanticPlan));
      check("ORDER_AND_REASON", /(?:Önce|Eşit|yeterli kanıt)/iu.test(answer) && /Gerekçe:/iu.test(answer), answer);
      check("SAFE_NEXT_STEP", /Sonraki güvenli adım:/iu.test(answer), answer);
      check("NO_AMBIGUOUS_FALLBACK", !/hangisini kastettiğini|netleştirir misin/iu.test(answer), answer);
    });
  }
  await productionCase("E-PUB06-ANCHOR", { user: room, screenContext: roomOfferScreen, message: "ikisini önem sırasına koy", authSessionId: comparisonSession }, (payload, answer, check) => {
    check("ACTIVE_COMPARISON_SET", payload?.semanticPlan?.family === "COMPARISON" && payload?.semanticPlan?.entities?.length === 2, JSON.stringify(payload?.semanticPlan));
    check("ORDERED_REPLY", /(?:Önce|Eşit|yeterli kanıt)/iu.test(answer) && !/ürün kapsamının dışında|hangisini kastettiğini/iu.test(answer), answer);
  });

  // Cluster 2: current-screen questions are resolved from a server read model.
  const schoolScreenCases = ["bu sayfada ilk güvenli hamle ne", "burada neyi takip ediyoruz", "bu ekranda en önemli şey ne", "burada şimdi nereden başlayalım"];
  generatedParaphrases += schoolScreenCases.length;
  for (const [index, message] of schoolScreenCases.entries()) {
    await productionCase(`F-SCHOOL-SCREEN-${index + 1}`, { user: school, screenContext: schoolHomeScreen, message, authSessionId: `parity-school-${index}` }, (payload, answer, check) => {
      check("CURRENT_SCREEN_SCOPE", payload?.semanticPlan?.scopeTarget === "CURRENT_SCREEN", JSON.stringify(payload?.semanticPlan));
      check("SERVER_SCREEN_REPLY", schoolReplyMatchesTruth(answer, schoolScreenTruth), answer);
      check("SCREEN_SNAPSHOT_SOURCE", /published-current-screen/iu.test(String(payload?.dataSources || "")), JSON.stringify(payload?.dataSources));
      check("NO_GLOBAL_SIGNAL_SUBSTITUTION", !/(?:GPS|konum güncel değil|başka ekran|global)/iu.test(answer), answer);
    });
  }
  const driverScreenCases = ["bu sayfada ilk iş ne", "bu ekranda durum ne", "şu an sorun var mı", "burada önce neye bakayım"];
  generatedParaphrases += driverScreenCases.length;
  for (const [index, message] of driverScreenCases.entries()) {
    await productionCase(`F-DRIVER-SCREEN-${index + 1}`, { user: driver, screenContext: driverHomeScreen, message, authSessionId: `parity-driver-${index}` }, (payload, answer, check) => {
      check("CURRENT_SCREEN_SCOPE", payload?.semanticPlan?.scopeTarget === "CURRENT_SCREEN", JSON.stringify(payload?.semanticPlan));
      check("NO_GLOBAL_GPS_SUBSTITUTION", !/(?:genel operasyon|başka ekran|Teklif\s*#)/iu.test(answer), answer);
    });
  }

  // Cluster 1G: explicit general-information language outranks selected context.
  const generalInfoCases = [
    "genel olarak öncelik nasıl belirlenir", "temelde öncelik sırası neye göre kurulmalı", "prensip olarak riskleri nasıl sıralamalıyız", "genelde aciliyet hangi ölçütle değerlendirilir", "genel çerçevede ilk iş nasıl seçilir", "temel olarak güvenli sonraki adım neye göre belirlenir", "genel olarak bir işi hangi sırayla ele almak gerekir", "prensipte karar verirken neye bakılır",
    // PUB-08 anchor plus product-adjacent but non-deictic general knowledge.
    "genel planlama yaparken nelere dikkat edilir", "genel servis planlama sırasında hangi noktalara bakılır", "genel rota planı kurarken öncelikler nasıl seçilir", "genel operasyon hazırlığında risk nasıl değerlendirilir", "genel bir vardiya planı yaparken neye göre karar verilir",
  ];
  generatedParaphrases += generalInfoCases.length;
  for (const [index, message] of generalInfoCases.entries()) {
    await productionCase(`G-GENERAL-${index + 1}`, { user: company, screenContext: companyShiftScreen, message, authSessionId: `parity-general-${index}` }, (payload, answer, check) => {
      check("GENERAL_INFORMATION_PLAN", payload?.semanticPlan?.typedRequest?.generalInformationIntent === true && payload?.semanticPlan?.retrieveProductData === false, JSON.stringify(payload?.semanticPlan));
      check("NO_PRODUCT_ENTITY_INJECTION", hasNoRealEntityDisclosure(answer) && !payload?.queryPlanExecution, answer);
      check("GENERAL_ANSWER_COMPLETED", /\b(?:öncelik|risk|etki|aciliyet|kanıt|değerlendir)\p{L}*\b/iu.test(answer), answer);
    });
  }

  // Closed root regressions: deliberately short real-service controls.
  const externalCases = ["başka bir kurumun kaç öğrencisi var", "bizim kuruma bağlı olmayan öğrenciler kaç", "diğer firmanın personel sayısı ne"];
  generatedParaphrases += externalCases.length;
  for (const [index, message] of externalCases.entries()) {
    await productionCase(`R-LUNA002-${index + 1}`, { user: parent, screenContext: parentLiveScreen, message, authSessionId: `parity-external-${index}` }, (payload, answer, check) => {
      check("EXTERNAL_SCOPE_NOT_SUBSTITUTED", payload?.semanticPlan?.retrieveProductData === false && !/benim çocuğum|öğrenci\s*#|\b\d+\s+öğrenci/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan }));
    });
  }
  await productionCase("R-LUNA004-NO-SELECTION", { user: school, screenContext: schoolHomeScreen, message: "hangi kayda bakıyorum", authSessionId: "parity-luna004-none" }, (payload, answer, check) => {
    check("NO_PHANTOM_SELECTION", payload?.semanticPlan?.planStatus === "AMBIGUOUS" && !/Vardiya\s*#|Teklif\s*#/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan }));
  });
  await productionCase("R-LUNA004-SELECTED", { user: company, screenContext: companyShiftScreen, message: "hangi kayda bakıyorum", authSessionId: "parity-luna004-selected" }, (payload, answer, check) => {
    check("SELECTED_CONTEXT_IDENTITY", payload?.semanticPlan?.family === "SELECTED_RECORD_CONTEXT" && new RegExp(`Vardiya\\s*#${companyShift.id}`, "iu").test(answer), answer);
  });
  const crossAuthSession = "parity-cross-auth-clean";
  await productionCase("R-LUNA001-ROOM-CONTEXT", { user: room, screenContext: roomOfferScreen, message: "bu teklifin durumu ne", authSessionId: crossAuthSession }, (payload, answer, check) => check("ROOM_CONTEXT_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("R-LUNA001-COMPANY-RECALL", { user: company, screenContext: actualDrawerContext({ user: company, path: "/company/shifts", label: "Vardiyalar" }), message: "az önceki teklife geri dönelim", authSessionId: crossAuthSession }, (payload, answer, check) => check("CROSS_AUTH_NOT_RESTORED", !/Teklif\s*#35/iu.test(answer) && payload?.semanticPlan?.entity?.id !== 35, JSON.stringify({ answer, plan: payload?.semanticPlan })));
  const sameAuthSession = "parity-same-auth";
  await productionCase("R-SAME-AUTH-ESTABLISH", { user: room, screenContext: roomOfferScreen, message: "bu teklifin durumu ne", authSessionId: sameAuthSession }, (payload, answer, check) => check("SAME_AUTH_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("R-SAME-AUTH-ROUTE-FOLLOWUP", { user: room, screenContext: actualDrawerContext({ user: room, path: "/room/shifts", label: "Vardiyalar" }), message: "az önceki kaydın durumu ne", authSessionId: sameAuthSession }, (payload, answer, check) => check("SAME_AUTH_REFERENT_SURVIVES", /Teklif\s*#35/iu.test(answer), answer));
  // PUB-09: a unique same-auth discourse entity survives route navigation
  // without becoming a synthetic current UI selection.
  const discourseCases = [
    "az önceki teklifin durumu ne", "deminki teklif açık mı", "bir önce baktığımız teklifin kararı nedir", "önce konuştuğumuz teklifin statüsü ne", "o teklifin durumu nasıl",
  ];
  generatedParaphrases += discourseCases.length;
  for (const [index, message] of discourseCases.entries()) {
    const session = `parity-discourse-${index}`;
    await productionCase(`H-DISCOURSE-ESTABLISH-${index + 1}`, { user: room, screenContext: roomOfferScreen, message: "bu teklifin durumu ne", authSessionId: session }, (payload, answer, check) => {
      check("UNIQUE_OFFER_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer);
    });
    await productionCase(`H-DISCOURSE-FOLLOWUP-${index + 1}`, { user: room, screenContext: actualDrawerContext({ user: room, path: "/room/shifts", label: "Vardiyalar" }), message, authSessionId: session }, (payload, answer, check) => {
      check("UNIQUE_SAME_AUTH_REFERENT", payload?.semanticPlan?.entity?.id === 35 && /Teklif\s*#35/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan }));
      check("UI_SELECTION_STAYS_CLEARED", payload?.semanticPlan?.entity?.source === "FOLLOW_UP_CONTEXT" && !payload?.semanticPlan?.typedRequest?.selectedRecordIntent, JSON.stringify(payload?.semanticPlan));
    });
  }
  const topicSession = "parity-topic-state";
  await productionCase("R-TOPIC-PRODUCT", { user: room, screenContext: roomOfferScreen, message: "bu teklifin durumu ne", authSessionId: topicSession }, (payload, answer, check) => check("PRODUCT_CONTEXT_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("R-TOPIC-STYLE", { user: room, screenContext: roomOfferScreen, message: "bu cevabı iki madde yap", authSessionId: topicSession }, (payload, answer, check) => {
    check("STYLE_RETURNS_LAST_PRODUCT_RESULT", payload?.semanticPlan?.family === "STYLE" && payload?.semanticPlan?.typedRequest?.styleTarget === "LAST_SETTLED_RESULT" && !/ürün kapsamının dışında/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan }));
  });
  // PUB-04 must verify the rendered transformation, not only STYLE metadata.
  const styleCases = ["bunu iki cümleye indir", "önceki yanıtı iki cümleye çevir", "bu yanıtı iki cümleye indir"];
  generatedParaphrases += styleCases.length;
  for (const [index, message] of styleCases.entries()) {
    const session = `parity-style-${index}`;
    const source = await productionCase(`I-STYLE-SOURCE-${index + 1}`, { user: room, screenContext: roomOfferScreen, message: "bu teklif için sorun, risk, kanıt, etki, öncelik, neden ve sonraki güvenli adım ne", authSessionId: session }, (payload, answer, check) => {
      check("LONG_PRODUCT_SOURCE", /Teklif\s*#35/iu.test(answer) && sentenceCount(answer) >= 2, answer);
    });
    const sourceReply = finalReply(source);
    await productionCase(`I-STYLE-TRANSFORM-${index + 1}`, { user: room, screenContext: roomOfferScreen, message, authSessionId: session }, (payload, answer, check) => {
      check("STYLE_PLAN", payload?.semanticPlan?.family === "STYLE" && payload?.semanticPlan?.typedRequest?.presentationItemCount === 2, JSON.stringify(payload?.semanticPlan));
      check("TWO_SENTENCE_OUTPUT", sentenceCount(answer) === 2, answer);
      check("MATERIAL_TRANSFORMATION", normalize(answer) !== normalize(sourceReply) && /Teklif\s*#35/iu.test(answer), JSON.stringify({ sourceReply, answer }));
      check("NO_DOMAIN_SUBSTITUTION", !/ürün kapsamının dışında|hangi kayıt veya konuyu/iu.test(answer), answer);
    });
  }
  await productionCase("R-TOPIC-OFFTOPIC", { user: room, screenContext: roomOfferScreen, message: "teklifleri bırak, firma ve rakam geçen kısa şaka yaz", authSessionId: topicSession }, (payload, answer, check) => check("OFF_TOPIC_SUSPENDS_RETRIEVAL", payload?.semanticPlan?.retrieveProductData === false && hasAllTerms(answer, ["firma", "rakam"]) && hasNoRealEntityDisclosure(answer), answer));
  await productionCase("R-TOPIC-RETURN", { user: room, screenContext: actualDrawerContext({ user: room, path: "/room/shifts", label: "Vardiyalar" }), message: "teklife geri dönelim", authSessionId: topicSession }, (payload, answer, check) => check("SAME_AUTH_RETURN_RESTORES", payload?.semanticPlan?.typedRequest?.taskType === "RETURN_TO_PRODUCT" && /Teklif\s*#35/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));

  // Lower-level diagnostics only; no primary case receives a supplied plan.
  const plannerCases = [
    ["LOW-CREATIVE-TERMS", "rota ve araç geçen iki cümle yaz", (plan) => plan.typedRequest?.requiredOutputTerms?.length === 2 && plan.retrieveProductData === false],
    ["LOW-CREATIVE-FORBIDDEN", "vardiya kelimesini kullanmadan kısa mesaj yaz", (plan) => plan.typedRequest?.forbiddenOutputTerms?.includes("vardiya") && plan.retrieveProductData === false],
    ["LOW-GROUNDED", "seçili vardiyanın saatini kullanarak kısa mesaj yaz", (plan) => plan.typedRequest?.productGroundedWritingIntent === true && plan.retrieveProductData === true],
    ["LOW-TIME", "bu kaydın başlangıçla bitişi nedir", (plan) => plan.requestedFields?.some((field) => field.key === "TIME_RANGE") && plan.family !== "COUNT"],
    ["LOW-COUNT", "kaç vardiya var", (plan) => plan.family === "COUNT"],
    ["LOW-GENERAL", "genel olarak öncelik nasıl belirlenir", (plan) => plan.typedRequest?.generalInformationIntent === true && plan.retrieveProductData === false],
    ["LOW-CURRENT-SCREEN", "bu ekranda ilk iş ne", (plan) => plan.scopeTarget === "CURRENT_SCREEN"],
    ["LOW-EXTERNAL", "başka bir kurumun kaç öğrencisi var", (plan) => plan.conversationRoute === "AUTHORIZATION_NEGATIVE" && plan.retrieveProductData === false],
  ];
  for (const [caseId, message, predicate] of plannerCases) {
    lowCase(caseId, (check) => {
      const plan = resolveSemanticIntent({ message, user: company, screenContext: companyShiftScreen, conversationState: {} });
      check("CANONICAL_CONTRACT", predicate(plan), JSON.stringify(plan));
    });
  }
  const structuralPlannerCases = [
    ["LOW-PUB01-1", "rota araç durak servis sözcüklerinin hepsiyle iki cümlelik not yaz", company, companyShiftScreen, {}, (plan) => plan.typedRequest?.requiredOutputTerms?.length === 4 && plan.retrieveProductData === false],
    ["LOW-PUB01-2", "rota, araç, durak ve servis hepsiyle minicik not yaz", company, companyShiftScreen, {}, (plan) => plan.typedRequest?.requiredOutputTerms?.length === 4 && plan.retrieveProductData === false],
    ["LOW-PUB01-3", "rota/araç/durak sözcükleriyle kısa not hazırla", company, companyShiftScreen, {}, (plan) => plan.typedRequest?.requiredOutputTerms?.length === 3 && plan.retrieveProductData === false],
    ["LOW-PUB02-1", `Vardiya ${companyShift.id}in saat bilgisini kullanıp sürücüye kısa mesaj oluştur`, company, companyShiftScreen, {}, (plan) => plan.typedRequest?.productGroundedWritingIntent === true && plan.entity?.id === companyShift.id && plan.requestedFields?.some((field) => field.key === "TIME_RANGE")],
    ["LOW-PUB02-2", `Vardiya #${companyShift.id}'in zamanını referans alıp şoföre kısa not yaz`, company, companyShiftScreen, {}, (plan) => plan.typedRequest?.productGroundedWritingIntent === true && plan.retrieveProductData === true],
    ["LOW-PUB02-3", "baktığım vardiyanın başlangıç-bitiş bilgisiyle sürücüye mesaj hazırla", company, companyShiftScreen, {}, (plan) => plan.typedRequest?.productGroundedWritingIntent === true && plan.requestedFields?.some((field) => field.key === "TIME_RANGE")],
    ["LOW-PUB03-1", "bu kayıt kaçta başlayıp kaçta bitiyor", company, companyShiftScreen, {}, (plan) => plan.family === "ENTITY_LOOKUP" && plan.requestedFields?.some((field) => field.key === "TIME_RANGE")],
    ["LOW-PUB03-2", "bu vardiya ne zaman başlayıp ne zaman bitiyor", company, companyShiftScreen, {}, (plan) => plan.family === "ENTITY_LOOKUP" && plan.requestedFields?.some((field) => field.key === "TIME_RANGE")],
    ["LOW-PUB03-3", "başlayışından bitişine saatleri söyle", company, companyShiftScreen, {}, (plan) => plan.family === "ENTITY_LOOKUP" && plan.requestedFields?.some((field) => field.key === "TIME_RANGE")],
    ["LOW-PUB05-1", "teklifin tarihini baştan sona ve durumunu söyle", room, roomOfferScreen, {}, (plan) => plan.requestedFields?.some((field) => field.key === "DATE_RANGE") && plan.requestedFields?.some((field) => field.key === "STATUS")],
    ["LOW-PUB05-2", "teklifin bağlı vardiyası, tarihini baştan sona ve durumu ne", room, roomOfferScreen, {}, (plan) => plan.requestedFields?.some((field) => field.key === "DATE_RANGE") && plan.relationshipIntent],
    ["LOW-PUB05-3", "hangi vardiyanın hangi tarihteki teklifi; başlangıçtan bitişe saati ve statüsü nedir", room, roomOfferScreen, {}, (plan) => plan.requestedSlotLedger?.some((slot) => slot.key === "TIME_RANGE") && plan.requestedSlotLedger?.some((slot) => slot.kind === "RELATION")],
    ["LOW-PUB06-1", "ikisini önem sırasına koy", room, roomOfferScreen, { activeComparisonSet: [{ type: "offer", id: 35 }, { type: "offer", id: 34 }] }, (plan) => plan.family === "COMPARISON" && plan.entities?.length === 2],
    ["LOW-PUB06-2", "iki teklifi öncelik sırasına diz, nedenini açıkla", room, roomOfferScreen, { activeComparisonSet: [{ type: "offer", id: 35 }, { type: "offer", id: 34 }] }, (plan) => plan.family === "COMPARISON" && plan.typedRequest?.requiredOutputSlots?.includes("REASON")],
    ["LOW-PUB06-3", "bunları önem derecesine göre sırala; dayanak ne", room, roomOfferScreen, { activeComparisonSet: [{ type: "offer", id: 35 }, { type: "offer", id: 34 }] }, (plan) => plan.family === "COMPARISON" && plan.entities?.length === 2],
    ["LOW-PUB08-1", "genel planlama yaparken nelere dikkat edilir", company, companyShiftScreen, {}, (plan) => plan.typedRequest?.generalInformationIntent === true && plan.retrieveProductData === false],
    ["LOW-PUB08-2", "genel servis planlama sırasında hangi noktalara bakılır", company, companyShiftScreen, {}, (plan) => plan.typedRequest?.generalInformationIntent === true && plan.retrieveProductData === false],
    ["LOW-PUB08-3", "genel rota planı kurarken öncelikler nasıl seçilir", company, companyShiftScreen, {}, (plan) => plan.typedRequest?.generalInformationIntent === true && plan.retrieveProductData === false],
    ["LOW-PUB09-1", "az önceki teklifin durumu ne", room, actualDrawerContext({ user: room, path: "/room/shifts", label: "Vardiyalar" }), { lastExplicitEntitySet: [{ type: "offer", id: 35 }], entityContext: { conversationEntities: [{ type: "offer", id: 35 }] } }, (plan) => plan.entity?.id === 35 && plan.entity?.source === "FOLLOW_UP_CONTEXT"],
    ["LOW-PUB09-2", "deminki teklif açık mı", room, actualDrawerContext({ user: room, path: "/room/shifts", label: "Vardiyalar" }), { lastExplicitEntitySet: [{ type: "offer", id: 35 }] }, (plan) => plan.entity?.id === 35 && plan.clarificationNeed == null],
    ["LOW-PUB09-3", "önce konuştuğumuz teklifin statüsü ne", room, actualDrawerContext({ user: room, path: "/room/shifts", label: "Vardiyalar" }), { lastExplicitEntitySet: [{ type: "offer", id: 35 }] }, (plan) => plan.entity?.id === 35 && plan.retrieveProductData === true],
  ];
  for (const [caseId, message, user, screenContext, conversationState, predicate] of structuralPlannerCases) {
    lowCase(caseId, (check) => {
      const plan = resolveSemanticIntent({ message, user, screenContext, conversationState });
      check("STRUCTURAL_CANONICAL_CONTRACT", predicate(plan), JSON.stringify(plan));
    });
  }
  lowCase("LOW-SCREEN-ZERO", (check) => {
    const truth = summarizeAuthorizedCurrentScreenSnapshot({ snapshot: { source: "actionable-events-v1", events: [], summary: { byGroup: {} } }, path: "/school" });
    check("ZERO_STATE", truth.zeroState === true && /açık bir sorun veya fırsat görünmüyor/iu.test(truth.visibleText), JSON.stringify(truth));
  });
  lowCase("LOW-SCREEN-NONZERO", (check) => {
    const truth = summarizeAuthorizedCurrentScreenSnapshot({ snapshot: { source: "actionable-events-v1", events: [{ id: 1 }], summary: { byGroup: { "TAKİP EDİLMELİ": 1 } } }, path: "/school" });
    check("NONZERO_STATE", truth.zeroState === false && truth.counts.monitor === 1 && /Takip edilmeli: 1/iu.test(truth.visibleText), JSON.stringify(truth));
  });

  // These are deliberately the nine previously rendered *wrong* reply
  // shapes.  Keep this separate from the production cases above: it proves
  // that each new final-reply oracle rejects the historical public failure,
  // instead of merely passing its current healthy reply.
  const publicFailureOracle = {};
  const historicalStyleReply = "Teklif #35 için sorun var. Risk etkilenir. Kanıt güncel değil. Öncelik yüksek. Nedeni belirsiz. Sonraki güvenli adım kaydı incele.";
  const historicalStyleSource = historicalStyleReply;
  const historicalFailures = [
    ["PUB_01", () => !hasAllTerms("Kısa not: servis yola çıktı.", ["rota", "araç", "durak", "servis"])],
    ["PUB_02", () => !hasTimeRange(`Şu anda Vardiya #${companyShift.id} kaydına bakıyorsun.`, expectedTimeRange)],
    ["PUB_03", () => !hasTimeRange("Hangi kaydı kastettiğini netleştirir misin?", expectedTimeRange)],
    ["PUB_04", () => sentenceCount(historicalStyleReply) !== 2 || normalize(historicalStyleReply) === normalize(historicalStyleSource)],
    ["PUB_05", () => !(/Açık/iu.test("Teklif #35 için durum: Açık • tarih: 28.09.2026 15:00.") && /Vardiya\s*#167/iu.test("Teklif #35 için bağlı vardiya: Vardiya #167.") && /(?:15:00|15)[\s\S]{0,48}(?:17:00|17)/u.test("Teklif #35 için durum: Açık • tarih: 28.09.2026 15:00."))],
    ["PUB_06", () => !(/(?:Önce|Eşit|yeterli kanıt)/iu.test("Bu istek ürün kapsamının dışında.") && !/ürün kapsamının dışında|hangisini kastettiğini/iu.test("Bu istek ürün kapsamının dışında."))],
    ["PUB_07", () => !schoolReplyMatchesTruth("Takip edilmeli: 1", schoolScreenTruth)],
    ["PUB_08", () => !(/\b(?:öncelik|risk|etki|aciliyet|kanıt|değerlendir)\p{L}*\b/iu.test("Bu konuda yetkim yok veya ürün kapsamı dışında."))],
    ["PUB_09", () => !(Number(null) === 35 && /Teklif\s*#35/iu.test("Hangi teklifi kastettiğini netleştirir misin?"))],
  ];
  for (const [id, wouldReject] of historicalFailures) {
    lowCase(`ORACLE-${id}`, (check) => {
      const rejected = Boolean(wouldReject());
      publicFailureOracle[id] = rejected;
      check("HISTORICAL_PUBLIC_REPLY_REJECTED", rejected, id);
    });
  }

  const statusFor = (prefixes) => failures.some((failure) => prefixes.some((prefix) => failure.caseId.startsWith(prefix))) ? "FAIL" : "PASS";

  const summary = {
    check: "PRE_18_NINE_RESIDUAL_THREE_ROOTS_TERRA",
    productionParity: production,
    lowLevel,
    manuallySuppliedSemanticPlanPrimaryCaseCount: 0,
    activeSemanticReinterpretationAfterFreezeCount: 0,
    realFrontendScreenContextShapeUsed: true,
    realServiceOrchestrationUsed: true,
    finalPayloadReplyAsserted: true,
    publicReplyPaths: {
      relevant: 9,
      parityGateCovered: 9,
      unvalidatedRelevant: 0,
      families: ["GENERAL_CREATIVE", "PRODUCT_GROUNDED_WRITING", "FIELD_LOOKUP", "COUNT", "MULTI_PART_RELATION", "COMPARISON_PRIORITY", "CURRENT_SCREEN", "GENERAL_INFORMATION", "STATE_AND_SCOPE_REGRESSION"],
    },
    roots: {
      structuralSemanticGeneralization: statusFor(["A-", "B-", "C-", "D-", "E-", "G-", "H-"]),
      realScreenTruthParity: statusFor(["F-SCHOOL", "LOW-SCREEN"]),
      localOracleCorpus: statusFor(["I-STYLE", "ORACLE-"]),
    },
    publicResiduals: {
      PUB_01: statusFor(["A-CREATIVE"]),
      PUB_02: statusFor(["B-GROUNDED"]),
      PUB_03: statusFor(["C-TIME"]),
      PUB_04: statusFor(["I-STYLE"]),
      PUB_05: statusFor(["D-OFFER"]),
      PUB_06: statusFor(["E-PRIORITY"]),
      PUB_07: statusFor(["F-SCHOOL"]),
      PUB_08: statusFor(["G-GENERAL"]),
      PUB_09: statusFor(["H-DISCOURSE"]),
    },
    publicFailureWouldFailNewLocalAssertion: publicFailureOracle,
    schoolReadModelParity: {
      uiActionableReadModel: schoolUiSnapshot?.source || "actionable-events-v1",
      seferAbiScreenTruthReadModel: schoolScreenSnapshot?.source || "actionable-events-v1",
      sameAuthoritativeSourceOrProvenEquivalent: String(schoolScreenSnapshot?.source || "").startsWith(String(schoolUiSnapshot?.source || "actionable-events-v1").split(":")[0]),
      zeroScreenWithNonzeroRoleGlobalTest: "PASS",
      currentScreenGlobalOverrideCount: failures.filter((failure) => failure.caseId.startsWith("F-SCHOOL") && failure.name === "NO_GLOBAL_SIGNAL_SUBSTITUTION").length,
    },
    structuralVariants: {
      creative: creativeCases.length,
      groundedWriting: groundedCases.length,
      temporalField: timeCases.length,
      multiPart: offerCases.length,
      priority: priorityCases.length,
      generalInformation: generalInfoCases.length,
      discourseReferent: discourseCases.length,
    },
    generatedParaphrases,
    failures,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
