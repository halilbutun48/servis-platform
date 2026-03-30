import { useEffect, useMemo, useState } from "react";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import { companyPath } from "../../utils/paths";
import { personLabel } from "../../utils/labels";
import GuidedPlanModal from "./GuidedPlanModal";
import { ProviderScoreBadge } from "../../components/ProviderScoreBadge";
import { formatDateTimeTR } from "../../utils/time";
import { fetchProviderScoreMap } from "../../utils/providerScores";
import { getCompanyOffers, getCompanyRooms, getCompanyWorkflowSummary } from "../../utils/companyDataHub";
import { clearUiDataCache } from "../../utils/uiDataCache";

const GUIDED_RESUME_KEY = "psv1:guidedResume:v1";
const GEOREVIEW_OPEN_MODE_KEY = "psv1:georeview:openMode:v1";

function readGuidedResume(basePath) {
  try {
    const raw = localStorage.getItem(GUIDED_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (String(parsed.basePath || "") !== String(basePath || "")) return null;
    const ts = Number(parsed.ts || 0);
    if (Number.isFinite(ts) && ts > 0 && Date.now() - ts > 1000 * 60 * 60 * 12) return null;
    const step = Number(parsed.step);
    return {
      basePath: String(parsed.basePath || ""),
      step: Number.isFinite(step) ? step : 2,
      personId: Number(parsed.personId || 0) || null,
      source: String(parsed.source || ""),
    };
  } catch {
    return null;
  }
}

function clearGuidedResume() {
  try {
    localStorage.removeItem(GUIDED_RESUME_KEY);
  } catch {
    // ignore
  }
}

function pill(status) {
  const s = String(status || "");
  return (
    <span className="pill" data-status={s} title={s}>
      {s}
    </span>
  );
}

function fmtTR(iso) {
  if (!iso) return "-";
  return formatDateTimeTR(iso);
}

function formatTRY(amount) {
  if (amount == null) return "-";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("tr-TR").format(n);
}

function offerGapMeta(amountCompany, amountRoom) {
  const company = Number(amountCompany);
  const room = Number(amountRoom);
  const hasCompany = Number.isFinite(company) && company > 0;
  const hasRoom = Number.isFinite(room) && room > 0;

  if (hasCompany && hasRoom) {
    const diff = room - company;
    if (diff === 0) return { label: "Fiyat farkı", value: "Hizalı", tone: "good", note: "Aynı tutar" };
    if (diff > 0) return { label: "Fiyat farkı", value: `+${formatTRY(diff)} ₺`, tone: "warn", note: "Room daha yüksek" };
    return { label: "Fiyat farkı", value: `-${formatTRY(Math.abs(diff))} ₺`, tone: "good", note: "Company daha yüksek" };
  }

  if (hasRoom && !hasCompany) return { label: "Fiyat farkı", value: `${formatTRY(room)} ₺`, tone: "warn", note: "Sadece room teklifi var" };
  if (!hasRoom && hasCompany) return { label: "Fiyat farkı", value: `${formatTRY(company)} ₺`, tone: "neutral", note: "Room cevabı bekleniyor" };
  return { label: "Fiyat farkı", value: "-", tone: "neutral", note: "Tutar sinyali yok" };
}

function OfferSignalPill({ label, value, tone = "neutral" }) {
  const palette =
    tone === "good"
      ? { border: "1px solid rgba(18,183,106,0.35)", background: "rgba(18,183,106,0.10)", color: "#d1fadf" }
      : tone === "warn"
      ? { border: "1px solid rgba(242,153,74,0.35)", background: "rgba(242,153,74,0.10)", color: "#fbd5a5" }
      : { border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", color: "#d0d5dd" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...palette,
      }}
    >
      <span style={{ opacity: 0.82 }}>{label}</span>
      <span>{value}</span>
    </span>
  );
}


function providerAverageScore(score) {
  const avg = Number(score?.averageScore);
  const count = Number(score?.evaluationCount || 0);
  return Number.isFinite(avg) && count > 0 ? avg : 0;
}

