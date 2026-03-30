import { prisma } from "../prisma.js";
import { readServiceEvaluations, upsertServiceEvaluation } from "./serviceEvaluationStore.js";

export const TRUST_QUALITY_DIMENSIONS = [
  { id: "service_receiver_feedback", label: "Hizmet alan değerlendirmesi", status: "ACTIVE" },
  { id: "provider_quality_summary", label: "Sağlayıcı kalite özeti", status: "ACTIVE" },
  { id: "eta_quality_signal", label: "ETA kalite sinyali", status: "PLANNED" },
  { id: "no_show_compliance", label: "No-show ve uyum görünürlüğü", status: "PLANNED" },
  { id: "decision_support", label: "Karar destek yüzeyi", status: "PLANNED" },
];

export const TRUST_QUALITY_RULES = [
  "Değerlendirme mantığı tamamlanan hizmet sonrası açılacak şekilde kurgulanır.",
  "Sağlayıcı kalite sinyali gelecek teklif ve seçim kararlarını destekler.",
  "No-show, iptal, uyum ve ETA kalite alanları kalite özetini besler.",
  "M63 green olmadan M64 açılmaz.",
];

const FIELDS = [
  { key: "timeliness", label: "zamanında başlama" },
  { key: "vehicleSuitability", label: "araç uygunluğu" },
  { key: "driverBehavior", label: "sürücü davranışı" },
  { key: "operationOrder", label: "operasyon düzeni" },
  { key: "liveTrackingConfidence", label: "canlı takip güveni" },
  { key: "overallSatisfaction", label: "genel memnuniyet" },
];

