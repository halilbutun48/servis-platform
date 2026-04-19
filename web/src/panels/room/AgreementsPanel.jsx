import { useEffect, useMemo, useState } from "react";
import { navigate } from "../../router";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { toHHMM, weekMaskToText } from "../../utils/agreementUi";
import { ymdTR } from "../../utils/time";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import { agreementExtendStatusText, agreementStatusPillLabel, agreementStatusText } from "../../utils/agreementLabels";
import { getShiftRoutePreview } from "../../utils/shiftRoutePreview";
import RoutePreviewModal from "../../components/RoutePreviewModal";

// ✅ M59 helpers
function daysLeftYmd(ymd) {
  if (!ymd || String(ymd).length < 10) return null;
  const end = new Date(String(ymd).slice(0, 10) + "T23:59:59.999+03:00");
  const diff = end.getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  return Number.isFinite(d) ? d : null;
}
function ShiftSummary({ st }) {
  const tTot = Number(st?.todayTotal ?? 0);
  const tDone = Number(st?.todayDone ?? 0);
  const h = Number(st?.horizonOpen ?? 0);
  return (
    <div className="muted" style={{ lineHeight: 1.2 }}>
      <div>Bugün: {tTot ? (tDone + "/" + tTot + " tamamlandı") : "-"}</div>
      <div>Ufuk: {h ? (h + " kabul edildi") : "-"}</div>
    </div>
  );
}


function pill(status) {
  const s = String(status || "").toUpperCase();
  return (
    <span className="pill" data-status={s} title={agreementStatusText(s)}>
      {agreementStatusPillLabel(s)}
    </span>
  );
}

function moneyTry(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `₺${n}`;
}

function trDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarizeRoutePreview(payload) {
  const summary = payload?.summary || {};
  const stops = Array.isArray(payload?.stops) ? payload.stops : [];
  const people = Array.isArray(payload?.people) ? payload.people : [];

  const distanceCandidates = [
    summary?.distanceM,
    summary?.routeDistanceM,
    summary?.routeSnapshotDistanceM,
    payload?.routeSnapshotDistanceM,
    Number.isFinite(Number(summary?.distanceKmSnapshot)) ? Number(summary.distanceKmSnapshot) * 1000 : null,
    Number.isFinite(Number(summary?.distanceKmLearned)) ? Number(summary.distanceKmLearned) * 1000 : null,
    Number.isFinite(Number(summary?.distanceKm)) ? Number(summary.distanceKm) * 1000 : null,
  ];
  const durationCandidates = [
    summary?.durationSec,
    summary?.routeDurationSec,
    summary?.routeSnapshotDurationSec,
    payload?.routeSnapshotDurationSec,
    Number.isFinite(Number(summary?.durationMinSnapshot)) ? Number(summary.durationMinSnapshot) * 60 : null,
    Number.isFinite(Number(summary?.durationMinLearned)) ? Number(summary.durationMinLearned) * 60 : null,
    Number.isFinite(Number(summary?.durationMin)) ? Number(summary.durationMin) * 60 : null,
  ];
  const firstFinite = (list) => {
    for (const value of list) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  };

  return {
    peopleCount: Math.max(0, Number(summary?.peopleCount ?? people.length ?? 0) || 0),
    stopCount: Math.max(0, Number(summary?.stopCount ?? stops.length ?? 0) || 0),
    distanceM: Math.max(0, firstFinite(distanceCandidates)),
    durationSec: Math.max(0, firstFinite(durationCandidates)),
  };
}