function offerDecisionPriority(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COUNTERED") return 2;
  if (normalized === "OPEN") return 1;
  return 0;
}

function offerPriceSortValue(amountCompany, amountRoom) {
  const company = Number(amountCompany);
  const room = Number(amountRoom);
  const hasCompany = Number.isFinite(company) && company > 0;
  const hasRoom = Number.isFinite(room) && room > 0;
  if (hasCompany && hasRoom) return room - company;
  if (hasRoom && !hasCompany) return room + 1000000;
  if (!hasRoom && hasCompany) return 500000;
  return 999999;
}

function offerUpdatedSortValue(offer) {
  const value = Date.parse(offer?.updatedAt || offer?.createdAt || 0);
  return Number.isFinite(value) ? value : 0;
}

function compareRecommendedOffers(a, b, roomScores = {}) {
  const aDecision = offerDecisionPriority(a?.status);
  const bDecision = offerDecisionPriority(b?.status);
  if (aDecision !== bDecision) return bDecision - aDecision;

  const aRoomId = String(Number(a?.room?.id || a?.roomId || 0));
  const bRoomId = String(Number(b?.room?.id || b?.roomId || 0));
  const aScore = providerAverageScore(roomScores[aRoomId] || null);
  const bScore = providerAverageScore(roomScores[bRoomId] || null);
  if (aScore !== bScore) return bScore - aScore;

  const aGap = offerPriceSortValue(a?.amountCompany, a?.amountRoom);
  const bGap = offerPriceSortValue(b?.amountCompany, b?.amountRoom);
  if (aGap !== bGap) return aGap - bGap;

  return offerUpdatedSortValue(b) - offerUpdatedSortValue(a);
}

function buildRecommendationReason(offer, roomScores = {}) {
  const parts = [];
  const status = String(offer?.status || "").toUpperCase();
  if (status === "COUNTERED") parts.push("karşı teklif");
  else if (status === "OPEN") parts.push("açık teklif");

  const roomId = String(Number(offer?.room?.id || offer?.roomId || 0));
  const scoreValue = providerAverageScore(roomScores[roomId] || null);
  if (scoreValue > 0) parts.push(`puan ${scoreValue.toFixed(1)}`);

  const gap = offerGapMeta(offer?.amountCompany, offer?.amountRoom);
  if (gap?.value && gap.value !== "-") {
    parts.push(gap.value === "Hizalı" ? "fiyat hizalı" : `${gap.label.toLowerCase()} ${gap.value}`);
  }

  return parts.join(" • ");
}

function buildRecommendationMeta(offer, bucket = [], roomScores = {}) {
  const reasons = [];
  const statusPriority = offerDecisionPriority(offer?.status);
  const bucketPriorities = bucket.map((item) => offerDecisionPriority(item?.status));
  const bestPriority = bucketPriorities.length ? Math.max(...bucketPriorities) : statusPriority;
  if (statusPriority === bestPriority && bucketPriorities.some((value) => value !== statusPriority)) {
    if (String(offer?.status || "").toUpperCase() === "COUNTERED") reasons.push("Karşı teklif hazır");
    else if (String(offer?.status || "").toUpperCase() === "OPEN") reasons.push("Açık teklif hazır");
  }

  const roomId = String(Number(offer?.room?.id || offer?.roomId || 0));
  const scoreValue = providerAverageScore(roomScores[roomId] || null);
  const bucketScores = bucket.map((item) => {
    const key = String(Number(item?.room?.id || item?.roomId || 0));
    return providerAverageScore(roomScores[key] || null);
  });
  const bestScore = bucketScores.length ? Math.max(...bucketScores) : scoreValue;
  if (scoreValue > 0 && scoreValue === bestScore && bucketScores.some((value) => value < scoreValue)) {
    reasons.push("Room puanı daha yüksek");
  }

  const gapValue = offerPriceSortValue(offer?.amountCompany, offer?.amountRoom);
  const bucketGaps = bucket.map((item) => offerPriceSortValue(item?.amountCompany, item?.amountRoom));
  const bestGap = bucketGaps.length ? Math.min(...bucketGaps) : gapValue;
  if (Number.isFinite(gapValue) && gapValue === bestGap && bucketGaps.some((value) => value > gapValue)) {
    reasons.push("Fiyat farkı daha düşük");
  }

  const updatedValue = offerUpdatedSortValue(offer);
  const bucketUpdates = bucket.map((item) => offerUpdatedSortValue(item));
  const latestUpdate = bucketUpdates.length ? Math.max(...bucketUpdates) : updatedValue;
  if (!reasons.length && updatedValue === latestUpdate && bucketUpdates.some((value) => value < updatedValue)) {
    reasons.push("Daha güncel cevap");
  }

  const fallback = buildRecommendationReason(offer, roomScores) || "Bu vardiya için otomatik öne çıktı";
  return {
    short: reasons[0] || fallback,
    summary: reasons.length ? reasons.join(" • ") : fallback,
    reasons: reasons.length ? reasons : [fallback],
  };
}