function avg(values) {
  const nums = values.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function evaluationAverage(evaluation) {
  if (!evaluation?.ratings || typeof evaluation.ratings !== "object") return null;
  return avg(Object.values(evaluation.ratings));
}

function formatStars(score) {
  const n = Number(score);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${n.toFixed(1)} / 5`;
}

function buildProviderScoreMapFromEvaluations(evaluations, roomIds) {
  const wanted = new Set((Array.isArray(roomIds) ? roomIds : []).map((x) => Number(x || 0)).filter(Boolean));
  const grouped = new Map();
  for (const entry of Array.isArray(evaluations) ? evaluations : []) {
    const rid = Number(entry?.roomId || 0);
    if (!rid || (wanted.size && !wanted.has(rid))) continue;
    const list = grouped.get(rid) || [];
    list.push(entry);
    grouped.set(rid, list);
  }
  const out = new Map();
  const targetIds = wanted.size ? Array.from(wanted) : Array.from(grouped.keys());
  for (const rid of targetIds) {
    const list = grouped.get(rid) || [];
    const averages = list.map(evaluationAverage).filter((x) => x != null);
    const averageScore = avg(averages);
    const evaluationCount = list.length;
    const recBase = list.filter((x) => x.recommendAgain !== null && x.recommendAgain !== undefined);
    const recommendRate = recBase.length ? Math.round((recBase.filter((x) => x.recommendAgain === true).length / recBase.length) * 100) : null;
    out.set(rid, {
      roomId: rid,
      averageScore,
      evaluationCount,
      recommendRate,
      summaryLabel: evaluationCount ? `${formatStars(averageScore)} • ${evaluationCount} değerlendirme` : 'Henüz puan yok',
    });
  }
  return out;
}

export function getTrustQualityManifest() {
  return {
    activeMilestone: "M63",
    title: "Güven + Kalite + Hizmet Değerlendirme",
    dimensions: TRUST_QUALITY_DIMENSIONS,
    rules: TRUST_QUALITY_RULES,
  };
}

export function buildServiceEvaluationTemplate() {
  return {
    activeMilestone: "M63-R1B",
    fields: FIELDS.map((x) => x.label),
    scoreScale: [1, 2, 3, 4, 5],
    summary: "Tamamlanan hizmet sonrası 1-5 puan, kısa not ve tekrar çalışma niyeti alınır.",
  };
}

export function buildProviderSignalTemplate() {
  return {
    activeMilestone: "M63-R1B",
    signals: ["ortalama-puan", "değerlendirme-sayısı", "tekrar-çalışma-oranı"],
    summary: "Sağlayıcı kalite ve güven görünürlüğü için özet sinyal seti.",
  };
}

function serviceStatusLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DONE") return "Tamamlandı";
  if (["APPROVED", "ACTIVE"].includes(s)) return "Hizmet Devam Ediyor";
  return s || "-";
}

function evaluationStatus(status, evaluation) {
  const s = String(status || "").toUpperCase();
  if (evaluation) return "Kaydedildi";
  if (s === "DONE") return "Değerlendirme Açık";
  if (["APPROVED", "ACTIVE"].includes(s)) return "Henüz Açılamaz";
  return "-";
}

export async function buildCompanyServiceEvaluationSummary(user) {
  const companyId = Number(user?.companyId || 0);
  if (!companyId) return { activeMilestone: "M63-R1B", cards: { completedServices: 0, pendingEvaluation: 0, activeServices: 0, providerCount: 0 } };
  const [shifts, evaluations] = await Promise.all([
    prisma.shift.findMany({ where: { companyId, status: { in: ["DONE", "APPROVED", "ACTIVE"] } }, select: { id: true, roomId: true, status: true } }),
    readServiceEvaluations(),
  ]);
  const completed = shifts.filter((x) => String(x.status).toUpperCase() === "DONE");
  const doneIds = new Set(completed.map((x) => Number(x.id)));
  const companyEvaluations = evaluations.filter((x) => Number(x.companyId) === companyId && doneIds.has(Number(x.shiftId)));
  const completedServices = completed.length;
  const pendingEvaluation = Math.max(0, completedServices - companyEvaluations.length);
  const activeServices = shifts.filter((x) => ["APPROVED", "ACTIVE"].includes(String(x.status || "").toUpperCase())).length;
  const providerCount = new Set(shifts.map((x) => Number(x.roomId || 0)).filter(Boolean)).size;
  return { activeMilestone: "M63-R1B", cards: { completedServices, pendingEvaluation, activeServices, providerCount } };
}

export async function getProviderScore(roomId) {
  const rid = Number(roomId || 0);
  if (!rid) return { roomId: 0, averageScore: null, evaluationCount: 0, recommendRate: null, summaryLabel: "Henüz puan yok" };
  const map = buildProviderScoreMapFromEvaluations(await readServiceEvaluations(), [rid]);
  return map.get(rid) || { roomId: rid, averageScore: null, evaluationCount: 0, recommendRate: null, summaryLabel: "Henüz puan yok" };
}

export async function buildCompanyServiceEvaluationItems(user, options = {}) {
  const companyId = Number(user?.companyId || 0);
  if (!companyId) return [];
  const pendingOnly = options?.pendingOnly === true;
  const q = String(options?.q || "").trim().toLowerCase();
  const take = Math.min(200, Math.max(1, Number(options?.take || 40) || 40));
  const statuses = pendingOnly ? ["DONE"] : ["DONE", "APPROVED", "ACTIVE"];
  const dbTake = pendingOnly ? Math.max(take * 3, 120) : Math.max(take, 40);
  const [shifts, evaluations] = await Promise.all([
    prisma.shift.findMany({
      where: { companyId, status: { in: statuses } },
      orderBy: [{ endAt: "desc" }, { startAt: "desc" }],
      take: dbTake,
      include: {
        room: { select: { id: true, name: true } },
        vehicle: { select: { id: true, plate: true } },
        driver: { select: { id: true, fullName: true } },
      },
    }),
    readServiceEvaluations(),
  ]);
  const map = new Map(evaluations.filter((x) => Number(x.companyId) === companyId).map((x) => [Number(x.shiftId), x]));
  const roomIds = [...new Set(shifts.map((s) => Number(s.room?.id || s.roomId || 0)).filter(Boolean))];
  const scoreMap = buildProviderScoreMapFromEvaluations(evaluations, roomIds);
  let items = shifts.map((s) => {
    const status = String(s.status || "").toUpperCase();
    const evaluation = map.get(Number(s.id));
    const roomId = Number(s.room?.id || s.roomId || 0) || null;
    const score = roomId ? scoreMap.get(roomId) : null;
    const canEvaluate = status === "DONE";
    return {
      id: `shift-${s.id}`,
      shiftId: s.id,
      providerName: s.room?.name || `Room #${s.roomId || s.id}`,
      providerScore: score || null,
      serviceLabel: s.vehicle?.plate || s.driver?.fullName || `Shift #${s.id}`,
      statusLabel: serviceStatusLabel(status),
      evaluationStatus: evaluationStatus(status, evaluation),
      nextStep: evaluation ? "İstersen puanı güncelle veya notu yenile" : (status === "DONE" ? "Hizmeti değerlendir ve kısa not ekle" : "Hizmet tamamlandığında değerlendirme açılacak"),
      completedAt: status === "DONE" ? s.endAt : s.startAt,
      actionPath: "/company/shifts",
      actionLabel: "Vardiyaları aç",
      roomId,
      canEvaluate,
      evaluation: evaluation ? {
        ratings: evaluation.ratings,
        note: evaluation.note || "",
        recommendAgain: evaluation.recommendAgain,
        averageScore: evaluationAverage(evaluation),
      } : null,
    };
  });
  if (pendingOnly) {
    items = items.filter((item) => Boolean(item?.canEvaluate) && !item?.evaluation);
  }
  if (q) {
    items = items.filter((item) => {
      const hay = [
        item?.providerName,
        item?.serviceLabel,
        item?.statusLabel,
        item?.evaluationStatus,
        item?.nextStep,
        item?.shiftId,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }
  return items.slice(0, take);
}

export async function submitCompanyServiceEvaluation(user, payload) {
  const companyId = Number(user?.companyId || 0);
  const shiftId = Number(payload?.shiftId || 0);
  if (!companyId || !shiftId) throw new Error("companyId ve shiftId zorunlu");
  const shift = await prisma.shift.findFirst({ where: { id: shiftId, companyId }, select: { id: true, roomId: true, status: true } });
  if (!shift) throw new Error("Hizmet bulunamadı");
  if (String(shift.status || "").toUpperCase() !== "DONE") throw new Error("Değerlendirme yalnız tamamlanan hizmet için açılır");
  const ratings = payload?.ratings || {};
  const sanitized = {};
  for (const f of FIELDS) {
    const n = Number(ratings[f.key]);
    if (!Number.isFinite(n) || n < 1 || n > 5) throw new Error(`Lütfen ${f.label} için 1-5 puan verin`);
    sanitized[f.key] = Math.round(n);
  }
  return upsertServiceEvaluation({
    shiftId: shift.id,
    companyId,
    roomId: shift.roomId,
    ratings: sanitized,
    note: payload?.note,
    recommendAgain: payload?.recommendAgain,
  });
}
