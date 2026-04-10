import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import AgreementWizard from "./AgreementWizard";
import { ProviderScoreCard } from "../../components/ProviderScoreBadge";
import {
  WEEKDAYS,
  DAY_PRESETS,
  TIME_PRESETS,
  DURATION_PRESETS,
  QUICK_DURATION_PRESETS,
  maskFromSelected,
  selectedFromMask,
  weekMaskToText,
  toHHMM,
  parseHHMM,
  addDaysISO,
} from "../../utils/agreementUi";
import { ymdTR } from "../../utils/time";
import { fetchProviderScore } from "../../utils/providerScores";
import { getCompanyAgreements, getCompanyRooms } from "../../utils/companyDataHub";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import ListSelectionBanner from "../../components/ListSelectionBanner";
import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";

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
      <div>Bugün: {tTot ? (tDone + "/" + tTot + " DONE") : "-"}</div>
      <div>Ufuk: {h ? (h + " APPROVED") : "-"}</div>
    </div>
  );
}


function todayYmd() {
  return ymdTR();
}

function isYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

const DEFAULT_DURATION_KEY = QUICK_DURATION_PRESETS?.[0]?.key || "2d";

const PLAN_TEMPLATES = [
  {
    key: "MORNING",
    label: "Sabah (07:00→09:00) • Hafta içi",
    daysMask: 62,
    startMin: 7 * 60,
    endMin: 9 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
  },
  {
    key: "EVENING",
    label: "Akşam (17:00→19:00) • Hafta içi",
    daysMask: 62,
    startMin: 17 * 60,
    endMin: 19 * 60,
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
  },
  {
    key: "NIGHT",
    label: "Gece (23:00→01:00) • Hafta içi",
    daysMask: 62,
    startMin: 23 * 60,
    endMin: 1 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
  },
  {
    key: "CUSTOM",
    label: "Özel (elle ayarla)",
    daysMask: 62,
    startMin: 8 * 60,
    endMin: 10 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
  },
];

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();
  const label =
    s === "REQUESTED"
      ? "⏳ REQUESTED"
      : s === "COUNTERED"
      ? "💬 COUNTERED"
      : s === "APPROVED"
      ? "✅ APPROVED"
      : s === "ACTIVE"
      ? "🟢 ACTIVE"
      : s === "DONE"
      ? "🏁 DONE"
      : s === "CANCELLED"
      ? "⛔ CANCELLED"
      : s === "REJECTED"
      ? "🚫 REJECTED"
      : s;

  return (
    <span className="pill" data-status={s} title={s}>
      {label}
    </span>
  );
}


function ExtendPill({ extendStatus, requestedEndDate }) {
  const s = String(extendStatus || "NONE").toUpperCase();
  if (s === "NONE" || !s) return null;

  const label =
    s === "PENDING"
      ? "⏳ EXTEND PENDING"
      : s === "COUNTERED"
      ? "💬 EXTEND COUNTERED"
      : s === "ACCEPTED"
      ? "✅ EXTEND ACCEPTED"
      : s === "REJECTED"
      ? "🚫 EXTEND REJECTED"
      : s;

  const date = String(requestedEndDate || "").slice(0, 10);
  return (
    <span className="pill" data-status={s} title={date ? `${label} → ${date}` : label} style={{ marginLeft: 8 }}>
      {date ? `${label} (${date})` : label}
    </span>
  );
}



