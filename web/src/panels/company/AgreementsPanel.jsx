import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import AgreementWizard from "./AgreementWizard";
import {
  WEEKDAYS,
  DAY_PRESETS,
  TIME_PRESETS,
  DURATION_PRESETS,
  maskFromSelected,
  selectedFromMask,
  weekMaskToText,
  toHHMM,
  parseHHMM,
  addDaysISO,
} from "../../utils/agreementUi";

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

const PLAN_TEMPLATES = [
  {
    key: "MORNING",
    label: "Sabah (07:00→09:00) • Hafta içi • 30 gün",
    daysMask: 62,
    startMin: 7 * 60,
    endMin: 9 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
    durationDays: 30,
  },
  {
    key: "EVENING",
    label: "Akşam (17:00→19:00) • Hafta içi • 30 gün",
    daysMask: 62,
    startMin: 17 * 60,
    endMin: 19 * 60,
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
    durationDays: 30,
  },
  {
    key: "NIGHT",
    label: "Gece (23:00→01:00) • Hafta içi • 30 gün",
    daysMask: 62,
    startMin: 23 * 60,
    endMin: 1 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
    durationDays: 30,
  },
  {
    key: "CUSTOM",
    label: "Özel (elle ayarla)",
    daysMask: 62,
    startMin: 8 * 60,
    endMin: 10 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
    durationDays: 30,
  },
];

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();
  const label =
    s === "REQUESTED"
      ? "⏳ REQUESTED"
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

