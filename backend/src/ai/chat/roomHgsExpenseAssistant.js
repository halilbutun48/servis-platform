const FINANCE_PATH = "/room/financial-operations";
const HGS_CATEGORY_KEY = "HGS_TOLL";

function text(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function positiveId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function formatMinor(value, currencyCode = "TRY") {
  const amountMinor = Number(value);
  if (!Number.isFinite(amountMinor)) return "belirsiz";
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
  const code = text(currencyCode).toUpperCase() || "TRY";
  return `${formatted} ${code === "TRY" ? "TL" : code}`;
}

function formatDate(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "tarih belirsiz";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function selectedShiftId(screenContext = {}) {
  return positiveId(
    screenContext?.structuredFacts?.selectedShiftId
      || screenContext?.structuredFacts?.focusShiftId
      || screenContext?.selectedEntityId,
  );
}

function currentTopic(conversationState = {}) {
  const explicitTopic = text(
    conversationState?.activeTopic
      || conversationState?.conversationState?.activeTopic
      || conversationState?.roomCost?.subject,
  ).toUpperCase();
  if (explicitTopic) return explicitTopic;

  // The browser keeps the recent conversation turns, while the canonical
  // wrapper intentionally does not invent a topic field for read-only
  // adapters.  Recover only this narrow, unambiguous HGS topic from the
  // recent turns so a follow-up such as “hangi sefere?” stays on the same
  // server-owned record instead of falling through to generic guidance.
  const recentMessages = Array.isArray(conversationState?.recentMessages)
    ? conversationState.recentMessages
    : [];
  const recentText = recentMessages
    .map((entry) => text(entry?.text))
    .filter(Boolean)
    .join(" ");
  return /(?:hgs|geçiş|gecis|otoyol|köprü|kopru|toll)/iu.test(recentText)
    ? "ROOM_HGS_EXPENSE"
    : "";
}

export function isRoomHgsExpenseQuestion({ user = {}, screenContext = {}, message = "", conversationState = {} } = {}) {
  if (text(user?.role).toUpperCase() !== "ROOM") return false;
  if (text(screenContext?.path).split("?")[0] !== FINANCE_PATH) return false;
  const view = text(screenContext?.structuredFacts?.financeView || screenContext?.structuredFacts?.activeTab).toLowerCase();
  if (view !== "service-cost") return false;
  const value = normalized(message);
  const explicitHgs = /\b(?:hgs|gecis|otoyol|kopru|koprü|toll)\b/u.test(value)
    || /\bgecis\s+gideri\b/u.test(value);
  const hgsFollowUp = currentTopic(conversationState) === "ROOM_HGS_EXPENSE"
    && /(?:hangi\s+sefer|hangi\s+arac|ne\s+kadar|gider|servis|maliyet|kdv|duzelt|goster|göster|iki\s+kere|nereden|neden)/u.test(value);
  return explicitHgs || hgsFollowUp;
}

function relationLabel(row, shiftId) {
  const plate = text(row?.vehicle?.plate || "");
  const shiftDate = row?.shift?.startAt || row?.occurredAt || row?.periodStart;
  return `Vardiya ${shiftId}${plate ? ` · ${plate}` : ""} · ${formatDate(shiftDate)}`;
}

function hgsEditAction(row, shiftId) {
  return {
    actionKind: "OPEN_ROUTE",
    label: "Bu gideri Giderlerim'de aç",
    path: FINANCE_PATH,
    routeParams: {
      view: "expenses",
      focusEntryId: positiveId(row?.id),
      focusShiftId: shiftId,
      focusField: "vat",
      contextSource: "expense-entry",
    },
    safeNavigation: true,
    criticalActionExecution: false,
    writeAction: false,
  };
}

function buildNoDataResponse({ semanticPlan = null, screenContext = {}, shiftId }) {
  const reply = shiftId
    ? `Seçili Vardiya ${shiftId} için doğrulanmış HGS veya geçiş gideri bulamadım. Yeni kayıt oluşturmuyorum; Giderlerim ekranında bu vardiyaya bağlı kaydı kontrol edebilirsin.`
    : "HGS giderini açıklamam için önce Servis Maliyeti ekranında gerçek bir vardiya seçmelisin. Yeni kayıt oluşturmuyorum.";
  return {
    ok: true,
    intent: "CHAT_HELP",
    intentLabel: "HGS gideri açıklaması",
    provider: "local-room-hgs-expense-read",
    providerSummary: "room-hgs-expense-read-no-data",
    mode: "RULE_BASED",
    entityType: "screen",
    entityId: Number(screenContext?.id || 0) || 0,
    entityLabel: screenContext?.label || "Servis maliyeti",
    reply,
    summary: reply,
    contextSummary: shiftId ? `Seçili vardiya ${shiftId} · HGS gideri` : "Seçili vardiya yok · HGS gideri",
    activeTopic: "ROOM_HGS_EXPENSE",
    questionType: "ROOM_HGS_EXPENSE",
    assistantIntent: "ROOM_HGS_EXPENSE",
    semanticPlan,
    responseSections: [{ title: "Sonuç", body: reply }],
    dataSources: ["Seçili vardiya gider kayıtları"],
    retrievedFacts: [{ type: "ROOM_HGS_EXPENSE", shiftId, entryCount: 0, status: "NO_DATA" }],
    quickActions: [],
    readOnly: true,
    writeAction: false,
    persisted: false,
    safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

export async function buildRoomHgsExpenseAssistantResponse({
  user = {},
  screenContext = {},
  message = "",
  conversationState = {},
  semanticPlan = null,
  prisma,
} = {}) {
  if (!isRoomHgsExpenseQuestion({ user, screenContext, message, conversationState })) return null;
  const roomId = positiveId(user?.roomId);
  const shiftId = selectedShiftId(screenContext);
  if (!roomId || !shiftId || !prisma?.roomCostEntry?.findMany) {
    return buildNoDataResponse({ semanticPlan, screenContext, shiftId });
  }

  const rows = await prisma.roomCostEntry.findMany({
    where: {
      roomId,
      shiftId,
      lifecycle: "CONFIRMED",
      recordKind: "ACTUAL",
      category: { key: { equals: HGS_CATEGORY_KEY } },
    },
    include: {
      category: true,
      vehicle: true,
      driver: true,
      shift: true,
      agreement: true,
    },
    orderBy: { id: "desc" },
  });
  if (!rows.length) return buildNoDataResponse({ semanticPlan, screenContext, shiftId });

  const currencyCode = text(rows[0]?.currencyCode || "TRY").toUpperCase();
  const amountMinor = rows.reduce((sum, row) => sum + (Number.isFinite(Number(row?.amountMinor)) ? Number(row.amountMinor) : 0), 0);
  const amount = formatMinor(amountMinor, currencyCode);
  const relation = relationLabel(rows[0], shiftId);
  const unknownVat = rows.some((row) => (
    text(row?.vatClassification).toUpperCase() === "UNKNOWN"
      || text(row?.vatDeductibility).toUpperCase() === "UNKNOWN"
      || row?.vatAmountMinor == null
  ));
  const duplicateNote = rows.length === 1
    ? "Bu vardiya kapsamında tek onaylı HGS gider kaydı var; aynı kayıt ikinci kez eklenmedi."
    : `Bu vardiya kapsamında ${rows.length} ayrı onaylı HGS kaydı var; bunları tek kayıt gibi birleştirmiyorum.`;
  const vatNote = unknownVat
    ? "KDV bilgisi tamamlanmadığı için tutarı brüt gerçekleşen gider olarak koruyorum; KDV'yi sıfır saymıyor ve kesin net kâr üretmiyorum."
    : "KDV bilgisi kayıtlı olduğu için ayrıştırılmış maliyet hesabında aynı server-owned finans sonucu kullanılır.";
  const reply = `Bu HGS/geçiş gideri ${amount}. ${relation}. Seçili vardiyaya doğrudan bağlı gerçekleşen gider olarak Servis Maliyeti kapsamına giriyor. ${vatNote} ${duplicateNote}`;
  return {
    ok: true,
    intent: "CHAT_HELP",
    intentLabel: "HGS gideri açıklaması",
    provider: "local-room-hgs-expense-read",
    providerSummary: "room-hgs-expense-read",
    mode: "RULE_BASED",
    entityType: "screen",
    entityId: Number(screenContext?.id || 0) || 0,
    entityLabel: screenContext?.label || "Servis maliyeti",
    reply,
    summary: reply,
    contextSummary: `${relation} · HGS/geçiş gideri`,
    activeTopic: "ROOM_HGS_EXPENSE",
    questionType: "ROOM_HGS_EXPENSE",
    assistantIntent: "ROOM_HGS_EXPENSE",
    semanticPlan,
    responseSections: [{ title: "HGS gideri", body: reply }],
    dataSources: ["Seçili vardiyaya bağlı HGS gider kaydı", "Servis Maliyeti görünümü"],
    retrievedFacts: [{
      type: "ROOM_HGS_EXPENSE",
      entryCount: rows.length,
      amountMinor,
      currencyCode,
      shiftId,
      vehicleLabel: text(rows[0]?.vehicle?.plate || screenContext?.structuredFacts?.selectedVehicleLabel || "") || null,
      occurredAt: rows[0]?.occurredAt || rows[0]?.periodStart || null,
      grossVisible: true,
      netRollupEligible: !unknownVat,
      vatStatus: unknownVat ? "Bilinmiyor" : "Belgelendi",
    }],
    quickActions: [hgsEditAction(rows[0], shiftId)],
    readOnly: true,
    writeAction: false,
    persisted: false,
    safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    qualityHints: {
      serverOwned: true,
      selectedShiftContext: shiftId,
      noBusinessWrite: true,
      hgsExpenseSourceCount: rows.length,
    },
  };
}