function rankOffersWithRecommendation(items, roomScores = {}) {
  const list = Array.isArray(items) ? [...items] : [];
  if (!list.length) return [];

  const byShift = new Map();
  for (const offer of list) {
    const shiftId = Number(offer?.shiftId || offer?.shift?.id || 0);
    const key = shiftId > 0 ? `shift:${shiftId}` : `single:${offer?.id || Math.random()}`;
    const bucket = byShift.get(key) || [];
    bucket.push(offer);
    byShift.set(key, bucket);
  }

  const recommendationMetaById = new Map();
  for (const bucket of byShift.values()) {
    if (!bucket || bucket.length < 2) continue;
    const sorted = [...bucket].sort((a, b) => compareRecommendedOffers(a, b, roomScores));
    const winner = sorted[0];
    if (winner?.id != null) {
      recommendationMetaById.set(winner.id, buildRecommendationMeta(winner, bucket, roomScores));
    }
  }

  return list
    .map((offer) => {
      const meta = recommendationMetaById.get(offer.id);
      return {
        ...offer,
        __recommended: Boolean(meta),
        __recommendationReason: meta?.summary || "",
        __recommendationShort: meta?.short || "",
        __recommendationReasons: meta?.reasons || [],
      };
    })
    .sort((a, b) => {
      const recDiff = Number(Boolean(b.__recommended)) - Number(Boolean(a.__recommended));
      if (recDiff) return recDiff;
      const shiftDiff = Number(b?.shiftId || b?.shift?.id || 0) - Number(a?.shiftId || a?.shift?.id || 0);
      if (shiftDiff) return shiftDiff;
      return compareRecommendedOffers(a, b, roomScores);
    });
}

