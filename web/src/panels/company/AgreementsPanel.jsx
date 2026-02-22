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

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();

  // Renk vermeden da anlaşılır olsun diye kısa ikon + border ile gidiyoruz
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
  const [roomErr, setRoomErr] = useState("");
  const [roomsSupported, setRoomsSupported] = useState(true);

  // create form
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState(todayYmd());
  const [endDate, setEndDate] = useState(addDaysISO(todayYmd(), 30));

  const [daysSel, setDaysSel] = useState(() => selectedFromMask(127));
  const weekMask = useMemo(() => maskFromSelected(daysSel), [daysSel]);

  const [startHHMM, setStartHHMM] = useState("08:00");
  const [endHHMM, setEndHHMM] = useState("10:00");

  // ✅ M19: routing meta
  const [direction, setDirection] = useState("INBOUND");
  const [pattern, setPattern] = useState("ONE_WAY");
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");

  const startMin = useMemo(() => parseHHMM(startHHMM), [startHHMM]);
  const endMin = useMemo(() => parseHHMM(endHHMM), [endHHMM]);
  const midnightCross = useMemo(
    () => startMin != null && endMin != null && endMin < startMin,
    [startMin, endMin]
  );

  async function loadRooms() {
    if (!token) return;
    setRoomErr("");
    setRoomsSupported(true);

    try {
      const resp = await api("/api/rooms", { token });
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, take, statusFilter]);

  async function createAgreement() {
    setErr("");
    const rid = Number(roomId);

    if (!roomsSupported) return setErr("Rooms endpoint missing — agreement oluşturmak için /api/rooms gerekli.");
    if (!rid) return setErr("Room seçmelisin.");
    if (!startDate || !endDate) return setErr("startDate/endDate required");
    if (!isYmd(startDate) || !isYmd(endDate)) return setErr("Tarih formatı YYYY-MM-DD olmalı.");
    if (!weekMask) return setErr("weekMask required (1..127)");
    if (startMin == null || endMin == null) return setErr("Saat formatı HH:MM olmalı.");

    // ✅ M19: hub validation (optional)
    const hasHubLat = String(hubLat || "").trim() !== "";
    const hasHubLng = String(hubLng || "").trim() !== "";
    if (hasHubLat !== hasHubLng) return setErr("Hub için lat/lng birlikte girilmeli.");
    if (hasHubLat) {
      const a = Number(hubLat);
      const b = Number(hubLng);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return setErr("Hub lat/lng sayı olmalı.");
      if (a < -90 || a > 90 || b < -180 || b > 180) return setErr("Hub lat/lng range invalid.");
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
          hubLat: String(hubLat || "").trim() === "" ? null : Number(hubLat),
          hubLng: String(hubLng || "").trim() === "" ? null : Number(hubLng),
        },
      });
      await load();
    } catch (e) {
      setErr(e?.message || "Agreement create failed");
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

  async function extendAgreement(id, newEndDate) {
    setErr("");
    if (!newEndDate) return setErr("endDate required");
    if (!isYmd(newEndDate)) return setErr("endDate formatı YYYY-MM-DD olmalı.");

    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend`, {
        token,
        method: "PUT",
        body: { endDate: newEndDate },
      });
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
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Yeni Agreement</div>

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
                style={{
                  marginTop: 6,
                  padding: "8px 10px",
                  border: "1px dashed #ddd",
                  borderRadius: 10,
                }}
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
          <div className="muted" style={{ marginBottom: 6 }}>Günler</div>

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
          <div className="muted" style={{ marginBottom: 6 }}>Saat penceresi</div>

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

        <div style={{ marginTop: 12 }}>
          <button type="button" disabled={busy || !roomsSupported} onClick={createAgreement}>
            {busy ? "Kaydediliyor..." : "Agreement Oluştur"}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>Agreements</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">(status: all)</option>
              <option value="REQUESTED">REQUESTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <select value={take} onChange={(e) => setTake(Number(e.target.value))}>
              <option value={20}>take 20</option>
              <option value={50}>take 50</option>
              <option value={100}>take 100</option>
            </select>
            <button type="button" disabled={busy} onClick={load}>
              Yenile
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr className="muted">
                <th align="left">ID</th>
                <th align="left">Status</th>
                <th align="left">Date</th>
                <th align="left">Time</th>
                <th align="left">Günler</th>
                <th align="left">Vehicle/Driver</th>
                <th align="left">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{a.id}</td>
                  <td className="muted">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="muted">
                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)}
                  </td>
                  <td className="muted">
                    {toHHMM(a.startMin)} → {toHHMM(a.endMin)}{" "}
                    {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}
                  </td>
                  <td className="muted" title={`weekMask=${a.weekMask}`}>
                    {weekMaskToText(a.weekMask)}
                  </td>
                  <td className="muted">
                    v:{a.vehicleId ?? "-"} / d:{a.driverId ?? "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={busy || a.status === "CANCELLED" || a.status === "DONE"}
                        onClick={() => cancelAgreement(a.id)}
                      >
                        İptal
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => extendPrompt(a)}
                        title="Tarih seçerek uzat"
                      >
                        Tarih ile Uzat
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const next = addDaysISO(String(a.endDate).slice(0, 10), 7);
                          extendAgreement(a.id, next);
                        }}
                        title="+7 gün uzat"
                      >
                        +7g
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ paddingTop: 10 }}>
                    Kayıt yok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Endpoint: <code>/api/agreements</code>
        </div>
      </div>
    </div>
  );
}