export default function AgreementsPanel() {
  const { token } = useSession();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [take, setTake] = useState(50);
  const [statusFilter, setStatusFilter] = useState("");

  // rooms dropdown
  const [rooms, setRooms] = useState([]);
  const [roomsSupported, setRoomsSupported] = useState(true);
  const [roomErr, setRoomErr] = useState("");

  // ✅ M27: advanced create (optional)
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [templateKey, setTemplateKey] = useState("MORNING");
  const [roomId, setRoomId] = useState("");

  const [startDate, setStartDate] = useState(todayYmd());
  const [durationKey, setDurationKey] = useState("1m");
  const durationDays = useMemo(() => {
    const p = DURATION_PRESETS.find((x) => x.key === durationKey) || DURATION_PRESETS[1];
    return Number(p.days || 30);
  }, [durationKey]);
  const [endDate, setEndDate] = useState(addDaysISO(todayYmd(), 30));

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
  useAutoReload("agreements");

  const roomById = useMemo(() => {
    const m = new Map();
    (rooms || []).forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [rooms]);

  function applyTemplate(key) {
    const t = PLAN_TEMPLATES.find((x) => x.key === key) || PLAN_TEMPLATES[0];
    setDaysSel(selectedFromMask(t.daysMask));
    setStartHHMM(toHHMM(t.startMin));
    setEndHHMM(toHHMM(t.endMin));
    setDirection(t.direction);
    setPattern(t.pattern);

    if (isYmd(startDate)) setEndDate(addDaysISO(startDate, t.durationDays));
  }

  useEffect(() => {
    applyTemplate(templateKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateKey]);

  useEffect(() => {
    if (!isYmd(startDate)) return;
    setEndDate(addDaysISO(startDate, durationDays));
  }, [startDate, durationDays]);

  // room selection => hub autofill
  useEffect(() => {
    if (!useRoomHub) return;
    const rid = Number(roomId || 0);
    const r = rid ? roomById.get(rid) : null;
    if (!r) return;
    const hasHub = r?.hubLat != null && r?.hubLng != null;
    if (!hasHub) return;
    if (String(hubLat).trim() === "" && String(hubLng).trim() === "") {
      setHubLat(String(r.hubLat));
      setHubLng(String(r.hubLng));
    }
  }, [roomId, useRoomHub, roomById, hubLat, hubLng]);

  async function loadRooms() {
    if (!token) return;
    setRoomErr("");
    setRoomsSupported(true);

    try {
      const resp = await api("/api/rooms?take=200", { token });
      setRooms(Array.isArray(resp?.items) ? resp.items : []);
    } catch (e) {
      setRooms([]);
      setRoomsSupported(false);
      setRoomErr(e?.message || "Rooms endpoint missing");
    }
  }

  async function load() {
    if (!token) return;
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("take", String(take));
      if (statusFilter) qs.set("status", statusFilter);
      const resp = await api(`/api/agreements?${qs.toString()}`, { token });
      setItems(resp?.items ?? []);
    } catch (e) {
      setErr(e?.message || "Agreements yüklenemedi.");
    }
  }

  useEffect(() => {
    if (!token) return;
    loadRooms();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take, statusFilter]);

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

  async function extendAgreement(id, endDateYmd) {
    setErr("");
    if (!isYmd(endDateYmd)) return setErr("Bitiş tarihi YYYY-MM-DD olmalı");

    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend`, { token, method: "PUT", body: { endDate: endDateYmd } });
      await load();
    } catch (e) {
      setErr(e?.message || "Extend failed");
    } finally {
      setBusy(false);
    }
  }

  function extendByDays(a, days) {
    const base = String(a?.endDate || "").slice(0, 10);
    if (!isYmd(base)) return setErr("endDate yok/format hatalı");
    const next = addDaysISO(base, Number(days || 0));
    extendAgreement(a.id, String(next).trim());
  }

  function askExtend(a) {
    const next = prompt("Yeni endDate (YYYY-MM-DD):", a.endDate?.slice(0, 10) || "");
    if (!next) return;
    extendAgreement(a.id, String(next).trim());
  }

  const rows = useMemo(() => {
    return (items || []).map((a) => {
      const r = a?.roomId ? roomById.get(Number(a.roomId)) : null;
      return { a, room: r };
    });
  }, [items, roomById]);

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
        <div style={{ fontWeight: 900 }}>Yeni Agreement (Advanced)</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Preset paket seç → room seç → tarih aralığı → oluştur. (İstersen sabah+akşam tek tıkla 2 agreement.)
        </div>
        <div style={{ marginTop: 10 }}>
          <AgreementWizard
            rooms={rooms}
            roomsSupported={roomsSupported}
            onReloadRooms={loadRooms}
            renderTrigger={(open) => (
              <button type="button" onClick={open} disabled={!roomsSupported || busy}>
                Aç
              </button>
            )}
            onCreated={load}
          />
          {!roomsSupported ? (
            <div className="muted" style={{ marginTop: 8, color: "#b85" }}>
              (rooms endpoint missing) {roomErr ? `• ${roomErr}` : ""}
            </div>
          ) : null}
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
              </label>

              <label className="muted">
                Süre
                <select value={durationKey} onChange={(e) => setDurationKey(e.target.value)} disabled={busy}>
                  {DURATION_PRESETS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
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
                {busy ? "..." : "Agreement Oluştur"}
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
        <table className="tbl" style={{ minWidth: 980 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Room</th>
              <th>Date</th>
              <th>Days</th>
              <th>Time</th>
              <th>Dir/Pat</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, room }) => (
              <tr key={a.id}>
                <td className="muted">#{a.id}</td>
                <td><StatusPill status={a.status} /></td>
                <td className="muted">{room ? `${room.name} (#${room.id})` : a.roomId ? `#${a.roomId}` : "-"}</td>
                <td className="muted">
                  {String(a.startDate || "").slice(0, 10)} → {String(a.endDate || "").slice(0, 10)}
                </td>
                <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                <td className="muted">
                  {toHHMM(a.startMin)} → {toHHMM(a.endMin)}
                </td>
                <td className="muted">{a.direction}/{a.pattern}</td>
                <td>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <button type="button" disabled={busy || a.status === "CANCELLED" || a.status === "DONE"} onClick={() => cancelAgreement(a.id)}>
                      Cancel
                    </button>
                    <button type="button" disabled={busy} onClick={() => extendByDays(a, 7)}>
                      Uzat +7g
                    </button>
                    <button type="button" disabled={busy} onClick={() => extendByDays(a, 30)}>
                      Uzat +30g
                    </button>
                    <button type="button" disabled={busy} onClick={() => extendByDays(a, 90)}>
                      Uzat +90g
                    </button>
                    <button type="button" disabled={busy} onClick={() => askExtend(a)}>
                      Tarih...
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="muted">Kayıt yok.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