function formatKm(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  const km = n / 1000;
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

function formatDuration(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${Math.round(n / 60)} dk`;
}

function routeSummaryText(summary, fallback = null) {
  const src = summary || fallback || {};
  return [
    `${Math.max(0, Number(src?.peopleCount || 0))} personel`,
    `${Math.max(0, Number(src?.stopCount || 0))} durak`,
    formatKm(src?.distanceM),
    formatDuration(src?.durationSec),
  ].join(" · ");
}

function routeDiffText(currentSummary, proposedSummary) {
  const current = currentSummary || {};
  const proposed = proposedSummary || {};
  const parts = [];
  const peopleDelta = Number(proposed?.peopleCount || 0) - Number(current?.peopleCount || 0);
  const stopDelta = Number(proposed?.stopCount || 0) - Number(current?.stopCount || 0);
  const distanceDelta = Number(proposed?.distanceM || 0) - Number(current?.distanceM || 0);
  const durationDelta = Number(proposed?.durationSec || 0) - Number(current?.durationSec || 0);
  if (peopleDelta) parts.push(`${peopleDelta > 0 ? "+" : ""}${peopleDelta} personel`);
  if (stopDelta) parts.push(`${stopDelta > 0 ? "+" : ""}${stopDelta} durak`);
  if (distanceDelta) parts.push(`${distanceDelta > 0 ? "+" : "-"}${formatKm(Math.abs(distanceDelta))}`);
  if (durationDelta) parts.push(`${durationDelta > 0 ? "+" : "-"}${formatDuration(Math.abs(durationDelta))}`);
  return parts.length ? parts.join(" · ") : "Kişi / durak / km / süre farkı yok";
}

function routePriceDiffText(currentAmount, nextAmount) {
  const current = Number(currentAmount || 0);
  const next = Number(nextAmount ?? currentAmount ?? 0);
  const diff = next - current;
  const fmt = (n) => new Intl.NumberFormat("tr-TR").format(Number(n || 0)) + " ₺";
  return `${fmt(current)} → ${fmt(next)} (${diff > 0 ? "+" : ""}${fmt(diff)})`;
}

function AgreementOpsBridgeCard({ agreement, bridge, onOpenShift, onOpenPreview }) {
  if (!agreement) return null;
  const generatedCount = Number(bridge?.generatedCount || 0);
  const lastShift = bridge?.lastShift || null;
  const vehicleLabel = bridge?.agreementVehicle?.plate || lastShift?.vehicle?.plate || (agreement?.vehicleId ? `#${agreement.vehicleId}` : "-");
  const driverLabel = bridge?.agreementDriver?.fullName || lastShift?.driver?.fullName || (agreement?.driverId ? `#${agreement.driverId}` : "-");
  const hubText = typeof agreement?.hubLat === "number" && typeof agreement?.hubLng === "number" ? `${agreement.hubLat.toFixed(4)}, ${agreement.hubLng.toFixed(4)}` : "-";

  return (
    <div className="card" style={{ border: "1px solid rgba(88,166,255,.28)" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>Operasyon Köprüsü</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {agreementStatusText(agreement?.status)} • {String(agreement?.direction || "-").toUpperCase()} / {String(agreement?.pattern || "-").toUpperCase()}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill">Üretilen vardiya: {generatedCount}</span>
          <span className="pill">{toHHMM(agreement?.startMin)} → {toHHMM(agreement?.endMin)}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <div><div className="muted">Araç</div><div style={{ fontWeight: 800 }}>{vehicleLabel}</div></div>
        <div><div className="muted">Sürücü</div><div style={{ fontWeight: 800 }}>{driverLabel}</div></div>
        <div><div className="muted">Hub</div><div style={{ fontWeight: 800 }}>{hubText}</div></div>
        <div><div className="muted">Plan</div><div style={{ fontWeight: 800 }}>{weekMaskToText(agreement?.weekMask) || "-"}</div></div>
      </div>
      {lastShift ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Son üretilen vardiya #{lastShift.id}</div>
              <div className="muted" style={{ marginTop: 4 }}>{String(lastShift.status || "-").toUpperCase()} • {trDateTime(lastShift.startAt)} → {trDateTime(lastShift.endAt)}</div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={() => onOpenShift?.(lastShift.id)}>Vardiyaya Git</button>
              <button type="button" className="btn" disabled={!lastShift?.previewAvailable && !lastShift?.id} onClick={() => onOpenPreview?.(lastShift.id)}>Rota Önizleme</button>
            </div>
          </div>
          <div className="muted" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
            <div>Durak: <b>{Number(lastShift.stopCount || 0)}</b></div>
            <div>Personel: <b>{Number(lastShift.peopleCount || 0)}</b></div>
            <div>Mesafe: <b>{lastShift.routeSnapshotDistanceM ? `${Math.round(Number(lastShift.routeSnapshotDistanceM) / 1000)} km` : "-"}</b></div>
            <div>Süre: <b>{lastShift.routeSnapshotDurationSec ? `${Math.round(Number(lastShift.routeSnapshotDurationSec) / 60)} dk` : "-"}</b></div>
          </div>
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 12 }}>Bu sözleşmeye bağlı üretilmiş vardiya henüz yok.</div>
      )}
    </div>
  );
}

function ymd(d) {
  return String(d || "").slice(0, 10);
}


function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function OfferCell({ amount, note }) {
  const a = moneyTry(amount);
  const n = String(note || "").trim();
  return (
    <div title={n || ""}>
      <div style={{ fontWeight: 800 }}>{a}</div>
      {n ? <div className="muted" style={{ fontSize: 12 }}>{n}</div> : null}
    </div>
  );
}


function buildAgreementCopilotFacts(item, summary = {}) {
  const status = String(item?.status || '').toUpperCase();
  const hasVehicle = Boolean(item?.vehicleId);
  const hasDriver = Boolean(item?.driverId);
  const shiftOpen = Number(item?.shiftCount ?? summary.shiftCount ?? 0) > 0;
  const blockers = [];
  const missing = [];
  if (!item?.id) blockers.push('Önce odak sözleşme seçilmeden yorum genel kalır.');
  if (!hasVehicle) missing.push('Araç seçilmemiş');
  if (!hasDriver) missing.push('Sürücü seçilmemiş');
  if (["ACTIVE", "APPROVED"].includes(status) && (!hasVehicle || !hasDriver)) blockers.push('Sözleşme aktif görünse de araç veya sürücü eksikse saha için tam hazır değildir.');
  if (["REQUESTED", "COUNTERED"].includes(status)) blockers.push('Karar bekleyen sözleşmede önce onay / karşı teklif yönü netleşmelidir.');
  return {
    screenType: 'AGREEMENTS',
    stage: status || '-',
    readiness: blockers.length ? 'REVIEW_NEEDED' : (["ACTIVE", "APPROVED"].includes(status) ? 'READY' : 'REVIEW_NEEDED'),
    readinessScore: blockers.length ? 48 : (["ACTIVE", "APPROVED"].includes(status) ? 84 : 66),
    blockers,
    missing,
    counters: {
      pending: Number(summary.pendingCount || 0),
      other: Number(summary.otherCount || 0),
      extend: Number(summary.extendCount || 0),
      shifts: Number(item?.shiftCount ?? 0),
    },
    evidence: [
      `Durum: ${status || '-'}`,
      `Tutar: ${moneyTry(item?.companyOfferAmount ?? item?.amount ?? '-')}`,
      `Araç: ${hasVehicle ? `#${item.vehicleId}` : 'Yok'}`,
      `Sürücü: ${hasDriver ? `#${item.driverId}` : 'Yok'}`,
      `Vardiya: ${shiftOpen ? 'Var' : 'Yok'}`,
    ],
    reasoningLead: blockers.length
      ? 'Bu sözleşmede ana risk karar veya atama tarafında görünüyor.'
      : 'Bu sözleşmede önce durum, sonra tarih ve araç-sürücü bağı okunmalı.',
    nextBestAction: status === 'REQUESTED'
      ? 'Önce sözleşmeyi onaylayacaksan araç ve sürücü seç. Karşı teklif vereceksen tutar ve notu netleştir.'
      : status === 'COUNTERED'
        ? 'Önce karşı teklif notunu ve tutarı tekrar kontrol et. Sonra karar yönünü netleştir.'
        : (["ACTIVE", "APPROVED"].includes(status)
          ? 'Önce bağlı vardiya ve ufukta üretilen iş sayısını kontrol et.'
          : 'Önce durum ve tarih aralığını doğrula. Sonra bağlı işi görmek için vardiya tarafına geç.'),
    safestNextStep: 'En risksiz adım, seçili sözleşmenin tarih aralığı ile araç-sürücü bağını birlikte doğrulamaktır.',
    compareHint: 'Sözleşme onayı ile saha hazırlığı aynı şey değildir; araç ve sürücü eksikse iş hâlâ operasyona tam hazır sayılmaz.',
  };
}

