import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid #ddd",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
      title={s}
    >
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

  // create form
  const [templateKey, setTemplateKey] = useState("MORNING");
  const [roomId, setRoomId] = useState("");

  const [startDate, setStartDate] = useState(todayYmd());
  const [endDate, setEndDate] = useState(addDaysISO(todayYmd(), 30));

  const [daysSel, setDaysSel] = useState(() => selectedFromMask(62));
  const weekMask = useMemo(() => maskFromSelected(daysSel), [daysSel]);

  const [startHHMM, setStartHHMM] = useState("07:00");
  const [endHHMM, setEndHHMM] = useState("09:00");

  // ✅ M19: routing meta
  const [direction, setDirection] = useState("INBOUND");
  const [pattern, setPattern] = useState("ONE_WAY");

  const [useRoomHub, setUseRoomHub] = useState(true);
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");

  const startMin = useMemo(() => parseHHMM(startHHMM), [startHHMM]);
  const endMin = useMemo(() => parseHHMM(endHHMM), [endHHMM]);
  const midnightCross = useMemo(
    () => startMin != null && endMin != null && endMin < startMin,
    [startMin, endMin]
  );

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

    if (isYmd(startDate)) {
      setEndDate(addDaysISO(startDate, t.durationDays));
    }
  }

  // template apply when selection changes
  useEffect(() => {
    applyTemplate(templateKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateKey]);

  // room selection => hub autofill (optional)
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
      const list = resp?.items ?? [];
      setRooms(Array.isArray(list) ? list : []);
    } catch (e) {
      // ✅ /api/rooms yoksa: input göstermiyoruz, label gösteriyoruz
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

  // ✅ WS invalidate → agreements topic gelince reload
  useAutoReload("agreements", load, !!token);

  useEffect(() => {
    if (!token) return;
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ✅ rooms geldiyse roomId auto seç
  useEffect(() => {
    if (!rooms.length) return;

    const current = Number(roomId || 0);
    const hasCurrent = rooms.some((r) => Number(r.id) === current);

    if (!hasCurrent) {
      if (rooms.length === 1) setRoomId(String(rooms[0].id));
      else if (!roomId) setRoomId(String(rooms[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, take, statusFilter]);

  async function createAgreement() {
    setErr("");

    if (!roomsSupported) return setErr("Rooms endpoint missing — agreement oluşturmak için /api/rooms gerekli.");

    const rid = Number(roomId || 0);
    if (!rid) return setErr("Room seçmelisin.");
    if (!isYmd(startDate) || !isYmd(endDate)) return setErr("Tarih formatı YYYY-MM-DD olmalı.");
    if (!weekMask) return setErr("Gün seçmelisin.");

    const sMin = startMin;
    const eMin = endMin;
    if (sMin == null || eMin == null) return setErr("Saat formatı HH:MM olmalı.");

    // hub optional, but must be pair
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
          startMin: sMin,
          endMin: eMin,
          direction,
          pattern,
          hubLat: hubLatN,
          hubLng: hubLngN,
        },
      });

      // refresh
      await load();
    } catch (e) {
      setErr(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancelAgreement(id) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/agreements/${id}/cancel`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function extendAgreement(id, nextEndDate) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/agreements/${id}/extend`, { token, method: "PUT", body: { endDate: nextEndDate } });
      await load();
    } catch (e) {
      setErr(e?.message || "Extend failed");
    } finally {
      setBusy(false);
    }
  }

  function extendPrompt(a) {
    const cur = String(a?.endDate || "").slice(0, 10);
    const def = isYmd(cur) ? cur : todayYmd();
    const next = window.prompt("Yeni endDate (YYYY-MM-DD)", def);
    if (!next) return;
    const ymd = String(next).trim();
    extendAgreement(a.id, ymd);
  }

  const rows = useMemo(() => {
    return (items || []).map((a) => {
      const r = a?.roomId ? roomById.get(Number(a.roomId)) : null;
      return { a, room: r };
    });
  }, [items, roomById]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Agreements (Company)</h2>

      {err ? (
        <div className="muted" style={{ color: "crimson" }}>
          {String(err)}
        </div>
      ) : null}

      {/* Create */}
      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Yeni Agreement</div>
        <div className="muted" style={{ marginBottom: 10 }}>
          Hızlı akış: <b>Room</b> seç → <b>Plan Şablonu</b> seç → Kaydet.
        </div>

        {/* template row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <label className="muted">
            Plan Şablonu
            <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} style={{ width: "100%" }}>
              {PLAN_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="muted">
            Durum filtresi (liste)
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: "100%" }}>
              <option value="">(tümü)</option>
              <option value="REQUESTED">REQUESTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="muted">
            Room
            {roomsSupported ? (
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ width: "100%" }}>
                <option value="">Seç</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name ?? `Room #${r.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className="muted"
                style={{ marginTop: 6, padding: "8px 10px", border: "1px dashed #ddd", borderRadius: 10 }}
                title={roomErr || "Rooms endpoint missing"}
              >
                (rooms endpoint missing)
              </div>
            )}
            {!roomsSupported && roomErr ? (
              <div className="muted" style={{ marginTop: 6, color: "#b85" }}>
                {roomErr}
              </div>
            ) : null}
          </label>

          <label className="muted">
            Tarih aralığı
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </label>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 6 }}>
            Günler
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {DAY_PRESETS.map((p) => (
              <button key={p.key} type="button" disabled={busy} onClick={() => setDaysSel(selectedFromMask(p.mask))}>
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {WEEKDAYS.map((d) => (
              <label key={d.k} className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!daysSel[d.k]}
                  onChange={(e) => setDaysSel((s) => ({ ...s, [d.k]: e.target.checked }))}
                />
                {d.label}
              </label>
            ))}
          </div>

          <div className="muted" style={{ marginTop: 6 }}>
            Günler: <b>{weekMaskToText(weekMask)}</b> • weekMask: <b>{weekMask}</b>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 6 }}>
            Saat penceresi
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 320 }}>
            <label className="muted">
              Start (HH:MM)
              <input value={startHHMM} onChange={(e) => setStartHHMM(e.target.value)} />
            </label>
            <label className="muted">
              End (HH:MM)
              <input value={endHHMM} onChange={(e) => setEndHHMM(e.target.value)} />
            </label>
          </div>

          {/* ✅ M19: routing meta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 420, marginTop: 6 }}>
            <label className="muted">
              Direction
              <select value={direction} onChange={(e) => setDirection(e.target.value)} style={{ width: "100%" }}>
                <option value="INBOUND">INBOUND (Toplama → Hub)</option>
                <option value="OUTBOUND">OUTBOUND (Hub → Dağıtım)</option>
              </select>
            </label>

            <label className="muted">
              Pattern
              <select value={pattern} onChange={(e) => setPattern(e.target.value)} style={{ width: "100%" }}>
                <option value="ONE_WAY">ONE_WAY</option>
                <option value="LOOP">LOOP (Hub’a dön)</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 420, marginTop: 6 }}>
            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={useRoomHub} onChange={(e) => setUseRoomHub(e.target.checked)} />
              Room hub’ını otomatik kullan
            </label>

            <button
              type="button"
              disabled={busy || !roomId}
              onClick={() => {
                const r = roomById.get(Number(roomId));
                if (r?.hubLat != null && r?.hubLng != null) {
                  setHubLat(String(r.hubLat));
                  setHubLng(String(r.hubLng));
                }
              }}
              title="Room hub değerlerini hubLat/hubLng alanına kopyalar"
            >
              Hub’ı Room’dan al
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 420 }}>
            <label className="muted">
              Hub Lat (opsiyonel)
              <input type="number" step="0.000001" value={hubLat} onChange={(e) => setHubLat(e.target.value)} />
            </label>
            <label className="muted">
              Hub Lng (opsiyonel)
              <input type="number" step="0.000001" value={hubLng} onChange={(e) => setHubLng(e.target.value)} />
            </label>
          </div>

          {midnightCross ? (
            <div className="muted" style={{ marginTop: 6, color: "#8a5" }}>
              🌙 Midnight aşımı (end &lt; start)
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                disabled={busy || !startDate}
                onClick={() => setEndDate(addDaysISO(startDate, p.days))}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" disabled={busy || !roomsSupported} onClick={createAgreement}>
            {busy ? "..." : "Agreement Oluştur"}
          </button>

          <button type="button" disabled={busy} onClick={load}>
            Yenile
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setTemplateKey("MORNING");
              setRoomId("");
              setStartDate(todayYmd());
              setEndDate(addDaysISO(todayYmd(), 30));
              setDaysSel(selectedFromMask(62));
              setStartHHMM("07:00");
              setEndHHMM("09:00");
              setDirection("INBOUND");
              setPattern("ONE_WAY");
              setHubLat("");
              setHubLng("");
            }}
          >
            Formu Sıfırla
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>Liste</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Take
              <select value={take} onChange={(e) => setTake(Number(e.target.value))}>
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Room</th>
                <th>Date</th>
                <th>Days</th>
                <th>Time</th>
                <th>Dir/Pat</th>
                <th>Vehicle/Driver</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, room }) => (
                <tr key={a.id}>
                  <td className="muted">#{a.id}</td>
                  <td>
                    <StatusPill status={a.status} />
                  </td>
                  <td className="muted">{room ? `${room.name} (#${room.id})` : a.roomId ? `#${a.roomId}` : "-"}</td>
                  <td className="muted">
                    {String(a.startDate || "").slice(0, 10)} → {String(a.endDate || "").slice(0, 10)}
                  </td>
                  <td className="muted" title={`weekMask=${a.weekMask}`}>
                    {weekMaskToText(Number(a.weekMask || 0))}
                  </td>
                  <td className="muted" title={`startMin=${a.startMin} endMin=${a.endMin}`}>
                    {toHHMM(Number(a.startMin || 0))} → {toHHMM(Number(a.endMin || 0))}
                  </td>
                  <td className="muted">
                    {String(a.direction || "").toUpperCase()} / {String(a.pattern || "").toUpperCase()}
                  </td>
                  <td className="muted">
                    {a.vehicle ? a.vehicle.plate : a.vehicleId ? `#${a.vehicleId}` : "-"} / {a.driver ? a.driver.fullName : a.driverId ? `#${a.driverId}` : "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={busy || ["CANCELLED", "DONE", "REJECTED"].includes(String(a.status || "").toUpperCase())}
                        onClick={() => cancelAgreement(a.id)}
                      >
                        Cancel
                      </button>
                      <button type="button" disabled={busy} onClick={() => extendPrompt(a)}>
                        Extend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!rows.length ? (
                <tr>
                  <td className="muted" colSpan={9}>
                    (no items)
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