export default function AgreementsPanel() {
  const { token } = useSession();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [shiftStats, setShiftStats] = useState({}); // ✅ M59
  const shiftStatsCacheRef = useRef(new Map());

  const [take, setTake] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [selectedAgreementId, setSelectedAgreementId] = useState(null);

  // rooms dropdown
  const [rooms, setRooms] = useState([]);
  const [roomsSupported, setRoomsSupported] = useState(true);
  const [_roomErr, setRoomErr] = useState("");
  const [selectedRoomScore, setSelectedRoomScore] = useState(null);

  // ✅ M27: advanced create (optional)
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [templateKey, setTemplateKey] = useState("MORNING");
  const [roomId, setRoomId] = useState("");

  const [startDate, setStartDate] = useState(todayYmd());

  const [durationKey, setDurationKey] = useState(DEFAULT_DURATION_KEY);
  const durationDays = useMemo(() => {
    const p = DURATION_PRESETS.find((x) => x.key === durationKey) || DURATION_PRESETS.find((x) => x.key === DEFAULT_DURATION_KEY) || DURATION_PRESETS[0];
    return Number(p.days || 30);
  }, [durationKey]);
  const [endDate, setEndDate] = useState(addDaysISO(todayYmd(), 0));

  const [daysSel, setDaysSel] = useState(() => selectedFromMask(62));
  const weekMask = useMemo(() => maskFromSelected(daysSel), [daysSel]);

  const [startHHMM, setStartHHMM] = useState("07:00");
  const [endHHMM, setEndHHMM] = useState("09:00");

  // routing meta
  const [direction, setDirection] = useState("INBOUND");
  const [pattern, setPattern] = useState("ONE_WAY");

  const [useRoomHub, setUseRoomHub] = useState(true);
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");

  const startMin = useMemo(() => parseHHMM(startHHMM), [startHHMM]);
  const endMin = useMemo(() => parseHHMM(endHHMM), [endHHMM]);

  // ✅ live refresh
  useAutoReload("agreements", () => load(), !!token, 650);

  const roomById = useMemo(() => {
    const m = new Map();
    (rooms || []).forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [rooms]);

  useEffect(() => {
    let cancelled = false;
    const rid = Number(roomId || 0);
    const room = rid ? roomById.get(rid) : null;

    if (useRoomHub && room?.hubLat != null && room?.hubLng != null) {
      if (String(hubLat).trim() === "" && String(hubLng).trim() === "") {
        setHubLat(String(room.hubLat));
        setHubLng(String(room.hubLng));
      }
    }

    if (!advancedOpen || !token || !rid) {
      setSelectedRoomScore(null);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const score = await fetchProviderScore(rid, token);
        if (!cancelled) setSelectedRoomScore(score || null);
      } catch {
        if (!cancelled) setSelectedRoomScore(null);
      }
    })();

    return () => { cancelled = true; };
  }, [advancedOpen, token, roomId, roomById, useRoomHub, hubLat, hubLng]);

  function applyTemplate(key) {
    const t = PLAN_TEMPLATES.find((x) => x.key === key) || PLAN_TEMPLATES[0];
    setDaysSel(selectedFromMask(t.daysMask));
    setStartHHMM(toHHMM(t.startMin));
    setEndHHMM(toHHMM(t.endMin));
    setDirection(t.direction);
    setPattern(t.pattern);
  }

  useEffect(() => {
    applyTemplate(templateKey);
  }, [templateKey]);

  useEffect(() => {
    if (!isYmd(startDate)) return;
    setEndDate(addDaysISO(startDate, Math.max(0, durationDays - 1)));
  }, [startDate, durationDays]);

  const loadRooms = useCallback(async (signal) => {
    if (!token) return;
    setRoomErr("");
    setRoomsSupported(true);

    try {
      const resp = await getCompanyRooms(token, { signal, take: 30, ttlMs: 60000 });
      if (signal?.aborted) return;
      setRooms(Array.isArray(resp?.items) ? resp.items : []);
    } catch (e) {
      setRooms([]);
      setRoomsSupported(false);
      setRoomErr(e?.message || "Rooms endpoint missing");
    }
  }, [token]);

  async function load(signal) {
    if (!token) return;
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("take", String(take));
      if (statusFilter) qs.set("status", statusFilter);
      const resp = await getCompanyAgreements(token, { signal, take, status: statusFilter, ttlMs: 30000 });
      if (signal?.aborted) return;
      const list = resp?.items ?? [];
      setItems(list);

      // ✅ M59: shift stats (today/horizon) for UI clarity
      try {
        const ids = list.slice(0, 12).map((x) => x?.id).filter(Boolean);
        const statsKey = ids.join(",");
        if (ids.length && shiftStatsCacheRef.current.has(statsKey)) {
          setShiftStats(shiftStatsCacheRef.current.get(statsKey) || {});
        } else if (ids.length) {
          const st = await api("/api/agreements/shift-stats", { token, method: "POST", body: { agreementIds: ids, horizonDays: 7 } });
          const nextStats = st?.byId ?? {};
          shiftStatsCacheRef.current.set(statsKey, nextStats);
          setShiftStats(nextStats);
        } else {
          setShiftStats({});
        }
      } catch {
        setShiftStats({});
      }

    } catch (e) {
      setErr(e?.message || "Agreements yüklenemedi.");
    }
  }

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) load(controller.signal);
    }, 280);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, take, statusFilter]);

  useEffect(() => {
    if (!token || !advancedOpen) return;
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
  }, [token, advancedOpen, loadRooms]);

  async function createAdvanced() {
    setErr("");
    if (!roomsSupported) return setErr("Rooms endpoint yok. Önce /api/rooms çalışmalı.");

    const rid = Number(roomId || 0);
    if (!rid) return setErr("Room seçmelisin.");
    if (!isYmd(startDate) || !isYmd(endDate)) return setErr("Tarih formatı YYYY-MM-DD olmalı.");
    if (!weekMask) return setErr("Gün seçmelisin.");
    if (startMin == null || endMin == null) return setErr("Saat formatı HH:MM olmalı.");

    const hasHubLat = String(hubLat || "").trim() !== "";
    const hasHubLng = String(hubLng || "").trim() !== "";
    if (hasHubLat !== hasHubLng) return setErr("Hub için lat/lng birlikte girilmeli.");

    let hubLatN = null;
    let hubLngN = null;
    if (hasHubLat) {
      const a = Number(hubLat);
      const b = Number(hubLng);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return setErr("Hub lat/lng sayı olmalı.");
      hubLatN = a;
      hubLngN = b;
    }

    setBusy(true);
    try {
      await api("/api/agreements", {
        token,
        method: "POST",
        body: {
          roomId: rid,
          startDate,
          endDate,
          weekMask,
          startMin,
          endMin,
          direction,
          pattern,
          hubLat: hubLatN,
          hubLng: hubLngN,
        },
      });

      await load();
      setAdvancedOpen(false);
    } catch (e) {
      setErr(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }


  async function acceptCounter(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/accept-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Accept counter failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectCounter(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/reject-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Reject counter failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancelAgreement(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/cancel`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function extendRequest(id, endDateYmd, offerAmount, offerNote) {
    setErr("");
    if (!isYmd(endDateYmd)) return setErr("Bitiş tarihi YYYY-MM-DD olmalı");

    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend-request`, {
        token,
        method: "PUT",
        body: {
          endDate: endDateYmd,
          extendOfferAmount: offerAmount ?? null,
          extendOfferNote: offerNote ?? null,
        },
      });
      await load();
    } catch (e) {
      setErr(e?.message || "Extend request failed");
    } finally {
      setBusy(false);
    }
  }

  async function acceptExtendCounter(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend-accept-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Extend counter accept failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectExtendCounter(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend-reject-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Extend counter reject failed");
    } finally {
      setBusy(false);
    }
  }

  function askExtendOfferDetails() {
    const raw = prompt("Uzatma için yeni teklif (₺) — boş bırak: değişmesin", "");
    let offerAmount = null;
    if (raw != null && String(raw).trim() !== "") {
      const n = Number(String(raw).replace(/[^\d]/g, ""));
      if (!Number.isFinite(n) || n <= 0) {
        setErr("Uzatma teklifi miktarı geçersiz");
        return null;
      }
      offerAmount = Math.trunc(n);
    }
    const offerNote = prompt("Uzatma notu (opsiyonel):", "") || null;
    return { offerAmount, offerNote: String(offerNote || "").trim() || null };
  }

  function extendByDays(a, days) {
    const base = String(a?.endDate || "").slice(0, 10);
    if (!isYmd(base)) return setErr("endDate yok/format hatalı");
    const next = addDaysISO(base, Number(days || 0));
    const d = askExtendOfferDetails(a); if (!d) return; extendRequest(a.id, String(next).trim(), d.offerAmount, d.offerNote);
  }

  function askExtend(a) {
    const next = prompt("Yeni endDate (YYYY-MM-DD):", a.endDate?.slice(0, 10) || "");
    if (!next) return;
    const d = askExtendOfferDetails(a); if (!d) return; extendRequest(a.id, String(next).trim(), d.offerAmount, d.offerNote);
  }

  const rows = useMemo(() => {
    return (items || []).map((a) => {
      const r = a?.roomId ? roomById.get(Number(a.roomId)) : null;
      return { a, room: r };
    });
  }, [items, roomById]);

  const filteredRows = useMemo(() => rows.filter(({ a, room }) => includesFilter([
    a?.id,
    a?.status,
    room?.name,
    a?.roomId,
    a?.companyOfferAmount,
    a?.roomOfferAmount,
    a?.companyOfferNote,
    a?.roomOfferNote,
    a?.direction,
    a?.pattern,
    a?.startDate,
    a?.endDate,
    weekMaskToText(a?.weekMask),
  ], filterQ)), [rows, filterQ]);

  const selectedAgreementRow = useMemo(
    () => filteredRows.find(({ a }) => Number(a?.id || 0) === Number(selectedAgreementId || 0)) || filteredRows[0] || null,
    [filteredRows, selectedAgreementId]
  );

  useEffect(() => {
    const row = selectedAgreementRow;
    if (!row?.a) {
      clearCopilotSelection('/company/agreements');
      return;
    }
    const { a, room } = row;
    const todayTotal = Number(shiftStats?.[a.id]?.todayTotal || 0);
    const todayDone = Number(shiftStats?.[a.id]?.todayDone || 0);
    const horizonOpen = Number(shiftStats?.[a.id]?.horizonOpen || 0);
    setCopilotSelection({
      scopeKey: '/company/agreements',
      entityType: 'agreement',
      entityId: Number(a?.id || 2103) || 2103,
      label: `Sözleşme #${a.id}`,
      summary: [String(a?.status || '').toUpperCase() || '-', room?.name || `Room #${a?.roomId || '-'}`, ymdTR(a?.startDate), ymdTR(a?.endDate)].filter(Boolean).join(' • '),
      fields: [
        { label: 'Room', value: room?.name || `#${a?.roomId || '-'}`, help: 'Sözleşmenin bağlı olduğu operasyon odasını gösterir.' },
        { label: 'Durum', value: String(a?.status || '-').toUpperCase(), help: 'Sözleşmenin karar veya aktiflik durumunu gösterir.' },
        { label: 'Başlangıç', value: ymdTR(a?.startDate), help: 'Sözleşmenin başlangıç tarihini gösterir.' },
        { label: 'Bitiş', value: ymdTR(a?.endDate), help: 'Sözleşmenin bitiş tarihini gösterir.' },
        { label: 'Tutar', value: a?.companyOfferAmount != null ? `${new Intl.NumberFormat("tr-TR").format(Number(a.companyOfferAmount || 0))} ₺` : '-', help: 'Company teklif veya sözleşme tutarını gösterir.' },
        { label: 'Bugün / Ufuk', value: `${todayDone}/${todayTotal} DONE • ${horizonOpen} APPROVED`, help: 'Bugünkü ilerleme ve ufuktaki vardiya sayısını özetler.' },
      ],
      badges: [
        { label: 'Yön', value: String(a?.direction || '-').toUpperCase(), help: 'Sözleşmenin akış yönünü gösterir.' },
        { label: 'Plan', value: weekMaskToText(a?.weekMask) || '-', help: 'Haftalık çalışma günlerini özetler.' },
      ],
      facts: { screenType: 'AGREEMENTS', stage: String(a?.status || '').toUpperCase(), nextBestAction: 'Önce durum, oda ve tarih aralığını birlikte oku. Sonra bugün/ufuk verisini kontrol et.' },
    });
  }, [selectedAgreementRow, shiftStats]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Sözleşmeler (Company)</h2>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="muted">
            Durum
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={busy}>
              <option value="">(tümü)</option>
              <option value="REQUESTED">REQUESTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
          <label className="muted">
            Take
            <select value={String(take)} onChange={(e) => setTake(Number(e.target.value))} disabled={busy}>
              {[20, 50, 100, 200].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="muted">
            Filtre
            <input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="Oda / durum / not / tarih" disabled={busy} />
          </label>
          <button type="button" disabled={busy} onClick={load}>
            Yenile
          </button>
        </div>

      <div className="card">
        <div style={{ fontWeight: 800 }}>Bu sayfa ne?</div>
        <div className="muted" style={{ marginTop: 6 }}>
          <b>Sözleşme</b> (Agreement) rota/durak üretmez. Sadece <b>düzenli çalışma dönemi</b> (tarih aralığı + hafta günleri + saat penceresi) için bir “kontrat/rezervasyon” katmanıdır.
          Durak üretme/önizleme ve market teklif süreci için <b>Vardiyalar</b> ekranını kullan.
        </div>
      </div>
      </div>

      {err ? <div className="muted" style={{ color: "crimson" }}>{String(err)}</div> : null}

      <div className="muted" style={{ marginTop: -4 }}>
        Not: Market/Shift teklifinde “anlaşma” sağlamak Agreement oluşturmaz. Agreement’lar ayrı “sözleşme” kaydıdır.
      </div>

      {/* ✅ M27: Preset ile hızlı oluştur (Advanced) */}
      <div className="card">
        <div style={{ fontWeight: 900 }}>Yeni Sözleşme (Hızlı)</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Preset paket seç → room seç → tarih aralığı → oluştur. (İstersen sabah+akşam tek tıkla 2 agreement.)
        </div>
        <div style={{ marginTop: 10 }}>
          <AgreementWizard
            rooms={null}
            roomsSupported={true}
            onReloadRooms={null}
            renderTrigger={(open) => (
              <button type="button" onClick={open} disabled={busy}>
                Aç
              </button>
            )}
            onCreated={load}
          />
        </div>
      </div>

      {/* Advanced create (optional) */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900 }}>Gelişmiş Oluştur (opsiyonel)</div>
            <div className="muted">Preset yetmezse elle ayarla.</div>
          </div>
          <button type="button" disabled={busy} onClick={() => setAdvancedOpen((p) => !p)}>
            {advancedOpen ? "Kapat" : "Aç"}
          </button>
        </div>

        {advancedOpen ? (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <label className="muted">
              Plan Şablonu
              <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} style={{ width: "100%" }} disabled={busy}>
                {PLAN_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="muted">
                Room
                {roomsSupported ? (
                  <select value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ width: "100%" }} disabled={busy}>
                    <option value="">Seç</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name ?? `Room #${r.id}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="muted" style={{ marginTop: 6, padding: "8px 10px", border: "1px dashed #ddd", borderRadius: 10 }}>
                    (rooms endpoint missing)
                  </div>
                )}
                <ProviderScoreCard score={selectedRoomScore} />
              </label>

              <div>
                <div className="muted">Hızlı süre</div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {QUICK_DURATION_PRESETS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      className={durationKey === d.key ? "" : "btn"}
                      disabled={busy}
                      onClick={() => setDurationKey(d.key)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Agreement kısa süreli de kullanılabilir. Seçince “Bitiş” otomatik hesaplanır; istersen elle değiştirebilirsin.
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="muted">
                Başlangıç
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={busy} />
              </label>
              <label className="muted">
                Bitiş
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={busy} />
              </label>
            </div>

            <div>
              <div className="muted" style={{ marginBottom: 6 }}>
                Günler
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {DAY_PRESETS.map((p) => (
                  <button key={p.key} type="button" disabled={busy} onClick={() => setDaysSel(selectedFromMask(p.mask))}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {WEEKDAYS.map((d) => (
                  <label key={d.k} className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={!!daysSel[d.k]} onChange={(e) => setDaysSel((s) => ({ ...s, [d.k]: e.target.checked }))} disabled={busy} />
                    {d.label}
                  </label>
                ))}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Günler: <b>{weekMaskToText(weekMask)}</b> • weekMask: <b>{weekMask}</b>
              </div>
            </div>

            <div>
              <div className="muted" style={{ marginBottom: 6 }}>
                Saat penceresi
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setStartHHMM(toHHMM(p.startMin));
                      setEndHHMM(toHHMM(p.endMin));
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 360 }}>
                <label className="muted">
                  Start (HH:MM)
                  <input value={startHHMM} onChange={(e) => setStartHHMM(e.target.value)} disabled={busy} />
                </label>
                <label className="muted">
                  End (HH:MM)
                  <input value={endHHMM} onChange={(e) => setEndHHMM(e.target.value)} disabled={busy} />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 420, marginTop: 8 }}>
                <label className="muted">
                  Direction
                  <select value={direction} onChange={(e) => setDirection(e.target.value)} style={{ width: "100%" }} disabled={busy}>
                    <option value="INBOUND">INBOUND (Toplama → Hub)</option>
                    <option value="OUTBOUND">OUTBOUND (Hub → Dağıtım)</option>
                  </select>
                </label>
                <label className="muted">
                  Pattern
                  <select value={pattern} onChange={(e) => setPattern(e.target.value)} style={{ width: "100%" }} disabled={busy}>
                    <option value="ONE_WAY">ONE_WAY</option>
                    <option value="LOOP">LOOP (Hub’a dön)</option>
                  </select>
                </label>
              </div>

              <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <input type="checkbox" checked={useRoomHub} onChange={(e) => setUseRoomHub(e.target.checked)} disabled={busy} />
                Room hub’ını otomatik kullan
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 420, marginTop: 8 }}>
                <label className="muted">
                  Hub Lat (opsiyonel)
                  <input type="number" step="0.000001" value={hubLat} onChange={(e) => setHubLat(e.target.value)} disabled={busy} />
                </label>
                <label className="muted">
                  Hub Lng (opsiyonel)
                  <input type="number" step="0.000001" value={hubLng} onChange={(e) => setHubLng(e.target.value)} disabled={busy} />
                </label>
              </div>
            </div>

            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={busy || !roomsSupported} onClick={createAdvanced}>
                {busy ? "..." : "Sözleşme Oluştur"}
              </button>
              <button type="button" disabled={busy} onClick={() => setAdvancedOpen(false)}>
                Vazgeç
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* List */}
      <div className="tableWrap">
        <ListSelectionBanner
          selectedLabel={selectedAgreementRow?.a ? `Sözleşme #${selectedAgreementRow.a.id}` : ""}
          selectedSummary={selectedAgreementRow?.a ? [String(selectedAgreementRow.a.status || '').toUpperCase(), selectedAgreementRow?.room?.name || `Room #${selectedAgreementRow.a.roomId || '-'}`, ymdTR(selectedAgreementRow.a.startDate), ymdTR(selectedAgreementRow.a.endDate)].filter(Boolean).join(" • ") : ""}
          visibleCount={filteredRows.length}
          totalCount={rows.length}
          filterValue={filterQ}
          onClearFilter={() => setFilterQ("")}
          helper="Copilot seçili sözleşmeyi kullanır."
        />
        <table className="tbl" style={{ minWidth: 980, marginTop: 10 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Room</th>
              <th>Date</th>
              <th>Days</th>
              <th>Time</th>
              <th>Dir/Pat</th>
              <th>Company Teklif</th>
              <th>Room Karşı</th>
              <th>Vardiyalar</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ a, room }) => (
              <tr key={a.id} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
                <td className="muted">
                  <div>#{a.id}</div>
                  <CommercialReadonlySummary item={a.commercialBackbone} compact />
                </td>
                <td><StatusPill status={a.status} /><ExtendPill extendStatus={a.extendStatus} requestedEndDate={a.extendRequestedEndDate} /></td>
                <td className="muted">{room ? `${room.name} (#${room.id})` : a.roomId ? `#${a.roomId}` : "-"}</td>
                <td className="muted">
                  {String(a.startDate || "").slice(0, 10)} → {String(a.endDate || "").slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}
                </td>
                <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                <td className="muted">
                  {toHHMM(a.startMin)} → {toHHMM(a.endMin)}
                </td>
                <td className="muted">{a.direction}/{a.pattern}</td>
                <td className="muted" title={a.companyOfferNote ? `📝 ${a.companyOfferNote}` : ""}>
                  {a.companyOfferAmount != null ? `₺${a.companyOfferAmount}` : "-"}
                  {a.companyOfferNote ? <span style={{ marginLeft: 6 }}>📝</span> : null}
                </td>
                <td className="muted" title={a.roomOfferNote ? `📝 ${a.roomOfferNote}` : ""}>
                  {a.roomOfferAmount != null ? `₺${a.roomOfferAmount}` : "-"}
                  {a.roomOfferNote ? <span style={{ marginLeft: 6 }}>📝</span> : null}
                </td>
                <td><ShiftSummary st={shiftStats?.[a.id]} /></td>
                <td>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    {String(a.status || "").toUpperCase() === "COUNTERED" ? (
                      <>
                        <button type="button" disabled={busy} onClick={() => acceptCounter(a.id)}>
                          Kabul Et
                        </button>
                        <button type="button" className="btn" disabled={busy} onClick={() => rejectCounter(a.id)}>
                          Reddet
                        </button>
                      </>
                    ) : null}
                    <button type="button" disabled={busy || a.status === "CANCELLED" || a.status === "DONE"} onClick={() => cancelAgreement(a.id)}>
                      Cancel
                    </button>

                    {String(a.extendStatus || "NONE").toUpperCase() === "COUNTERED" ? (
                      <>
                        <button type="button" disabled={busy} onClick={() => acceptExtendCounter(a.id)}>
                          Uzatma Counter Kabul
                        </button>
                        <button type="button" className="btn" disabled={busy} onClick={() => rejectExtendCounter(a.id)}>
                          Uzatma Counter Red
                        </button>
                      </>
                    ) : null}

                    <button type="button" disabled={busy || String(a.extendStatus || "NONE").toUpperCase() === "COUNTERED"} onClick={() => extendByDays(a, 7)}>
                      Uzat +7g
                    </button>
                    <button type="button" disabled={busy || String(a.extendStatus || "NONE").toUpperCase() === "COUNTERED"} onClick={() => extendByDays(a, 30)}>
                      Uzat +30g
                    </button>
                    <button type="button" disabled={busy || String(a.extendStatus || "NONE").toUpperCase() === "COUNTERED"} onClick={() => extendByDays(a, 90)}>
                      Uzat +90g
                    </button>
                    <button type="button" disabled={busy || String(a.extendStatus || "NONE").toUpperCase() === "COUNTERED"} onClick={() => askExtend(a)}>
                      Tarih...
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filteredRows.length ? (
              <tr>
                <td colSpan={11} className="muted">{rows.length ? 'Filtreye uyan sözleşme yok.' : 'Kayıt yok.'}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