function RecommendationBadge({ reason = "" }) {
  return (
    <span
      title={reason || "Bu vardiya için otomatik öne çıktı"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(83,177,253,0.35)",
        background: "rgba(83,177,253,0.12)",
        color: "#b2ddff",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      Önerilen
    </span>
  );
}

function RecommendationReasons({ reasons = [] }) {
  if (!Array.isArray(reasons) || !reasons.length) return null;
  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {reasons.slice(0, 3).map((reason, idx) => (
        <span
          key={`${reason}-${idx}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(83,177,253,0.20)",
            background: "rgba(83,177,253,0.08)",
            color: "#d6efff",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {reason}
        </span>
      ))}
    </div>
  );
}


function KpiCard({ title, desc, right, onClick }) {
  return (
    <div
      className="kpiCard"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      <div className="kpiLabel">{title}</div>
      <div className="kpiValue">{right ?? "-"}</div>
      {desc ? <div className="kpiDesc">{desc}</div> : null}
    </div>
  );
}

function ChecklistRow({ done, title, desc, actionLabel, onAction }) {
  return (
    <div className="row" style={{ gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 800 }}>
          <span style={{ marginRight: 8 }}>{done ? "✅" : "⬜"}</span>
          {title}
        </div>
        {desc ? <div className="muted" style={{ marginTop: 2 }}>{desc}</div> : null}
      </div>
      {actionLabel ? (
        <button type="button" className="btn sm" onClick={onAction} style={{ whiteSpace: "nowrap" }}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function WorkflowPanel() {
  const { token, me } = useSession();
  // School mode (Company.kind=SCHOOL) uses the same panel; copy/paste safe label.
  const who = personLabel(me);
  const school = me?.companyKind === "SCHOOL";
  const organization = me?.companyKind === "ORGANIZATION";

  const [err, setErr] = useState("");
  const [rooms, setRooms] = useState([]);
  const [roomsSupported, setRoomsSupported] = useState(true);
  const [summary, setSummary] = useState({ todayAgreements: 0, todayShiftCount: 0, marketShiftCount: 0, geoNeedsReview: 0, openOffersCount: 0 });
  const [roomScores, setRoomScores] = useState({});

  const [offersModal, setOffersModal] = useState({
    open: false,
    status: "OPEN,COUNTERED",
    q: "",
    items: [],
  });

  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guidedResumeStep, setGuidedResumeStep] = useState(null);
  const [guidedResumeNonce, setGuidedResumeNonce] = useState(0);

  async function loadRooms(signal) {
    if (!token) return;
    setRoomsSupported(true);
    try {
      const resp = await getCompanyRooms(token, { signal, take: 30, ttlMs: 60000 });
      if (signal?.aborted) return;
      const list = resp?.items ?? [];
      setRooms(Array.isArray(list) ? list : []);
    } catch {
      setRooms([]);
      setRoomsSupported(false);
    }
  }

  async function loadSummary(signal) {
    if (!token) return;
    setErr("");
    try {
      const resp = await getCompanyWorkflowSummary(token, { signal });
      if (signal?.aborted) return;
      const cards = resp?.cards || {};
      setSummary({
        todayAgreements: Number(cards?.todayAgreements || 0),
        todayShiftCount: Number(cards?.todayShiftCount || 0),
        marketShiftCount: Number(cards?.marketShiftCount || 0),
        geoNeedsReview: Number(cards?.geoNeedsReview || 0),
        openOffersCount: Number(cards?.openOffersCount || 0),
      });
    } catch (e) {
      if (signal?.aborted) return;
      setSummary({ todayAgreements: 0, todayShiftCount: 0, marketShiftCount: 0, geoNeedsReview: 0, openOffersCount: 0 });
      setErr(String(e?.message || e));
    }
  }

  async function loadCompanyOffers(status = offersModal.status) {
    if (!token) return;
    try {
      const r = await getCompanyOffers(token, { status, q: offersModal.q, ttlMs: 25000, take: 30 });
      const items = Array.isArray(r?.items) ? r.items : [];
      setOffersModal((p) => ({ ...p, items }));
    } catch (e) {
      setOffersModal((p) => ({ ...p, items: [] }));
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      loadSummary(controller.signal);
    }, 320);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !guidedOpen) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) loadRooms(controller.signal);
    }, 140);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [token, guidedOpen]);

  useEffect(() => {
    if (!offersModal.open) return;
    const timer = setTimeout(() => {
      loadCompanyOffers(offersModal.status);
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offersModal.open, offersModal.status, offersModal.q]);

  const stats = useMemo(() => ({
    todayAgreements: Number(summary?.todayAgreements || 0),
    todayShiftCount: Number(summary?.todayShiftCount || 0),
    marketShiftCount: Number(summary?.marketShiftCount || 0),
  }), [summary]);

  const geoNeedsReview = Number(summary?.geoNeedsReview || 0);
  const openOffersCount = Number(summary?.openOffersCount || 0);

  const guide = useMemo(() => {
    const geoOk = geoNeedsReview === 0;
    const hasAgreementToday = stats.todayAgreements > 0;

    // "Teklifleri değerlendir" adımı: açık teklif varsa aksiyon gerekli; yoksa OK (opsiyonel adım).
    const offersOk = openOffersCount === 0;

    const hasShiftToday = stats.todayShiftCount > 0;

    const doneCount = [geoOk, hasAgreementToday, offersOk, hasShiftToday].filter(Boolean).length;

    return { geoOk, hasAgreementToday, offersOk, hasShiftToday, doneCount, total: 4 };
  }, [geoNeedsReview, stats.todayAgreements, stats.todayShiftCount, openOffersCount]);

  const organizationGuideRows = useMemo(() => ([
    {
      done: guide.geoOk,
      title: "1) Toplanma noktası",
      desc: guide.geoOk ? "Toplanma noktası hazır" : "Önce toplanma noktasını kaydet",
      actionLabel: guide.geoOk ? "Konumu kontrol et" : "Toplanma noktasını aç",
      onAction: () => setGuidedOpen(true),
    },
    {
      done: guide.hasAgreementToday,
      title: "2) Planı oluştur",
      desc: guide.hasAgreementToday ? "Bugün için plan/taslak var" : "Guided Mode ile gezi planını oluştur",
      actionLabel: guide.hasAgreementToday ? "Planları gör" : "Plan oluştur",
      onAction: () => {
        if (guide.hasAgreementToday) navigate(companyPath(me, "/agreements"));
        else setGuidedOpen(true);
      },
    },
    {
      done: guide.offersOk,
      title: "3) Teklifler",
      desc: guide.offersOk ? "Açık teklif yok" : "Açık teklif var: değerlendir",
      actionLabel: guide.offersOk ? "" : "Teklifleri aç",
      onAction: openOffers,
    },
    {
      done: guide.hasShiftToday,
      title: "4) Takip",
      desc: guide.hasShiftToday ? "Bugünkü vardiyalar hazır" : "Henüz bugünkü vardiya yok",
      actionLabel: "Vardiyalar",
      onAction: () => navigate(companyPath(me, "/shifts")),
    },
  ]), [guide, me]);

  const offersFiltered = useMemo(() => {
    const qq = String(offersModal.q || "").trim().toLowerCase();
    const items = Array.isArray(offersModal.items) ? offersModal.items : [];
    if (!qq) return items;

    return items.filter((o) => {
      const shift = o.shift || {};
      const room = o.room || {};
      const hay = [
        o.id,
        o.shiftId,
        o.roomId,
        o.status,
        shift.status,
        room.name,
        o.noteCompany,
        o.noteRoom,
        o.amountCompany,
        o.amountRoom,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [offersModal.items, offersModal.q]);

  const visibleOfferRoomIds = useMemo(
    () => Array.from(new Set((offersFiltered || []).map((o) => Number(o?.room?.id || o?.roomId || 0)).filter((id) => Number.isFinite(id) && id > 0))).slice(0, 24),
    [offersFiltered]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token || !offersModal.open || !visibleOfferRoomIds.length) {
        if (alive) setRoomScores({});
        return;
      }
      try {
        const nextScores = await fetchProviderScoreMap(visibleOfferRoomIds, token);
        if (!alive) return;
        setRoomScores(nextScores);
      } catch {
        if (alive) setRoomScores({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, offersModal.open, visibleOfferRoomIds]);

  const offersDecisionSummary = useMemo(() => {
    const items = Array.isArray(offersFiltered) ? offersFiltered : [];
    return items.reduce(
      (acc, o) => {
        const st = String(o?.status || "").toUpperCase();
        if (st === "COUNTERED") acc.countered += 1;
        else if (st === "OPEN") acc.open += 1;
        else acc.other += 1;
        return acc;
      },
      { countered: 0, open: 0, other: 0 }
    );
  }, [offersFiltered]);


  const offersDecisionCards = useMemo(() => rankOffersWithRecommendation(offersFiltered, roomScores), [offersFiltered, roomScores]);
  const recommendedOffer = useMemo(() => offersDecisionCards.find((offer) => offer.__recommended) || null, [offersDecisionCards]);
  const recommendedOfferShiftId = Number(recommendedOffer?.shiftId || recommendedOffer?.shift?.id || 0);

  function openOffers() {
    setOffersModal((p) => ({ ...p, open: true }));
  }

  function closeOffers() {
    setOffersModal((p) => ({ ...p, open: false }));
  }

  function goCompanyShift(shiftId) {
    const sid = Number(shiftId);
    if (!sid) return;
    // Basit: Shifts'e git. (İstersen sonraki milestone'da otomatik highlight ekleriz)
    navigate(companyPath(me, "/shifts"));
  }

  function openGeoReview(forceAll = true) {
    try {
      clearUiDataCache("/api/company/personels");
      localStorage.setItem(
        GEOREVIEW_OPEN_MODE_KEY,
        JSON.stringify({
          mode: forceAll ? "ALL" : "SESSION",
          source: "workflow",
          forceRefresh: true,
          ts: Date.now(),
        })
      );
    } catch {}
    navigate(companyPath(me, "/georeview"));
  }

  useEffect(() => {
    const basePath = companyPath(me, "");
    const resume = readGuidedResume(basePath);
    if (!resume) return;
    setGuidedResumeStep(Number.isFinite(Number(resume.step)) ? Number(resume.step) : 2);
    setGuidedResumeNonce(Date.now());
    setGuidedOpen(true);
    clearGuidedResume();
  }, [me?.companyId, me?.id, me?.companyKind]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">{school ? "Okul — Planlama Merkezi" : organization ? "Organization — Gezi / Planlama Merkezi" : "Company — Planlama Merkezi"}</div>
        <div className="muted">
          {organization ? (
            <>
              Yeni iş kurmak için <b>Planlama Merkezi</b>, mevcut işi takip etmek için <b>Vardiyalar</b> kullanılır. Akış: <b>Toplanma noktası</b> → <b>Plan paketi</b> → <b>Kişi sayısı / gidilecek yerler</b> → <b>Ön izleme / teklif</b>.
            </>
          ) : (
            <>
              Yeni iş kurmak için <b>Planlama Merkezi</b>, mevcut işi takip etmek için <b>Vardiyalar</b> kullanılır. Akış: <b>Şirket konumu</b> → <b>Plan paketi</b> → <b>{who}/Durak</b> → <b>Ön izleme / teklif</b>.
            </>
          )}
        </div>
      </div>

      {geoNeedsReview > 0 ? (
        <div className="card" style={{ border: "2px solid #f2c", marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>⚠ Geo Review gerekli</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {geoNeedsReview} {who.toLowerCase()} konumu <b>NEEDS_REVIEW</b>. Planlama doğruluğu için önce düzeltmen önerilir.
          </div>
          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={() => openGeoReview(true)}>Geo Review’e git</button>
            <button type="button" className="btn" onClick={() => loadSummary()}>Yenile</button>
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="card err" style={{ marginTop: 10 }}>
          {err}
        </div>
      ) : null}


      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Yeni Plan Oluştur (Guided Mode)</div>
        <div className="muted" style={{ marginTop: 4 }}>
          {organization ? (
            <>
              Sade akış: <b>Toplanma noktası</b> → <b>Plan paketi</b> → <b>Kişi sayısı / gidilecek yerler</b> → <b>Ön izleme</b> → <b>Teklif oluştur</b>.
            </>
          ) : (
            <>
              Sade akış: <b>Şirket konumu</b> → <b>Plan paketi</b> → <b>{who}/Durak</b> → <b>Ön izleme</b> → <b>Teklif oluştur</b>.
            </>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn primary" onClick={() => setGuidedOpen(true)} disabled={!roomsSupported}>
            Rehberi Başlat
          </button>
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          {organization
            ? "İpucu: Yeni gezi/organizasyon işini burada kur. Teklif ve operasyon takibini Vardiyalar ekranından yap."
            : "İpucu: Yeni işi burada kur, teklif ve operasyon takibini Vardiyalar ekranından yap."}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Rehber (Adım adım)</div>
          <div className="muted">
            {guide.doneCount}/{guide.total}
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {organization ? (
            organizationGuideRows.map((row) => (
              <ChecklistRow
                key={row.title}
                done={row.done}
                title={row.title}
                desc={row.desc}
                actionLabel={row.actionLabel}
                onAction={row.onAction}
              />
            ))
          ) : (
            <>
              <ChecklistRow
                done={guide.geoOk}
                title="1) Geo Review"
                desc={guide.geoOk ? "Konumlar OK" : "NEEDS_REVIEW varsa düzelt"}
                actionLabel={guide.geoOk ? "" : "Geo Review’e git"}
                onAction={() => openGeoReview(true)}
              />

              <ChecklistRow
                done={guide.hasAgreementToday}
                title="2) Agreement"
                desc={guide.hasAgreementToday ? "Bugün için plan var" : "Guided Mode ile plan oluştur"}
                actionLabel={guide.hasAgreementToday ? "Agreements" : "Plan oluştur"}
                onAction={() => {
                  if (guide.hasAgreementToday) navigate(companyPath(me, "/agreements"));
                  else setGuidedOpen(true);
                }}
              />

              <ChecklistRow
                done={guide.offersOk}
                title="3) Teklifler"
                desc={guide.offersOk ? "Açık teklif yok (OK)" : "Açık teklif var: değerlendir"}
                actionLabel={guide.offersOk ? "" : "Teklifleri aç"}
                onAction={openOffers}
              />

              <ChecklistRow
                done={guide.hasShiftToday}
                title="4) Vardiyalar"
                desc={guide.hasShiftToday ? "Bugün operasyon var" : "Henüz bugünkü vardiya yok"}
                actionLabel="Vardiyalar"
                onAction={() => navigate(companyPath(me, "/shifts"))}
              />
            </>
          )}
        </div>
      </div>

      {/* ✅ M29-B: Company offers modal */}
      {offersModal.open ? (
        <div className="modal-backdrop">
          <div className="modal card">
          <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Açık Teklifler</div>
              <div className="muted">Company’ye gelen/gönderilen market teklifleri (OPEN/COUNTERED).</div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={() => loadCompanyOffers(offersModal.status)}>Yenile</button>
              <button type="button" className="btn" onClick={closeOffers}>Kapat</button>
            </div>
          </div>

          <div className="row" style={{ marginTop: 10, gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Durum
              <select
                value={offersModal.status}
                onChange={(e) => setOffersModal((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="OPEN,COUNTERED">OPEN + COUNTERED</option>
                <option value="OPEN">OPEN</option>
                <option value="COUNTERED">COUNTERED</option>
                <option value="">Tümü</option>
              </select>
            </label>

            <input
              value={offersModal.q}
              onChange={(e) => setOffersModal((p) => ({ ...p, q: e.target.value }))}
              placeholder="Ara (shiftId/room/status/not)"
              style={{ minWidth: 240 }}
            />

            <div className="muted">Toplam: {offersFiltered.length}</div>
          </div>

          <div className="card" style={{ marginTop: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Karar Özeti</div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <OfferSignalPill label="Karşı teklif" value={String(offersDecisionSummary.countered)} tone={offersDecisionSummary.countered ? "warn" : "neutral"} />
              <OfferSignalPill label="Açık teklif" value={String(offersDecisionSummary.open)} tone={offersDecisionSummary.open ? "neutral" : "good"} />
              <OfferSignalPill label="Önerilen" value={String(offersDecisionCards.filter((o) => o.__recommended).length)} tone={offersDecisionCards.some((o) => o.__recommended) ? "good" : "neutral"} />
              <OfferSignalPill label="Toplam" value={String(offersFiltered.length)} tone="neutral" />
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Otomatik öneri sırası: karar verilebilirlik → room puanı → fiyat farkı → güncellik. Son kararı yine sen verirsin.
            </div>
            {recommendedOffer ? (
              <div className="row" style={{ marginTop: 10, gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <div className="muted">
                  Öne çıkan teklif: Shift #{recommendedOfferShiftId || "-"} • {String(recommendedOffer.__recommendationShort || recommendedOffer.__recommendationReason || "Otomatik öneri")}
                </div>
                <button type="button" className="btn sm" onClick={() => goCompanyShift(recommendedOfferShiftId)}>
                  Önerilen shift’e git
                </button>
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {offersDecisionCards.map((o) => {
              const shift = o.shift || {};
              const room = o.room || {};
              const roomId = Number(room?.id || o.roomId || 0);
              const score = roomScores[String(roomId)] || null;
              const offerStatus = String(o.status || "").toUpperCase();
              const gap = offerGapMeta(o.amountCompany, o.amountRoom);
              const note = String(o.noteRoom || o.noteCompany || "").trim();
              const needsDecision = offerStatus === "COUNTERED";
              const isRecommended = !!o.__recommended;
              const recommendationReason = String(o.__recommendationReason || "").trim();
              const recommendationShort = String(o.__recommendationShort || recommendationReason || "").trim();
              const recommendationReasons = Array.isArray(o.__recommendationReasons) ? o.__recommendationReasons : [];

              return (
                <div
                  key={o.id}
                  className="card"
                  style={{
                    border: isRecommended
                      ? "1px solid rgba(83,177,253,0.40)"
                      : needsDecision
                      ? "1px solid rgba(242,153,74,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: isRecommended
                      ? "linear-gradient(180deg, rgba(83,177,253,0.10), rgba(255,255,255,0.02))"
                      : needsDecision
                      ? "rgba(242,153,74,0.07)"
                      : "rgba(255,255,255,0.02)",
                    boxShadow: isRecommended ? "0 0 0 1px rgba(83,177,253,0.08) inset" : "none",
                  }}
                >
                  <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 800 }}>
                        {room?.name ? `${room.name} (#${room.id})` : `Room #${o.roomId}`}
                      </div>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {isRecommended ? <RecommendationBadge reason={recommendationReason} /> : null}
                        <ProviderScoreBadge score={score} prominent showLabel />
                        {pill(o.status)}
                        <OfferSignalPill
                          label="Karar"
                          value={needsDecision ? "Bekliyor" : "Takip"}
                          tone={needsDecision ? "warn" : "neutral"}
                        />
                      </div>
                    </div>
                    <button type="button" className="btn sm" onClick={() => goCompanyShift(o.shiftId)}>
                      {isRecommended ? "Önerilen shift’e git" : "Shift’e git"}
                    </button>
                  </div>

                  <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <OfferSignalPill label="Company" value={o.amountCompany != null ? `${formatTRY(o.amountCompany)} ₺` : "-"} tone="neutral" />
                    <OfferSignalPill label="Room" value={o.amountRoom != null ? `${formatTRY(o.amountRoom)} ₺` : "-"} tone={offerStatus === "COUNTERED" ? "warn" : "neutral"} />
                    <OfferSignalPill label={gap.label} value={gap.value} tone={gap.tone} />
                  </div>

                  <RecommendationReasons reasons={isRecommended ? recommendationReasons : []} />
                  <div className="muted" style={{ marginTop: 8 }}>
                    Shift #{o.shiftId} • Shift durumu {String(shift.status || "-")} • Güncelleme {fmtTR(o.updatedAt)}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>{gap.note}</div>
                  {isRecommended ? (
                    <div className="muted" style={{ marginTop: 6, color: "#b2ddff" }}>
                      <b>Neden önerildi?</b> {recommendationShort || recommendationReason || "Bu shift için otomatik öne çıktı."}
                    </div>
                  ) : null}
                  {note ? (
                    <div className="muted" style={{ marginTop: 8 }} title={note}>
                      <b>Not:</b> {note}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {offersDecisionCards.length === 0 ? <div className="muted">Kayıt yok.</div> : null}
          </div>
          </div>
        </div>
      ) : null}

      <GuidedPlanModal
        open={guidedOpen}
        onClose={() => setGuidedOpen(false)}
        resumeStep={guidedResumeStep}
        resumeNonce={guidedResumeNonce}
        rooms={rooms}
        roomsSupported={roomsSupported}
        onReloadRooms={loadRooms}
        onAfterCreated={() => {
          loadSummary();
          navigate(companyPath(me, "/shifts"));
        }}
      />
    </div>
  );
}