function ConflictBox({ errObj }) {
  if (!errObj) return null;
  const code = errObj?.code;
  const msg = errObj?.message || errObj?.error || "Conflict";
  const c = errObj?.conflictingAgreement;

  return (
    <div className="card" style={{ borderColor: "rgba(239,68,68,.45)", background: "rgba(85,16,20,.25)" }}>
      <div style={{ fontWeight: 900 }}>{code || "CONFLICT"}</div>
      <div className="muted" style={{ marginTop: 6 }}>{msg}</div>

      {c ? (
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          <div>
            conflict agreementId: <b>{c.id}</b>
          </div>
          <div>status: {c.status}</div>
          <div>
            date: {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
          </div>
          <div>
            time: {toHHMM(c.startMin)} → {toHHMM(c.endMin)}
          </div>
          <div>
            days: {weekMaskToText(c.weekMask)} (mask={c.weekMask})
          </div>
          <div>
            v:{c.vehicleId ?? "-"} / d:{c.driverId ?? "-"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AgreementsPanel() {
  const { token } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [pending, setPending] = useState([]);
  const [others, setOthers] = useState([]);
  const [shiftStats, setShiftStats] = useState({}); // ✅ M59
  const [opsBridge, setOpsBridge] = useState({});
  const [routeRefreshItems, setRouteRefreshItems] = useState([]);
  const [routeRefreshPreviewById, setRouteRefreshPreviewById] = useState({});
  const [previewModal, setPreviewModal] = useState({ open: false, shiftId: null, title: "Rota Önizleme" });

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [approveId, setApproveId] = useState(null);
  const [selVehicle, setSelVehicle] = useState("");
  const [selDriver, setSelDriver] = useState("");
  const [conflict, setConflict] = useState(null);

  const [counterId, setCounterId] = useState(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");

  // ✅ M57: agreement extend negotiation (Room side)
  const [extendItems, setExtendItems] = useState([]);
  const [extendCounterId, setExtendCounterId] = useState(null);
  const [extendCounterAmount, setExtendCounterAmount] = useState("");
  const [extendCounterNote, setExtendCounterNote] = useState("");
  const [selectedAgreementId, setSelectedAgreementId] = useState(null);
  const [filterQ, setFilterQ] = useState("");

  const approveTarget = useMemo(() => pending.find((x) => x.id === approveId), [pending, approveId]);
  const counterTarget = useMemo(() => pending.find((x) => x.id === counterId), [pending, counterId]);
  const extendCounterTarget = useMemo(() => extendItems.find((x) => x.id === extendCounterId), [extendItems, extendCounterId]);
  const selectedAgreement = useMemo(() => {
    const wanted = Number(selectedAgreementId || 0);
    if (!wanted) return null;
    return pending.find((x) => Number(x.id) === wanted) || others.find((x) => Number(x.id) === wanted) || extendItems.find((x) => Number(x.id) === wanted) || null;
  }, [selectedAgreementId, pending, others, extendItems]);
  const copilotAgreementTarget = useMemo(() => selectedAgreement || approveTarget || counterTarget || extendCounterTarget || pending[0] || others[0] || null, [selectedAgreement, approveTarget, counterTarget, extendCounterTarget, pending, others]);
  const filteredExtendItems = useMemo(() => extendItems.filter((a) => includesFilter([
    a?.id, a?.status, a?.extendStatus, a?.startDate, a?.endDate, a?.extendRequestedEndDate, a?.extendRequestedEndAt,
    a?.companyOfferAmount, a?.roomOfferAmount, a?.extendOfferAmount, a?.extendCounterAmount,
    a?.companyOfferNote, a?.roomOfferNote, a?.extendOfferNote, a?.extendCounterNote, weekMaskToText(a?.weekMask),
  ], filterQ)), [extendItems, filterQ]);
  const filteredPending = useMemo(() => pending.filter((a) => includesFilter([
    a?.id, a?.status, a?.startDate, a?.endDate, a?.companyOfferAmount, a?.roomOfferAmount, a?.companyOfferNote, a?.roomOfferNote,
    a?.direction, a?.pattern, a?.hubLat, a?.hubLng, weekMaskToText(a?.weekMask),
  ], filterQ)), [pending, filterQ]);
  const filteredOthers = useMemo(() => others.filter((a) => includesFilter([
    a?.id, a?.status, a?.startDate, a?.endDate, a?.companyOfferAmount, a?.roomOfferAmount, a?.companyOfferNote, a?.roomOfferNote,
    a?.direction, a?.pattern, a?.hubLat, a?.hubLng, weekMaskToText(a?.weekMask),
  ], filterQ)), [others, filterQ]);
  const agreementById = useMemo(() => {
    const map = {};
    [...pending, ...others, ...extendItems].forEach((item) => {
      const id = Number(item?.id || 0);
      if (id > 0 && !map[String(id)]) map[String(id)] = item;
    });
    return map;
  }, [pending, others, extendItems]);
  const filteredRouteRefreshItems = useMemo(() => routeRefreshItems.filter((item) => includesFilter([
    item?.id,
    item?.agreementId,
    item?.status,
    item?.startDate,
    item?.endDate,
    item?.companyOfferAmount,
    item?.companyOfferNote,
    item?.peopleCount,
    item?.stopCount,
  ], filterQ)), [routeRefreshItems, filterQ]);

  useEffect(() => {
    const item = copilotAgreementTarget;
    if (!item) {
      clearCopilotSelection('/room/agreements');
      return;
    }
    const facts = buildAgreementCopilotFacts(item, { pendingCount: pending.length, otherCount: others.length, extendCount: extendItems.length, shiftCount: Number(shiftStats?.[item.id]?.todayTotal || 0) + Number(shiftStats?.[item.id]?.horizonOpen || 0) });
    setCopilotSelection({
      scopeKey: '/room/agreements',
      entityType: item?.shiftId ? 'shift' : 'screen',
      entityId: Number(item?.shiftId || 1106) || 1106,
      label: `Sözleşme #${item.id}`,
      summary: [String(item?.status || '').toUpperCase() || '-', ymdTR(item?.startDate), ymdTR(item?.endDate)].filter(Boolean).join(' • '),
      fields: [
        { label: 'Durum', value: String(item?.status || '-').toUpperCase(), help: 'Sözleşmenin karar veya aktiflik durumunu gösterir.' },
        { label: 'Başlangıç', value: ymdTR(item?.startDate), help: 'Sözleşmenin başlangıç tarihini gösterir.' },
        { label: 'Bitiş', value: ymdTR(item?.endDate), help: 'Sözleşmenin bitiş tarihini gösterir.' },
        { label: 'Tutar', value: moneyTry(item?.companyOfferAmount ?? item?.amount ?? '-'), help: 'Şirkete ait teklif veya sözleşme tutarını gösterir.' },
        { label: 'Araç', value: item?.vehicleId ? `#${item.vehicleId}` : '-', help: 'Onay sırasında seçilen aracı gösterir.' },
        { label: 'Sürücü', value: item?.driverId ? `#${item.driverId}` : '-', help: 'Onay sırasında seçilen sürücüyü gösterir.' },
        { label: 'Bugün / Ufuk', value: `${Number(shiftStats?.[item.id]?.todayDone || 0)}/${Number(shiftStats?.[item.id]?.todayTotal || 0)} tamamlandı • ${Number(shiftStats?.[item.id]?.horizonOpen || 0)} kabul edildi`, help: 'Bugünkü ilerlemeyi ve 7 günlük ufuktaki üretilmiş vardiya sayısını gösterir.' },
      ],
      badges: [
        { label: 'Liste', value: pending.some((x) => x.id === item.id) ? 'Bekleyen' : others.some((x) => x.id === item.id) ? 'Diğer' : 'Uzatma', help: 'Sözleşmenin şu an hangi bölümde göründüğünü gösterir.' },
        { label: 'Kalan Gün', value: daysLeftYmd(item?.endDate) == null ? '-' : `${daysLeftYmd(item?.endDate)} gün`, help: 'Bitiş tarihine kaç gün kaldığını özetler.' },
      ],
      facts,
    });
    return () => clearCopilotSelection('/room/agreements');
  }, [copilotAgreementTarget, pending, others, extendItems, shiftStats]);

  function openAgreementShift(shiftId) {
    const sid = Number(shiftId || 0);
    if (!sid) return;
    try { localStorage.setItem("room:focusShiftId", String(sid)); } catch (e) { void e; }
    navigate("/room/shifts");
  }

  function openAgreementPreview(shiftId, options = {}) {
    const sid = Number(shiftId || 0);
    if (!sid) return;
    const nextTitle = String(options?.title || "").trim();
    setPreviewModal({
      open: true,
      shiftId: sid,
      title: nextTitle || `Shift #${sid} — Harita Önizleme`,
    });
  }

  useEffect(() => {
    if (!token || !routeRefreshItems.length) {
      setRouteRefreshPreviewById({});
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const items = routeRefreshItems.slice(0, 12);
    const loadingMap = Object.fromEntries(items.map((item) => [String(item.id), { loading: true, current: null, proposed: null, err: "" }]));
    setRouteRefreshPreviewById(loadingMap);
    (async () => {
      const results = await Promise.all(items.map(async (item) => {
        const requestId = Number(item?.id || 0);
        const sourceShiftId = Number(item?.sourceShiftId || 0);
        const draftShiftId = Number((item?.draftShiftIds || [])[0] || 0);
        try {
          const [currentRaw, proposedRaw] = await Promise.all([
            sourceShiftId > 0 ? getShiftRoutePreview(token, sourceShiftId, { signal: controller.signal, force: true, ttlMs: 0, delayMs: 0 }) : null,
            draftShiftId > 0 ? getShiftRoutePreview(token, draftShiftId, { signal: controller.signal, force: true, ttlMs: 0, delayMs: 0 }) : null,
          ]);
          return [String(requestId), {
            loading: false,
            current: summarizeRoutePreview(currentRaw),
            proposed: summarizeRoutePreview(proposedRaw),
            err: "",
          }];
        } catch (error) {
          return [String(requestId), {
            loading: false,
            current: null,
            proposed: null,
            err: error?.message || "Rota özeti yüklenemedi.",
          }];
        }
      }));
      if (cancelled) return;
      setRouteRefreshPreviewById(Object.fromEntries(results));
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, routeRefreshItems]);

  async function loadAll() {
    if (!token) return;
    setErr("");
    try {
      const all = await api("/api/agreements?take=200", { token });
      const items = all?.items ?? [];

      // ✅ M59: shift stats (today/horizon) for UI clarity
      try {
        const ids = items.map((x) => x?.id).filter(Boolean);
        if (ids.length) {
          const [st, bridge, routeRefresh] = await Promise.all([
            api("/api/agreements/shift-stats", { token, method: "POST", body: { agreementIds: ids, horizonDays: 7 } }),
            api("/api/agreements/ops-bridge", { token, method: "POST", body: { agreementIds: ids } }),
            api("/api/agreements/route-refresh?status=PENDING", { token }).catch(() => ({ items: [] })),
          ]);
          setShiftStats(st?.byId ?? {});
          setOpsBridge(bridge?.byId ?? {});
          setRouteRefreshItems(Array.isArray(routeRefresh?.items) ? routeRefresh.items : []);
        } else {
          setShiftStats({});
          setOpsBridge({});
          setRouteRefreshItems([]);
        }
      } catch {
        setShiftStats({});
        setOpsBridge({});
        setRouteRefreshItems([]);
      }


      // ✅ M58.3: robust extend request detection (handles older/variant field names)
      const extend = items.filter((x) => {
        const es = String(x?.extendStatus || "NONE").toUpperCase();
        const reqEnd = x?.extendRequestedEndDate ?? x?.extendRequestedEndAt ?? x?.extendRequestedEnd ?? null;
        // REQUESTED/COUNTERED are canonical. PENDING is tolerated as alias for safety.
        return !!reqEnd && ["REQUESTED", "COUNTERED", "PENDING"].includes(es);
      });
      setExtendItems(extend);
      setPending(items.filter((x) => String(x.status || "").toUpperCase() === "REQUESTED"));
      setOthers(items.filter((x) => String(x.status || "").toUpperCase() !== "REQUESTED"));

      const v = await api("/api/vehicles", { token });
      setVehicles(v?.items ?? v ?? []);

      const d = await api("/api/drivers", { token });
      setDrivers(d?.items ?? d ?? []);
    } catch (e) {
      setErr(e?.message || "Load failed");
    }
  }

  // ✅ WS invalidate → agreements topic gelince reload
  useAutoReload("agreements", loadAll, !!token);

  useEffect(() => {
    if (!token) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function approve() {
    setConflict(null);
    setErr("");

    if (!approveId) return;
    const vehicleId = Number(selVehicle);
    const driverId = Number(selDriver);
    if (!vehicleId || !driverId) return setErr("vehicle+driver seçmelisin");

    setBusy(true);
    try {
      await api(`/api/agreements/${approveId}/approve`, {
        token,
        method: "PUT",
        body: { vehicleId, driverId },
      });

      setApproveId(null);
      setSelVehicle("");
      setSelDriver("");
      await loadAll();
    } catch (e) {
      const status = e?.status ?? null;
      const payload = e?.payload ?? null;

      if (status === 409) {
        setConflict(payload || { code: "CONFLICT", message: e?.message || "Conflict" });
      } else {
        setErr(e?.message || "Approve failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function counter() {
    setErr("");
    if (!counterId) return;
    const amount = parseTryInput(counterAmount);
    if (!amount) return setErr("Karşı teklif amount gerekli");

    setBusy(true);
    try {
      await api(`/api/agreements/${counterId}/counter`, {
        token,
        method: "PUT",
        body: { roomOfferAmount: amount, roomOfferNote: String(counterNote || "").trim() || null },
      });

      setCounterId(null);
      setCounterAmount("");
      setCounterNote("");
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Counter failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectAgreement(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/reject`, { token, method: "PUT", body: {} });
      if (Number(counterId || 0) === Number(id)) {
        setCounterId(null);
        setCounterAmount("");
        setCounterNote("");
      }
      if (Number(approveId || 0) === Number(id)) {
        setApproveId(null);
        setSelVehicle("");
        setSelDriver("");
        setConflict(null);
      }
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function decideRouteRefresh(requestId, decision) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/route-refresh/${requestId}/decision`, {
        token,
        method: "PUT",
        body: { decision },
      });
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Rota güncelleme kararı kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function extendDecision(id, decision) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend-decision`, { token, method: "PUT", body: { decision } });
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Extend decision failed");
    } finally {
      setBusy(false);
    }
  }

  async function extendCounter() {
    setErr("");
    if (!extendCounterId) return;
    const amount = parseTryInput(extendCounterAmount);
    if (!amount) return setErr("Uzatma karşı teklif amount gerekli");

    setBusy(true);
    try {
      await api(`/api/agreements/${extendCounterId}/extend-counter`, {
        token,
        method: "PUT",
        body: { extendCounterAmount: amount, extendCounterNote: String(extendCounterNote || "").trim() || null },
      });

      setExtendCounterId(null);
      setExtendCounterAmount("");
      setExtendCounterNote("");
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Extend counter failed");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="card">
      <div className="topbar">
        <div>
          <div className="title">Sözleşmeler (Room)</div>
          <div className="muted">Bekleyen sözleşmeler burada karar bekler. Oda bu ekranda kabul / karşı teklif / red kararını verir. Not: sözleşme durumu zaman bazlıdır (endDate+endMin). Sürücü vardiyayı bitirse bile sözleşme endDate geçene kadar devam ediyor görünebilir. Uzatma talepleri de burada yönetilir.</div>
        </div>
        <button type="button" className="btn sm ghost" disabled={busy} onClick={loadAll}>
          Yenile
        </button>
      </div>

      {err ? <div className="card err">{String(err)}</div> : null}

      {copilotAgreementTarget ? (
        <AgreementOpsBridgeCard agreement={copilotAgreementTarget} bridge={opsBridge?.[copilotAgreementTarget.id] || null} onOpenShift={openAgreementShift} onOpenPreview={openAgreementPreview} />
      ) : null}

      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <div className="muted">Filtre</div>
          <input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="ID / durum / teklif / tarih / not" />
        </div>
        <div className="muted">Gösterilen: <b>{filteredRouteRefreshItems.length + filteredPending.length + filteredOthers.length + filteredExtendItems.length}</b> / Toplam: <b>{routeRefreshItems.length + pending.length + others.length + extendItems.length}</b></div>
      </div>


      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Rota Güncelleme Talepleri</div>
        <div className="muted" style={{ marginBottom: 12 }}>
          Bu alan vardiya pazarlığı değil, aktif sözleşmeye bağlı rota değişiklik talebidir. Oda burada mevcut rota ile önerilen yeni rotayı karşılaştırıp karar verir.
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {filteredRouteRefreshItems.map((item) => {
            const requestId = Number(item?.id || 0);
            const agreementId = Number(item?.agreementId || 0);
            const agreement = agreementById[String(agreementId)] || null;
            const preview = routeRefreshPreviewById[String(requestId)] || { loading: false, current: null, proposed: null, err: "" };
            const sourceShiftId = Number(item?.sourceShiftId || 0);
            const draftShiftId = Number((item?.draftShiftIds || [])[0] || 0);
            const bridgeShift = opsBridge?.[agreementId]?.lastShift || null;
            const currentSummaryFallback = {
              peopleCount: Number(bridgeShift?.peopleCount || preview?.current?.peopleCount || 0),
              stopCount: Number(bridgeShift?.stopCount || preview?.current?.stopCount || 0),
              distanceM: Number(bridgeShift?.routeSnapshotDistanceM || preview?.current?.distanceM || 0),
              durationSec: Number(bridgeShift?.routeSnapshotDurationSec || preview?.current?.durationSec || 0),
            };
            const proposedSummaryFallback = {
              peopleCount: Number(item?.peopleCount || 0),
              stopCount: Number(item?.stopCount || 0),
              distanceM: Number(preview?.proposed?.distanceM || 0),
              durationSec: Number(preview?.proposed?.durationSec || 0),
            };
            const effectiveCurrentSummary = preview?.current || currentSummaryFallback;
            const effectiveProposedSummary = preview?.proposed || proposedSummaryFallback;
            return (
              <div
                key={item.id}
                className="card"
                style={{ border: Number(selectedAgreementId || 0) === agreementId ? "1px solid rgba(88,166,255,.42)" : "1px solid rgba(255,255,255,.08)" }}
                onClick={() => setSelectedAgreementId(agreementId)}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Sözleşme #{agreementId} • Rota güncelleme #{item.id}</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {String(item?.startDate || "-").slice(0, 10)} → {String(item?.endDate || "-").slice(0, 10)} • {trDateTime(item?.createdAt)}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span className="pill">{Number(item?.shiftCount || 0)} taslak vardiya</span>
                    <span className="pill">{String(item?.direction || agreement?.direction || "INBOUND").toUpperCase()} / {String(item?.pattern || agreement?.pattern || "ONE_WAY").toUpperCase()}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
                    <div className="muted">Mevcut rota</div>
                    <div style={{ fontWeight: 800, marginTop: 4 }}>
                      {routeSummaryText(effectiveCurrentSummary)}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
                    <div className="muted">Önerilen yeni rota</div>
                    <div style={{ fontWeight: 800, marginTop: 4 }}>
                      {routeSummaryText(effectiveProposedSummary)}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
                    <div className="muted">Fark</div>
                    <div style={{ fontWeight: 800, marginTop: 4 }}>
                      {routeDiffText(effectiveCurrentSummary, effectiveProposedSummary)}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
                    <div className="muted">Ücret etkisi</div>
                    <div style={{ fontWeight: 800, marginTop: 4 }}>
                      {routePriceDiffText(agreement?.companyOfferAmount, item?.companyOfferAmount ?? agreement?.companyOfferAmount)}
                    </div>
                    {item?.companyOfferNote ? <div className="muted" style={{ marginTop: 6 }}>{item.companyOfferNote}</div> : null}
                  </div>
                </div>

                {preview?.err ? <div className="muted" style={{ marginTop: 10 }}>Rota özeti yüklenemedi: {preview.err}</div> : null}
                {preview?.loading ? <div className="muted" style={{ marginTop: 10 }}>Rota özeti yükleniyor…</div> : null}

                <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button type="button" className="btn sm ghost" disabled={!sourceShiftId} onClick={(e) => { e.stopPropagation(); openAgreementPreview(sourceShiftId, { title: `Sözleşme #${agreementId} — Mevcut Rota` }); }}>
                    Mevcut Rotayı Gör
                  </button>
                  <button type="button" className="btn sm ghost" disabled={!draftShiftId} onClick={(e) => { e.stopPropagation(); openAgreementPreview(draftShiftId, { title: `Sözleşme #${agreementId} — Önerilen Yeni Rota` }); }}>
                    Yeni Rotayı Önizle
                  </button>
                  <button type="button" className="btn sm ghost" disabled={busy} onClick={(e) => { e.stopPropagation(); decideRouteRefresh(requestId, "CANCEL"); }}>
                    İptal Et
                  </button>
                  <button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); decideRouteRefresh(requestId, "ACCEPT"); }}>
                    Kabul Et
                  </button>
                </div>
              </div>
            );
          })}
          {!filteredRouteRefreshItems.length ? (
            <div className="muted">Bekleyen rota güncelleme talebi yok.</div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Uzatma Talepleri</div>
        <div className="muted" style={{ marginBottom: 10 }}>
          Şirket uzatma teklifi gönderir → oda kabul / reddet / karşı teklif verir.
        </div>

        <div className="tableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mevcut</th>
                <th>İstenen</th>
                <th>Şirket Uzatma Teklifi</th>
                <th>Oda Karşı Teklifi</th>
                <th>Durum</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filteredExtendItems.map((a) => {
                const ex = String(a.extendStatus || "NONE").toUpperCase();
                const reqEnd = ymd(a.extendRequestedEndDate);
                return (
                  <tr key={"ext-" + a.id} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
                    <td><div>{a.id}</div><CommercialReadonlySummary item={a.commercialBackbone} compact /></td>
                    <td className="muted">{ymd(a.startDate)} → {ymd(a.endDate)}</td>
                    <td className="muted">{reqEnd || "-"}</td>
                    <td><OfferCell amount={a.extendOfferAmount} note={a.extendOfferNote} /></td>
                    <td><OfferCell amount={a.extendCounterAmount} note={a.extendCounterNote} /></td>
                    <td className="muted">{agreementExtendStatusText(ex)}</td>
                    <td>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="btn sm" disabled={busy || ex !== "PENDING"} onClick={(e) => { e.stopPropagation(); extendDecision(a.id, "ACCEPT"); }}>
                          Kabul
                        </button>
                        <button type="button" className="btn sm ghost" disabled={busy || ex !== "PENDING"} onClick={(e) => { e.stopPropagation(); extendDecision(a.id, "REJECT"); }}>
                          Reddet
                        </button>
                        <button
                          type="button"
                          className="btn sm ghost"
                          disabled={busy || ex !== "PENDING"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExtendCounterId(a.id);
                            setExtendCounterAmount(String(a.extendCounterAmount ?? a.extendOfferAmount ?? a.companyOfferAmount ?? ""));
                            setExtendCounterNote(String(a.extendCounterNote ?? ""));
                          }}
                        >
                          Karşı Teklif
                        </button>
                        {ex === "COUNTERED" ? <span className="muted" style={{ fontSize: 12 }}>Şirket kararı bekleniyor…</span> : null}
                      </div>

                      {extendCounterId === a.id ? (
                        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                          <input
                            className="inp"
                            placeholder="Karşı teklif (₺)"
                            value={extendCounterAmount}
                            onChange={(e) => setExtendCounterAmount(e.target.value)}
                            disabled={busy}
                          />
                          <input
                            className="inp"
                            placeholder="Not (opsiyonel)"
                            value={extendCounterNote}
                            onChange={(e) => setExtendCounterNote(e.target.value)}
                            disabled={busy}
                          />
                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                            <button type="button" className="btn sm" disabled={busy} onClick={extendCounter}>
                              Gönder
                            </button>
                            <button
                              type="button"
                              className="btn sm ghost"
                              disabled={busy}
                              onClick={() => {
                                setExtendCounterId(null);
                                setExtendCounterAmount("");
                                setExtendCounterNote("");
                              }}
                            >
                              Vazgeç
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!filteredExtendItems.length ? (
                <tr>
                  <td colSpan={7} className="muted">Uzatma talebi yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

<div className="card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Bekleyen Sözleşmeler</div>
        <div className="tableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tarih</th>
                <th>Saat</th>
                <th>Günler</th>
                <th>Dir/Pat</th>
                <th>Vardiyalar</th>
                <th>Hub</th>
                <th>Şirket Teklifi</th>
                <th>Oda Karşı Teklifi</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filteredPending.map((a) => (
                <tr key={a.id} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
                  <td><div>{a.id}</div><CommercialReadonlySummary item={a.commercialBackbone} compact /></td>
                  <td className="muted">
                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}
                  </td>
                  <td className="muted">
                    {toHHMM(a.startMin)} → {toHHMM(a.endMin)} {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}
                  </td>
                  <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                  <td className="muted">
                    {String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}
                  </td>
                  <td><ShiftSummary st={shiftStats?.[a.id]} /></td>
                  <td className="muted">
                    {typeof a.hubLat === "number" && typeof a.hubLng === "number" ? `${a.hubLat.toFixed(4)}, ${a.hubLng.toFixed(4)}` : "-"}
                  </td>
                  <td><OfferCell amount={a.companyOfferAmount} note={a.companyOfferNote} /></td>
                  <td><OfferCell amount={a.roomOfferAmount} note={a.roomOfferNote} /></td>
                  <td>
                    <button
                      type="button"
                      className="btn sm ghost"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCounterId(a.id);
                        setApproveId(null);
                        setConflict(null);
                        setCounterAmount(String(a.roomOfferAmount ?? a.companyOfferAmount ?? ""));
                        setCounterNote(String(a.roomOfferNote ?? ""));
                      }}
                    >
                      Karşı Teklif
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        rejectAgreement(a.id);
                      }}
                    >
                      Reddet
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        setApproveId(a.id);
                        setCounterId(null);
                        setConflict(null);
                      }}
                    >
                      Kabul Et
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredPending.length ? (
                <tr>
                  <td colSpan={9} className="muted">Bekleyen sözleşme yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {counterTarget ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Karşı Teklif • Sözleşme #{counterTarget.id}</div>

            <div className="muted" style={{ marginTop: 6 }}>
              Şirket teklifi: <b>{moneyTry(counterTarget.companyOfferAmount)}</b>
              {counterTarget.companyOfferNote ? <span> — {counterTarget.companyOfferNote}</span> : null}
            </div>

            <div className="fieldRow" style={{ marginTop: 12 }}>
              <div className="field">
                <div className="muted">Karşı Teklif (₺)</div>
                <input value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} placeholder="örn: 5000" />
              </div>
              <div className="field" style={{ flex: 2 }}>
                <div className="muted">Not (opsiyonel)</div>
                <input value={counterNote} onChange={(e) => setCounterNote(e.target.value)} placeholder="örn: 3 gün / 2 araç" />
              </div>
            </div>

            <div className="actionsRow" style={{ marginTop: 12 }}>
              <button type="button" className="btn sm primary" disabled={busy} onClick={counter}>
                {busy ? "Gönderiliyor..." : "Karşı Teklif Gönder"}
              </button>
              <button
                type="button"
                className="btn sm ghost"
                disabled={busy}
                onClick={() => {
                  setCounterId(null);
                  setCounterAmount("");
                  setCounterNote("");
                }}
              >
                Vazgeç
              </button>
            </div>
          </div>
        ) : null}

        {approveTarget ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Kabul Akışı • Sözleşme #{approveTarget.id}</div>

            <div className="muted" style={{ marginTop: 6 }}>
              Şirket teklifi: <b>{moneyTry(approveTarget.companyOfferAmount)}</b>
              {approveTarget.companyOfferNote ? <span> — {approveTarget.companyOfferNote}</span> : null}
            </div>

            <div className="fieldRow" style={{ marginTop: 12 }}>
              <div className="field">
                <div className="muted">Araç</div>
                <select
                  value={selVehicle}
                  onChange={(e) => {
                    setSelVehicle(e.target.value);
                    setConflict(null);
                  }}
                >
                  <option value="">Seç</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate ?? `#${v.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <div className="muted">Sürücü</div>
                <select
                  value={selDriver}
                  onChange={(e) => {
                    setSelDriver(e.target.value);
                    setConflict(null);
                  }}
                >
                  <option value="">Seç</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName ?? `#${d.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="actionsRow" style={{ marginTop: 12 }}>
              <button type="button" className="btn sm primary" disabled={busy} onClick={approve}>
                {busy ? "Kabul ediliyor..." : "Kabul Et"}
              </button>
              <button
                type="button"
                className="btn sm ghost"
                disabled={busy}
                onClick={() => {
                  setApproveId(null);
                  setSelVehicle("");
                  setSelDriver("");
                  setConflict(null);
                }}
              >
                Vazgeç
              </button>
            </div>

            <ConflictBox errObj={conflict} />
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 900 }}>Diğer Sözleşmeler</div>
          <div className="muted">Kabul edildi / devam ediyor / tamamlandı / iptal edildi...</div>
        </div>

        <div className="tableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Durum</th>
                <th>Tarih</th>
                <th>Saat</th>
                <th>Günler</th>
                <th>Dir/Pat</th>
                <th>Şirket Teklifi</th>
                <th>Oda Karşı Teklifi</th>
                <th>Araç</th>
                <th>Sürücü</th>
              </tr>
            </thead>
            <tbody>
              {filteredOthers.map((a) => (
                <tr key={a.id} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
                  <td>{a.id}</td>
                  <td>{pill(a.status)}</td>
                  <td className="muted">
                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}
                  </td>
                  <td className="muted">
                    {toHHMM(a.startMin)} → {toHHMM(a.endMin)} {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}
                  </td>
                  <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                  <td className="muted">{String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}</td>
                  <td><OfferCell amount={a.companyOfferAmount} note={a.companyOfferNote} /></td>
                  <td><OfferCell amount={a.roomOfferAmount} note={a.roomOfferNote} /></td>
                  <td className="muted">{a.vehicle?.plate ?? a.vehicleId ?? "-"}</td>
                  <td className="muted">{a.driver?.fullName ?? a.driverId ?? "-"}</td>
                </tr>
              ))}
              {!filteredOthers.length ? (
                <tr>
                  <td colSpan={10} className="muted">Kayıt yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {previewModal.open ? (
        <RoutePreviewModal
          open={previewModal.open}
          onClose={() => setPreviewModal({ open: false, shiftId: null, title: "Rota Önizleme" })}
          title={previewModal.title || (previewModal.shiftId ? `Shift #${previewModal.shiftId} — Harita Önizleme` : "Rota Önizleme")}
          shiftId={previewModal.shiftId}
        />
      ) : null}
    </div>
  );
}





