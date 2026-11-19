function normalizeText(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/ı/gu, "i")
    .replace(/\s+/gu, " ")
    .trim();
}

export function normalizeRegionCapacityName(value) {
  return normalizeText(value);
}

function previousRegionContext(conversationState) {
  const candidates = [
    conversationState?.lastSettledResult?.semanticPlan?.regionContext,
    conversationState?.regionContext,
  ];
  return candidates.find((value) => value && typeof value === "object" && String(value.regionName || "").trim()) || null;
}

export function resolveSuperAdminRegionCapacityRequest({
  userRole = "",
  screenPath = "",
  message = "",
  conversationState = null,
} = {}) {
  if (String(userRole || "").trim().toUpperCase() !== "SUPER_ADMIN") return null;
  if (String(screenPath || "").split("?")[0] !== "/superadmin/regions") return null;

  const text = normalizeText(message);
  const countCue = /\b(?:kac|sayisi|adedi|tane)\b/iu.test(text);
  if (!countCue) return null;

  const companyCue = /\b(?:firma|firmalar|hizmet alan firma|sirket|sirketler)\b/iu.test(text);
  const roomCue = /\b(?:tasimacilik firmasi|tasimacilik firmalar|oda|room)\b/iu.test(text);
  if (!companyCue && !roomCue) return null;

  const namedRegionMatch = text.match(/\b([\p{L}\p{N}_-]+(?:\s+[\p{L}\p{N}_-]+){0,2})\s+bolge(?:sinde|sindeki|de)\b/iu);
  const previous = previousRegionContext(conversationState);
  const regionName = String(namedRegionMatch?.[1] || previous?.regionName || "").trim();
  if (!regionName) {
    return {
      kind: "CLARIFY_REGION",
      metric: companyCue ? "COMPANY" : "ROOM",
      regionName: "",
      normalizedRegionName: "",
    };
  }

  return {
    kind: "COUNT",
    metric: companyCue ? "COMPANY" : "ROOM",
    regionName,
    normalizedRegionName: normalizeRegionCapacityName(regionName),
  };
}

export function buildRegionCapacityReply({ snapshot, request } = {}) {
  if (!request) return null;
  if (request.kind === "CLARIFY_REGION") {
    return {
      status: "CLARIFY",
      reply: "Hangi bölgeyi kastettiğini belirtirsen yalnızca yetkili bölge kapasite özetinden firma sayısını okuyabilirim.",
      regionContext: null,
    };
  }

  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const match = items.find((item) => normalizeRegionCapacityName(item?.name) === request.normalizedRegionName) || null;
  if (!match) {
    return {
      status: "NOT_FOUND",
      reply: `“${request.regionName}” adıyla yetkili bir bölge kaydı bulamadım; başka bir bölgenin sayısını varsaymıyorum.`,
      regionContext: { regionName: request.regionName, regionId: null, metric: request.metric },
    };
  }

  const count = request.metric === "ROOM" ? Number(match.roomCount || 0) : Number(match.companyCount || 0);
  const label = request.metric === "ROOM" ? "taşımacılık firması" : "hizmet alan firma";
  const reply = `${match.name} bölgesinde ${label} sayısı ${count}. Bu sonuç yetkili İller ve Bölgeler ekranındaki güncel kapasite özetinden okunuyor; kayıt değişikliği yapılmadı.`;
  return {
    status: "FOUND",
    reply,
    regionContext: {
      regionName: match.name,
      regionId: Number(match.id || 0) || null,
      metric: request.metric,
      companyCount: Number(match.companyCount || 0),
      roomCount: Number(match.roomCount || 0),
    },
  };
}
