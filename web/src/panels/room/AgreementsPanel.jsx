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
import AgreementOpsBridgeCard from "../../components/AgreementOpsBridgeCard";
import AgreementConflictBox from "../../components/AgreementConflictBox";
import { agreementExtendStatusText, agreementStatusPillLabel, agreementStatusText } from "../../utils/agreementLabels";
import { getShiftRoutePreview } from "../../utils/shiftRoutePreview";
import { routeDiffText, routeSummaryText, summarizeRoutePreview } from "../../utils/routePreviewSummary";
import { buildAgreementCopilotFacts } from "../../utils/agreementCopilotFacts";
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

function routePriceDiffText(currentAmount, nextAmount) {
  const current = Number(currentAmount || 0);
  const next = Number(nextAmount ?? currentAmount ?? 0);
  const diff = next - current;
  const fmt = (n) => new Intl.NumberFormat("tr-TR").format(Number(n || 0)) + " ₺";
  return `${fmt(current)} → ${fmt(next)} (${diff > 0 ? "+" : ""}${fmt(diff)})`;
}

function RouteRefreshCommercialBox({ item, agreement, accepted = false }) {
  const priorAmount = Number(item?.priorAgreementAmount ?? agreement?.companyOfferAmount ?? 0);
  const companyAmount = Number(item?.initialCompanyOfferAmount ?? item?.companyOfferAmount ?? agreement?.companyOfferAmount ?? priorAmount);
  const roomAmount = item?.roomCounterAmount == null ? null : Number(item.roomCounterAmount);
  const finalAmount = accepted
    ? Number(item?.finalAcceptedAmount ?? (roomAmount ?? item?.companyOfferAmount ?? companyAmount ?? priorAmount))
    : Number(roomAmount ?? item?.companyOfferAmount ?? companyAmount ?? priorAmount);
  return (
    <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
      <div className="muted">{accepted ? "Ücret akışı" : "Ücret pazarlığı"}</div>
      <div style={{ fontWeight: 800, marginTop: 4 }}>
        {routePriceDiffText(priorAmount, finalAmount)}
      </div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
        <div>Mevcut: <b>{moneyTry(priorAmount)}</b></div>
        <div>Şirket teklifi: <b>{moneyTry(companyAmount)}</b>{item?.initialCompanyOfferNote ? <span> — {item.initialCompanyOfferNote}</span> : null}</div>
        <div>Oda karşı teklifi: <b>{roomAmount == null ? "-" : moneyTry(roomAmount)}</b>{item?.roomCounterNote ? <span> — {item.roomCounterNote}</span> : null}</div>
        {accepted ? (
          <div>Uygulanan final: <b>{moneyTry(finalAmount)}</b>{item?.finalAcceptedNote ? <span> — {item.finalAcceptedNote}</span> : null}</div>
        ) : null}
      </div>
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
  const [routeRefreshCounterId, setRouteRefreshCounterId] = useState(null);
  const [routeRefreshCounterAmount, setRouteRefreshCounterAmount] = useState("");
  const [routeRefreshCounterNote, setRouteRefreshCounterNote] = useState("");

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
  const pendingRouteRefreshItems = useMemo(() => routeRefreshItems.filter((item) => ["PENDING", "COUNTERED"].includes(String(item?.status || '').toUpperCase())), [routeRefreshItems]);
  const acceptedRouteRefreshItems = useMemo(() => routeRefreshItems.filter((item) => String(item?.status || '').toUpperCase() === 'ACCEPTED'), [routeRefreshItems]);
  const filteredRouteRefreshItems = useMemo(() => pendingRouteRefreshItems.filter((item) => includesFilter([
    item?.id,
    item?.agreementId,
    item?.status,
    item?.startDate,
    item?.endDate,
    item?.companyOfferAmount,
    item?.companyOfferNote,
    item?.initialCompanyOfferAmount,
    item?.initialCompanyOfferNote,
    item?.roomCounterAmount,
    item?.roomCounterNote,
    item?.peopleCount,
    item?.stopCount,
  ], filterQ)), [pendingRouteRefreshItems, filterQ]);
  const filteredAcceptedRouteRefreshItems = useMemo(() => acceptedRouteRefreshItems.filter((item) => includesFilter([
    item?.id,
    item?.agreementId,
    item?.status,
    item?.startDate,
    item?.endDate,
    item?.companyOfferAmount,
    item?.companyOfferNote,
    item?.initialCompanyOfferAmount,
    item?.initialCompanyOfferNote,
    item?.roomCounterAmount,
    item?.roomCounterNote,
    item?.finalAcceptedAmount,
    item?.finalAcceptedNote,
    item?.peopleCount,
    item?.stopCount,
    item?.decidedAt,
  ], filterQ)), [acceptedRouteRefreshItems, filterQ]);

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

  function agreementPreviewShiftId(agreement) {
    const agreementId = Number(agreement?.id || 0);
    const bridge = agreementId > 0 ? opsBridge?.[String(agreementId)] || null : null;
    const lastShiftId = Number(bridge?.lastShift?.id || 0);
    if (lastShiftId > 0) return lastShiftId;
    const sourceShiftId = Number(
      bridge?.sourceShiftId ||
      bridge?.sourceShift?.id ||
      agreement?.commercialBackbone?.shiftRootId ||
      agreement?.commercialBackbone?.sourceShiftId ||
      0
    );
    return sourceShiftId > 0 ? sourceShiftId : 0;
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
            api("/api/agreements/route-refresh", { token }).catch(() => ({ items: [] })),
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
      setRouteRefreshCounterId(null);
      setRouteRefreshCounterAmount("");
      setRouteRefreshCounterNote("");
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Rota güncelleme kararı kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function counterRouteRefresh() {
    setErr("");
    if (!routeRefreshCounterId) return;
    const amount = parseTryInput(routeRefreshCounterAmount);
    if (!amount) return setErr("Rota güncelleme karşı teklif tutarı gerekli");
    setBusy(true);
    try {
      await api(`/api/agreements/route-refresh/${routeRefreshCounterId}/counter`, {
        token,
        method: "PUT",
        body: {
          roomCounterAmount: amount,
          roomCounterNote: String(routeRefreshCounterNote || "").trim() || null,
        },
      });
      setRouteRefreshCounterId(null);
      setRouteRefreshCounterAmount("");
      setRouteRefreshCounterNote("");
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Rota güncelleme karşı teklif gönderilemedi.");
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
        <div className="muted">Gösterilen: <b>{filteredRouteRefreshItems.length + filteredAcceptedRouteRefreshItems.length + filteredPending.length + filteredOthers.length + filteredExtendItems.length}</b> / Toplam: <b>{routeRefreshItems.length + pending.length + others.length + extendItems.length}</b></div>
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
                  <RouteRefreshCommercialBox item={item} agreement={agreement} />
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
                  <button type="button" className="btn sm ghost" disabled={busy} onClick={(e) => { e.stopPropagation(); setRouteRefreshCounterId(requestId); setRouteRefreshCounterAmount(String(item?.roomCounterAmount || item?.companyOfferAmount || "")); setRouteRefreshCounterNote(String(item?.roomCounterNote || "")); }}>
                    {String(item?.status || '').toUpperCase() === 'COUNTERED' ? 'Karşı Teklifi Güncelle' : 'Karşı Teklif'}
                  </button>
                  <button type="button" className="btn sm ghost" disabled={busy} onClick={(e) => { e.stopPropagation(); decideRouteRefresh(requestId, "CANCEL"); }}>
                    İptal Et
                  </button>
                  {String(item?.status || '').toUpperCase() !== 'COUNTERED' ? (
                    <button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); decideRouteRefresh(requestId, "ACCEPT"); }}>
                      Kabul Et
                    </button>
                  ) : null}
                </div>
                {Number(routeRefreshCounterId || 0) === requestId ? (
                  <div className="card" style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontWeight: 900 }}>Rota güncelleme karşı teklifi</div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      Şirket teklifi: <b>{moneyTry(item?.initialCompanyOfferAmount ?? item?.companyOfferAmount ?? agreement?.companyOfferAmount)}</b>
                      {item?.initialCompanyOfferNote ? <span> — {item.initialCompanyOfferNote}</span> : (item?.companyOfferNote ? <span> — {item.companyOfferNote}</span> : null)}
                    </div>
                    <div className="fieldRow" style={{ marginTop: 12 }}>
                      <div className="field">
                        <div className="muted">Karşı Teklif (₺)</div>
                        <input value={routeRefreshCounterAmount} onChange={(e) => setRouteRefreshCounterAmount(e.target.value)} placeholder="örn: 12000" />
                      </div>
                      <div className="field" style={{ flex: 2 }}>
                        <div className="muted">Not (opsiyonel)</div>
                        <input value={routeRefreshCounterNote} onChange={(e) => setRouteRefreshCounterNote(e.target.value)} placeholder="örn: ek mesafe + yeni durak" />
                      </div>
                    </div>
                    <div className="actionsRow" style={{ marginTop: 12 }}>
                      <button type="button" className="btn sm primary" disabled={busy} onClick={counterRouteRefresh}>
                        {busy ? 'Gönderiliyor...' : 'Karşı Teklif Gönder'}
                      </button>
                      <button type="button" className="btn sm ghost" disabled={busy} onClick={() => { setRouteRefreshCounterId(null); setRouteRefreshCounterAmount(''); setRouteRefreshCounterNote(''); }}>
                        Vazgeç
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!filteredRouteRefreshItems.length ? (
            <div className="muted">Bekleyen rota güncelleme talebi yok.</div>
          ) : null}
        </div>
      </div>


      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Uygulanan Rota Güncellemeleri</div>
        <div className="muted" style={{ marginBottom: 12 }}>
          Kabul edilen rota değişiklikleri burada özet kalır. Oda kabul ettikten sonra eski rota ile uygulanan yeni rotayı tekrar açıp karşılaştırabilir.
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {filteredAcceptedRouteRefreshItems.slice(0, 6).map((item) => {
            const requestId = Number(item?.id || 0);
            const agreementId = Number(item?.agreementId || 0);
            const agreement = agreementById[String(agreementId)] || null;
            const preview = routeRefreshPreviewById[String(requestId)] || { loading: false, current: null, proposed: null, err: "" };
            const sourceShiftId = Number(item?.sourceShiftId || 0);
            const acceptedShiftId = Number((item?.draftShiftIds || [])[0] || 0);
            const currentSummaryFallback = {
              peopleCount: Number(preview?.current?.peopleCount || 0),
              stopCount: Number(preview?.current?.stopCount || 0),
              distanceM: Number(preview?.current?.distanceM || 0),
              durationSec: Number(preview?.current?.durationSec || 0),
            };
            const appliedSummaryFallback = {
              peopleCount: Number(item?.peopleCount || 0),
              stopCount: Number(item?.stopCount || 0),
              distanceM: Number(preview?.proposed?.distanceM || 0),
              durationSec: Number(preview?.proposed?.durationSec || 0),
            };
            const effectiveCurrentSummary = preview?.current || currentSummaryFallback;
            const effectiveAppliedSummary = preview?.proposed || appliedSummaryFallback;
            return (
              <div
                key={"accepted-route-refresh-" + item.id}
                className="card"
                style={{ border: Number(selectedAgreementId || 0) === agreementId ? "1px solid rgba(88,166,255,.42)" : "1px solid rgba(255,255,255,.08)" }}
                onClick={() => setSelectedAgreementId(agreementId)}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Sözleşme #{agreementId} • Uygulanan rota güncelleme #{item.id}</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {String(item?.startDate || "-").slice(0, 10)} → {String(item?.endDate || "-").slice(0, 10)} • Uygulandı: {trDateTime(item?.decidedAt || item?.updatedAt)}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span className="pill" data-status="ACCEPTED">Uygulandı</span>
                    <span className="pill">{Number(item?.shiftCount || 0)} vardiya</span>
                    <span className="pill">{String(item?.direction || agreement?.direction || "INBOUND").toUpperCase()} / {String(item?.pattern || agreement?.pattern || "ONE_WAY").toUpperCase()}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
                    <div className="muted">Önceki rota</div>
                    <div style={{ fontWeight: 800, marginTop: 4 }}>
                      {routeSummaryText(effectiveCurrentSummary)}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
                    <div className="muted">Uygulanan yeni rota</div>
                    <div style={{ fontWeight: 800, marginTop: 4 }}>
                      {routeSummaryText(effectiveAppliedSummary)}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
                    <div className="muted">Fark</div>
                    <div style={{ fontWeight: 800, marginTop: 4 }}>
                      {routeDiffText(effectiveCurrentSummary, effectiveAppliedSummary)}
                    </div>
                  </div>
                  <RouteRefreshCommercialBox item={item} agreement={agreement} accepted />
                </div>

                {preview?.err ? <div className="muted" style={{ marginTop: 10 }}>Rota özeti yüklenemedi: {preview.err}</div> : null}
                {preview?.loading ? <div className="muted" style={{ marginTop: 10 }}>Rota özeti yükleniyor…</div> : null}

                <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button type="button" className="btn sm ghost" disabled={!sourceShiftId} onClick={(e) => { e.stopPropagation(); openAgreementPreview(sourceShiftId, { title: `Sözleşme #${agreementId} — Önceki Rota` }); }}>
                    Önceki Rotayı Gör
                  </button>
                  <button type="button" className="btn sm ghost" disabled={!acceptedShiftId} onClick={(e) => { e.stopPropagation(); openAgreementPreview(acceptedShiftId, { title: `Sözleşme #${agreementId} — Uygulanan Yeni Rota` }); }}>
                    Uygulanan Rotayı Gör
                  </button>
                </div>
              </div>
            );
          })}
          {!filteredAcceptedRouteRefreshItems.length ? (
            <div className="muted">Henüz uygulanmış rota güncellemesi yok.</div>
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
                      disabled={!agreementPreviewShiftId(a)}
                      onClick={(e) => {
                        e.stopPropagation();
                        openAgreementPreview(agreementPreviewShiftId(a), { title: `Sözleşme #${a.id} — Rota Önizleme` });
                      }}
                    >
                      Rota Önizleme
                    </button>
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
                  <td colSpan={10} className="muted">Bekleyen sözleşme yok.</td>
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

            <AgreementConflictBox errObj={conflict} />
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
                <th>Aksiyon</th>
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
                  <td>
                    <button
                      type="button"
                      className="btn sm ghost"
                      disabled={!agreementPreviewShiftId(a)}
                      onClick={(e) => {
                        e.stopPropagation();
                        openAgreementPreview(agreementPreviewShiftId(a), { title: `Sözleşme #${a.id} — Rota Önizleme` });
                      }}
                    >
                      Rota Önizleme
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredOthers.length ? (
                <tr>
                  <td colSpan={11} className="muted">Kayıt yok.</td>
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
