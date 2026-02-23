import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import {
  DAY_PRESETS,
  WEEKDAYS,
  selectedFromMask,
  maskFromSelected,
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

const PLAN_PRESETS = [
  {
    key: "MORNING",
    label: "Sabah (07:00 → 09:00) • Hafta içi",
    daysMask: 62, // Mon-Fri
    startMin: 7 * 60,
    endMin: 9 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
    durationDays: 30,
  },
  {
    key: "EVENING",
    label: "Akşam (17:00 → 19:00) • Hafta içi",
    daysMask: 62,
    startMin: 17 * 60,
    endMin: 19 * 60,
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
    durationDays: 30,
  },
  {
    key: "NIGHT",
    label: "Gece (23:00 → 01:00) • Hafta içi",
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

function Card({ title, desc, right, onClick, children }) {
  return (
    <div
      className="card"
      style={{ cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          {desc ? <div className="muted" style={{ marginTop: 4 }}>{desc}</div> : null}
        </div>
        {right ? <div style={{ fontWeight: 900, fontSize: 18 }}>{right}</div> : null}
      </div>
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}

export default function WorkflowPanel() {
  const { token } = useSession();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [rooms, setRooms] = useState([]);
  const [roomsSupported, setRoomsSupported] = useState(true);

  // stats
  const [agreements, setAgreements] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [geoNeedsReview, setGeoNeedsReview] = useState(0);

  // quick agreement
  const [roomId, setRoomId] = useState("");
  const [presetKey, setPresetKey] = useState("MORNING");
  const preset = useMemo(
    () => PLAN_PRESETS.find((p) => p.key === presetKey) || PLAN_PRESETS[0],
    [presetKey]
  );

  const [startDate, setStartDate] = useState(todayYmd());
  const [endDate, setEndDate] = useState(addDaysISO(todayYmd(), preset.durationDays));

  const [daysSel, setDaysSel] = useState(() => selectedFromMask(62));
  const weekMask = useMemo(() => maskFromSelected(daysSel), [daysSel]);

  const [startHHMM, setStartHHMM] = useState(toHHMM(preset.startMin));
  const [endHHMM, setEndHHMM] = useState(toHHMM(preset.endMin));
  const startMin = useMemo(() => parseHHMM(startHHMM), [startHHMM]);
  const endMin = useMemo(() => parseHHMM(endHHMM), [endHHMM]);

  const [direction, setDirection] = useState(preset.direction);
  const [pattern, setPattern] = useState(preset.pattern);

  const [useRoomHub, setUseRoomHub] = useState(true);
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");

  const today = useMemo(() => todayYmd(), []);

  const roomById = useMemo(() => {
    const m = new Map();
    (rooms || []).forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [rooms]);

  useEffect(() => {
    // preset apply (only when presetKey changes)
    const p = PLAN_PRESETS.find((x) => x.key === presetKey) || PLAN_PRESETS[0];
    setDaysSel(selectedFromMask(p.daysMask));
    setStartHHMM(toHHMM(p.startMin));
    setEndHHMM(toHHMM(p.endMin));
    setDirection(p.direction);
    setPattern(p.pattern);
    setEndDate(addDaysISO(startDate || todayYmd(), p.durationDays));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey]);

  // room selection => hub autofill (optional)
  useEffect(() => {
    if (!useRoomHub) return;
    const rid = Number(roomId || 0);
    const r = rid ? roomById.get(rid) : null;
    if (!r) return;

    const hasHub = r?.hubLat != null && r?.hubLng != null;
    if (!hasHub) return;

    // only auto-fill if empty
    if (String(hubLat).trim() === "" && String(hubLng).trim() === "") {
      setHubLat(String(r.hubLat));
      setHubLng(String(r.hubLng));
    }
  }, [roomId, useRoomHub, roomById, hubLat, hubLng]);

  async function loadRooms() {
    if (!token) return;
    setRoomsSupported(true);
    try {
      const resp = await api("/api/rooms?take=200", { token });
      const list = resp?.items ?? [];
      setRooms(Array.isArray(list) ? list : []);
    } catch {
      setRooms([]);
      setRoomsSupported(false);
    }
  }

  async function loadStats() {
    if (!token) return;
    setErr("");
    try {
      const a = await api("/api/agreements?take=200", { token });
      setAgreements(Array.isArray(a?.items) ? a.items : []);
    } catch {
      setAgreements([]);
    }

    try {
      const s = await api("/api/shifts?take=200", { token });
      // some endpoints return {items}, some return array
      const items = Array.isArray(s?.items) ? s.items : Array.isArray(s) ? s : [];
      setShifts(items);
    } catch {
      setShifts([]);
    }

    try {
      const gr = await api("/api/company/personels?geoStatus=NEEDS_REVIEW", { token });
      const items = Array.isArray(gr?.items) ? gr.items : [];
      setGeoNeedsReview(items.length);
    } catch {
      setGeoNeedsReview(0);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadRooms();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // auto-pick first room
  useEffect(() => {
    if (!rooms.length) return;
    const current = Number(roomId || 0);
    const ok = rooms.some((r) => Number(r.id) === current);
    if (!ok) setRoomId(String(rooms[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  const stats = useMemo(() => {
    const by = { REQUESTED: 0, APPROVED: 0, ACTIVE: 0, DONE: 0, CANCELLED: 0, REJECTED: 0 };
    for (const a of agreements || []) {
      const k = String(a.status || "").toUpperCase();
      if (by[k] != null) by[k]++;
    }

    const todayShiftCount = (shifts || []).filter((s) => {
      const st = String(s?.startAt || "").slice(0, 10);
      return st === today;
    }).length;

    const marketShiftCount = (shifts || []).filter((s) => !s?.roomId).length;

    return {
      agreementsTotal: (agreements || []).length,
      agreementsActive: by.ACTIVE + by.APPROVED + by.REQUESTED,
      todayShiftCount,
      marketShiftCount,
    };
  }, [agreements, shifts, today]);

  async function createQuickAgreement() {
    setErr("");
    if (!roomsSupported) return setErr("Rooms endpoint yok. Önce /api/rooms çalışmalı.");

    const rid = Number(roomId || 0);
    if (!rid) return setErr("Room seçmelisin.");
    if (!isYmd(startDate) || !isYmd(endDate)) return setErr("Tarih formatı YYYY-MM-DD olmalı.");
    if (!weekMask) return setErr("Gün seçmelisin.");

    const sMin = startMin;
    const eMin = endMin;
    if (sMin == null || eMin == null) return setErr("Saat formatı HH:MM olmalı.");

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

      // refresh stats and go agreements
      await loadStats();
      navigate("/company/agreements");
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Company — Planlama Merkezi</div>
        <div className="muted">
          Amaç: minimum tık. Önce <b>Agreement</b> ile planla → gerekirse <b>Market</b> ile teklif topla → sonra <b>Shifts</b> ile operasyon.
        </div>
      </div>

      {err ? (
        <div className="card err" style={{ marginTop: 10 }}>
          {err}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <Card
          title="Agreements"
          desc="Planlama / rezervasyon (primary)"
          right={stats.agreementsActive}
          onClick={() => navigate("/company/agreements")}
        />

        <Card
          title="Market"
          desc="Room seçmeden shift aç → çoklu room teklif"
          right={stats.marketShiftCount}
          onClick={() => navigate("/company/shifts")}
        />

        <Card
          title="Geo Review"
          desc="Adres/konum sorunlarını düzelt"
          right={geoNeedsReview}
          onClick={() => navigate("/company/georeview")}
        />

        <Card
          title="Bugünkü Shifts"
          desc="Operasyon (start/reached/complete)"
          right={stats.todayShiftCount}
          onClick={() => navigate("/company/shifts")}
        />
      </div>

      {/* Quick Agreement */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Hızlı Agreement Oluştur</div>
        <div className="muted" style={{ marginBottom: 10 }}>
          1) Room seç  2) Preset seç  3) Kaydet
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="muted">
            Room
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={!roomsSupported || busy}>
              <option value="">Seç</option>
              {rooms.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name ?? `Room #${r.id}`}
                </option>
              ))}
            </select>
            {!roomsSupported ? (
              <div className="muted" style={{ marginTop: 6, color: "#b85" }}>
                (rooms endpoint missing)
              </div>
            ) : null}
          </label>

          <label className="muted">
            Preset
            <select value={presetKey} onChange={(e) => setPresetKey(e.target.value)} disabled={busy}>
              {PLAN_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <label className="muted">
            Tarih aralığı
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={busy} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={busy} />
            </div>
          </label>

          <label className="muted">
            Saat
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input value={startHHMM} onChange={(e) => setStartHHMM(e.target.value)} placeholder="HH:MM" disabled={busy} />
              <input value={endHHMM} onChange={(e) => setEndHHMM(e.target.value)} placeholder="HH:MM" disabled={busy} />
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
                  disabled={busy}
                />
                {d.label}
              </label>
            ))}
          </div>

          <div className="muted" style={{ marginTop: 6 }}>
            Günler: <b>{weekMaskToText(weekMask)}</b> • weekMask: <b>{weekMask}</b>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <label className="muted">
            Direction
            <select value={direction} onChange={(e) => setDirection(e.target.value)} disabled={busy}>
              <option value="INBOUND">INBOUND (Toplama → Hub)</option>
              <option value="OUTBOUND">OUTBOUND (Hub → Dağıtım)</option>
            </select>
          </label>

          <label className="muted">
            Pattern
            <select value={pattern} onChange={(e) => setPattern(e.target.value)} disabled={busy}>
              <option value="ONE_WAY">ONE_WAY</option>
              <option value="LOOP">LOOP (Hub’a dön)</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={useRoomHub} onChange={(e) => setUseRoomHub(e.target.checked)} disabled={busy} />
            Room hub’ını otomatik kullan
          </label>

          <div />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="muted">
            Hub Lat (opsiyonel)
            <input type="number" step="0.000001" value={hubLat} onChange={(e) => setHubLat(e.target.value)} disabled={busy} />
          </label>
          <label className="muted">
            Hub Lng (opsiyonel)
            <input type="number" step="0.000001" value={hubLng} onChange={(e) => setHubLng(e.target.value)} disabled={busy} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" disabled={busy || !roomsSupported} onClick={createQuickAgreement}>
            {busy ? "Kaydediliyor..." : "Agreement Oluştur"}
          </button>
          <button type="button" disabled={busy} onClick={loadStats}>
            Yenile
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800 }}>Kısa akış</div>
        <ol className="muted" style={{ marginTop: 8 }}>
          <li>Geo Review: konumlar OK olsun</li>
          <li>Agreement: haftalık planı aç</li>
          <li>Market: birden fazla room’dan teklif topla (gerekirse)</li>
          <li>Shifts: o gün operasyonu takip et</li>
        </ol>
      </div>
    </div>
  );
}
