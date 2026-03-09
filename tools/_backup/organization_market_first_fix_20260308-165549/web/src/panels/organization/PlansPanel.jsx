import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

const emptyPlan = () => ({
  id: null,
  title: "",
  planDate: new Date().toISOString().slice(0, 10),
  startMin: 8 * 60,
  endMin: 18 * 60,
  roomId: "",
  notes: "",
  stops: [],
  status: "DRAFT",
  publishedShiftId: null,
  linkedAgreementId: null,
});

const fieldLabelStyle = {
  display: "grid",
  gap: 4,
  minWidth: 0,
  fontSize: 12,
  color: "rgba(255,255,255,.72)",
};

function minToHm(min) {
  const n = Number(min || 0);
  const h = String(Math.floor(n / 60)).padStart(2, "0");
  const m = String(n % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function hmToMin(v, fallback = 0) {
  const s = String(v || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return fallback;
  return h * 60 + mm;
}

function parseBulk(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  const out = [];
  for (const line of lines) {
    const parts = line.split(/[;,\t|]/).map((x) => x.trim());
    if (parts.length < 4) continue;

    const [name, address, lat, lng, count, ws, we, note] = parts;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!name || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) continue;

    out.push({
      name,
      address: address || "",
      lat: latNum,
      lng: lngNum,
      passengerCount: Math.max(1, Number(count) || 1),
      windowStartMin: ws ? hmToMin(ws, null) : null,
      windowEndMin: we ? hmToMin(we, null) : null,
      note: note || "",
    });
  }

  return out.map((row, idx) => ({ ...row, order: idx + 1 }));
}

function statusLabel(status) {
  const s = String(status || "DRAFT").toUpperCase();
  if (s === "SHIFT_PUBLISHED") return "VARDİYA OLUŞTU";
  if (s === "AGREEMENT_REQUESTED") return "SÖZLEŞME TALEBİ";
  if (s === "CANCELLED") return "İPTAL";
  return s;
}

function Pill({ children }) {
  return (
    <span
      className="pill"
      style={{
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </span>
  );
}

function SummaryCard({
  current,
  summary,
  busy,
  onSave,
  onPublishShift,
  onCreateAgreement,
}) {
  return (
    <div className="card">
      <div className="title">Özet ve Aksiyonlar</div>
      <div className="muted" style={{ marginBottom: 10 }}>
        Planın genel durumu, lokasyon sayısı ve operasyon aksiyonları.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill>Durum: {statusLabel(current.status)}</Pill>
        <Pill>Lokasyon: {summary.count}</Pill>
        <Pill>Kişi: {summary.pax}</Pill>
        <Pill>
          Saat: {minToHm(current.startMin)} – {minToHm(current.endMin)}
        </Pill>
        {current.publishedShiftId ? <Pill>Shift #{current.publishedShiftId}</Pill> : null}
        {current.linkedAgreementId ? <Pill>Agreement #{current.linkedAgreementId}</Pill> : null}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <button type="button" disabled={busy} onClick={onSave}>
          {busy ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button type="button" disabled={busy || !current.id} onClick={onPublishShift}>
          Talep Vardiyası Oluştur
        </button>
        <button type="button" disabled={busy || !current.id} onClick={onCreateAgreement}>
          Sözleşme Talebi Oluştur
        </button>
      </div>
    </div>
  );
}

function MiniMapPreview({ stops }) {
  const pts = (stops || [])
    .map((s) => ({
      name: s.name || "",
      lat: Number(s.lat),
      lng: Number(s.lng),
    }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));

  if (!pts.length) {
    return (
      <div className="card">
        <div className="title">Mini Harita Önizleme</div>
        <div className="muted">Harita önizleme için geçerli koordinatlı lokasyon ekleyin.</div>
      </div>
    );
  }

  const minLat = Math.min(...pts.map((p) => p.lat));
  const maxLat = Math.max(...pts.map((p) => p.lat));
  const minLng = Math.min(...pts.map((p) => p.lng));
  const maxLng = Math.max(...pts.map((p) => p.lng));

  const pad = 20;
  const w = 260;
  const h = 180;
  const latSpan = Math.max(0.0001, maxLat - minLat);
  const lngSpan = Math.max(0.0001, maxLng - minLng);

  const scaled = pts.map((p, i) => {
    const x = pad + ((p.lng - minLng) / lngSpan) * (w - pad * 2);
    const y = h - pad - ((p.lat - minLat) / latSpan) * (h - pad * 2);
    return { ...p, x, y, i };
  });

  const poly = scaled.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="card">
      <div className="title">Mini Harita Önizleme</div>
      <div className="muted" style={{ marginBottom: 8 }}>
        Lokasyon sırası çizgisel önizleme.
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{
          width: "100%",
          height: 180,
          display: "block",
          borderRadius: 12,
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <polyline
          points={poly}
          fill="none"
          stroke="rgba(91,140,255,.8)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {scaled.map((p) => (
          <g key={`${p.name}-${p.i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.i === 0 ? 6 : 5}
              fill={p.i === 0 ? "#5b8cff" : "rgba(255,255,255,.92)"}
            />
            <text
              x={p.x + 8}
              y={p.y - 8}
              fontSize="10"
              fill="rgba(255,255,255,.82)"
            >
              {p.i + 1}
            </text>
          </g>
        ))}
      </svg>

      <div className="muted" style={{ marginTop: 8 }}>
        Başlangıç: {scaled[0]?.name || "-"} • Bitiş: {scaled[scaled.length - 1]?.name || "-"}
      </div>
    </div>
  );
}

function PlanListItem({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 12,
        borderRadius: 12,
        border: active ? "1px solid #5b8cff" : "1px solid rgba(255,255,255,.12)",
        background: active ? "rgba(91,140,255,.12)" : "rgba(255,255,255,.03)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {item.title || `Plan #${item.id}`}
      </div>
      <div className="muted">
        {String(item.planDate || "").slice(0, 10)} • {statusLabel(item.status)}
      </div>
      <div className="muted">{(item.stops || []).length} lokasyon</div>
    </button>
  );
}

function StopCard({
  row,
  index,
  total,
  isOpen,
  onToggle,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}) {
  return (
    <div
      className="card"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      style={{
        padding: 12,
        overflow: "hidden",
        opacity: isDragging ? 0.65 : 1,
        border: isDragging ? "1px dashed rgba(91,140,255,.7)" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: isOpen ? 12 : 0,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "inherit",
            textAlign: "left",
          }}
        >
          <Pill>::</Pill>
          <Pill>#{index + 1}</Pill>
          <span style={{ fontWeight: 700 }}>{row.name || `Lokasyon ${index + 1}`}</span>
          <span className="muted">{row.passengerCount || 1} kişi</span>
          <span className="muted">
            {isOpen ? "▾ Detayları gizle" : "▸ Detayları göster"}
          </span>
        </button>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" disabled={index === 0} onClick={() => onMoveUp(index)}>
            ↑
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMoveDown(index)}
          >
            ↓
          </button>
          <button type="button" onClick={() => onRemove(index)}>
            Sil
          </button>
        </div>
      </div>

      {!isOpen ? (
        <div className="muted">
          {row.address || "Adres yok"} • {row.lat}, {row.lng}
          {row.windowStartMin != null || row.windowEndMin != null ? (
            <>
              {" "}
              • {row.windowStartMin != null ? minToHm(row.windowStartMin) : "--:--"} -{" "}
              {row.windowEndMin != null ? minToHm(row.windowEndMin) : "--:--"}
            </>
          ) : null}
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.2fr) minmax(0,2fr)",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <label style={fieldLabelStyle}>
              İsim
              <input
                style={{ width: "100%", minWidth: 0 }}
                value={row.name || ""}
                onChange={(e) => onChange(index, { ...row, name: e.target.value })}
              />
            </label>

            <label style={fieldLabelStyle}>
              Adres
              <input
                style={{ width: "100%", minWidth: 0 }}
                value={row.address || ""}
                onChange={(e) => onChange(index, { ...row, address: e.target.value })}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 100px 110px 110px 90px minmax(0,1fr)",
              gap: 10,
            }}
          >
            <label style={fieldLabelStyle}>
              Lat
              <input
                style={{ width: "100%", minWidth: 0 }}
                value={row.lat ?? ""}
                onChange={(e) => onChange(index, { ...row, lat: e.target.value })}
              />
            </label>

            <label style={fieldLabelStyle}>
              Lng
              <input
                style={{ width: "100%", minWidth: 0 }}
                value={row.lng ?? ""}
                onChange={(e) => onChange(index, { ...row, lng: e.target.value })}
              />
            </label>

            <label style={fieldLabelStyle}>
              Pencere Baş.
              <input
                style={{ width: "100%", minWidth: 0 }}
                placeholder="08:30"
                value={row.windowStartMin == null ? "" : minToHm(row.windowStartMin)}
                onChange={(e) =>
                  onChange(index, {
                    ...row,
                    windowStartMin: e.target.value ? hmToMin(e.target.value, null) : null,
                  })
                }
              />
            </label>

            <label style={fieldLabelStyle}>
              Pencere Bit.
              <input
                style={{ width: "100%", minWidth: 0 }}
                placeholder="09:15"
                value={row.windowEndMin == null ? "" : minToHm(row.windowEndMin)}
                onChange={(e) =>
                  onChange(index, {
                    ...row,
                    windowEndMin: e.target.value ? hmToMin(e.target.value, null) : null,
                  })
                }
              />
            </label>

            <label style={fieldLabelStyle}>
              Kişi
              <input
                style={{ width: "100%", minWidth: 0 }}
                type="number"
                min="1"
                value={row.passengerCount ?? 1}
                onChange={(e) => onChange(index, { ...row, passengerCount: e.target.value })}
              />
            </label>

            <label style={fieldLabelStyle}>
              Not
              <input
                style={{ width: "100%", minWidth: 0 }}
                value={row.note || ""}
                onChange={(e) => onChange(index, { ...row, note: e.target.value })}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

export default function OrganizationPlansPanel() {
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState(emptyPlan());
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [openStops, setOpenStops] = useState({ 0: true });
  const [dragIndex, setDragIndex] = useState(null);

  async function load() {
    const data = await api.get("/api/organization/plans");
    setItems(Array.isArray(data?.items) ? data.items : []);
  }

  useEffect(() => {
    load().catch((e) => setMsg(String(e?.message || e)));
  }, []);

  function pick(item) {
    setCurrent({
      id: item.id,
      title: item.title || "",
      planDate: String(item.planDate || "").slice(0, 10),
      startMin: Number(item.startMin || 480),
      endMin: Number(item.endMin || 1080),
      roomId: item.roomId ?? "",
      notes: item.notes || "",
      status: item.status || "DRAFT",
      publishedShiftId: item.publishedShiftId ?? null,
      linkedAgreementId: item.linkedAgreementId ?? null,
      stops: Array.isArray(item.stops) ? item.stops.map((s) => ({ ...s })) : [],
    });
    setOpenStops({ 0: true });
    setMsg("");
  }

  function resetForm() {
    setCurrent(emptyPlan());
    setBulk("");
    setOpenStops({ 0: true });
    setMsg("");
  }

  async function savePlan() {
    setBusy(true);
    setMsg("");
    try {
      const payload = {
        title: current.title,
        planDate: current.planDate,
        startMin: Number(current.startMin),
        endMin: Number(current.endMin),
        roomId: current.roomId === "" ? null : Number(current.roomId),
        notes: current.notes,
        stops: current.stops.map((s, idx) => ({
          order: idx + 1,
          name: s.name,
          address: s.address,
          lat: Number(s.lat),
          lng: Number(s.lng),
          passengerCount: Number(s.passengerCount || 1),
          windowStartMin: s.windowStartMin == null ? null : Number(s.windowStartMin),
          windowEndMin: s.windowEndMin == null ? null : Number(s.windowEndMin),
          note: s.note || "",
        })),
      };

      const data = current.id
        ? await api.put(`/api/organization/plans/${current.id}`, payload)
        : await api.post("/api/organization/plans", payload);

      setMsg(current.id ? "Plan güncellendi." : "Plan oluşturuldu.");
      await load();
      pick(data);
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function publishShift() {
    if (!current.id) return;
    setBusy(true);
    setMsg("");
    try {
      const data = await api.post(`/api/organization/plans/${current.id}/publish-shift`, {});
      setMsg(`Talep vardiyası oluşturuldu. Shift #${data.shiftId}`);
      await load();
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function createAgreement() {
    if (!current.id) return;
    setBusy(true);
    setMsg("");
    try {
      const data = await api.post(`/api/organization/plans/${current.id}/create-agreement`, {});
      setMsg(`Sözleşme talebi oluşturuldu. Agreement #${data.agreementId}`);
      await load();
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function replaceFromBulk() {
    const rows = parseBulk(bulk);
    if (!rows.length) {
      setMsg("İçe aktarılacak geçerli satır bulunamadı.");
      return;
    }
    setCurrent((p) => ({ ...p, stops: rows }));
    setOpenStops(Object.fromEntries(rows.map((_, i) => [i, i === 0])));
    setMsg(`${rows.length} lokasyon içe aktarıldı.`);
  }

  function addEmptyStop() {
    setCurrent((p) => {
      const nextStops = [
        ...p.stops,
        {
          name: "",
          address: "",
          lat: "",
          lng: "",
          passengerCount: 1,
          windowStartMin: null,
          windowEndMin: null,
          note: "",
        },
      ];
      setOpenStops((s) => ({ ...s, [nextStops.length - 1]: true }));
      return { ...p, stops: nextStops };
    });
  }

  function updateStop(index, next) {
    setCurrent((p) => ({
      ...p,
      stops: p.stops.map((x, xi) => (xi === index ? next : x)),
    }));
  }

  function removeStop(index) {
    setCurrent((p) => ({
      ...p,
      stops: p.stops.filter((_, xi) => xi !== index),
    }));

    setOpenStops((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const n = Number(k);
        if (n < index) next[n] = prev[n];
        else if (n > index) next[n - 1] = prev[n];
      });
      return next;
    });
  }

  function moveStop(index, dir) {
    setCurrent((p) => {
      const arr = [...p.stops];
      const next = index + dir;
      if (next < 0 || next >= arr.length) return p;
      const tmp = arr[index];
      arr[index] = arr[next];
      arr[next] = tmp;
      return { ...p, stops: arr };
    });

    setOpenStops((prev) => {
      const nextMap = { ...prev };
      const a = prev[index];
      const b = prev[index + dir];
      nextMap[index] = b;
      nextMap[index + dir] = a;
      return nextMap;
    });
  }

  function moveStopTo(from, to) {
    if (from == null || to == null || from === to) return;

    setCurrent((p) => {
      const arr = [...p.stops];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { ...p, stops: arr };
    });

    setOpenStops((prev) => {
      const arr = current.stops.map((_, i) => !!prev[i]);
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return Object.fromEntries(arr.map((v, i) => [i, v]));
    });
  }

  function toggleStop(index) {
    setOpenStops((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function openAllStops() {
    setOpenStops(Object.fromEntries(current.stops.map((_, i) => [i, true])));
  }

  function closeAllStops() {
    setOpenStops(Object.fromEntries(current.stops.map((_, i) => [i, false])));
  }

  const summary = useMemo(() => {
    const count = (current.stops || []).length;
    const pax = (current.stops || []).reduce(
      (s, x) => s + Number(x.passengerCount || 0),
      0
    );
    return { count, pax };
  }, [current.stops]);

  return (
    <div
      className="wrap"
      style={{ maxWidth: "none", width: "100%", paddingRight: 12, overflowX: "hidden" }}
    >
      <div className="card" style={{ width: "100%" }}>
        <div className="title">Organizasyon Planları</div>
        <div className="muted">
          Gerçek veri modeli: lokasyon listesi, saat penceresi, plan → vardiya / sözleşme.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0,1fr) 250px",
          gap: 12,
          marginTop: 12,
          alignItems: "start",
          width: "100%",
        }}
      >
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="title">Kayıtlı Planlar</div>
          <div className="muted" style={{ marginBottom: 10 }}>
            Hazır planı seç veya yeni plan başlat.
          </div>
          <button type="button" onClick={resetForm}>+ Yeni Plan</button>

          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {items.map((it) => (
              <PlanListItem
                key={it.id}
                item={it}
                active={current.id === it.id}
                onClick={() => pick(it)}
              />
            ))}
            {!items.length ? <div className="muted">Henüz plan yok.</div> : null}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div className="card">
            <div className="title">{current.id ? `Plan #${current.id}` : "Yeni Plan"}</div>
            <div className="muted" style={{ marginBottom: 10 }}>
              Plan başlığı, tarih, saat aralığı ve operasyon notları.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(220px,1.7fr) 150px 120px 120px",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <label style={fieldLabelStyle}>
                Başlık
                <input
                  value={current.title}
                  onChange={(e) => setCurrent((p) => ({ ...p, title: e.target.value }))}
                />
              </label>

              <label style={fieldLabelStyle}>
                Tarih
                <input
                  type="date"
                  value={current.planDate}
                  onChange={(e) => setCurrent((p) => ({ ...p, planDate: e.target.value }))}
                />
              </label>

              <label style={fieldLabelStyle}>
                Başlangıç
                <input
                  type="time"
                  value={minToHm(current.startMin)}
                  onChange={(e) =>
                    setCurrent((p) => ({
                      ...p,
                      startMin: hmToMin(e.target.value, 480),
                    }))
                  }
                />
              </label>

              <label style={fieldLabelStyle}>
                Bitiş
                <input
                  type="time"
                  value={minToHm(current.endMin)}
                  onChange={(e) =>
                    setCurrent((p) => ({
                      ...p,
                      endMin: hmToMin(e.target.value, 1080),
                    }))
                  }
                />
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0,1fr)",
                gap: 10,
              }}
            >
              <label style={fieldLabelStyle}>
                Room ID (opsiyonel)
                <input
                  value={current.roomId}
                  onChange={(e) => setCurrent((p) => ({ ...p, roomId: e.target.value }))}
                />
              </label>

              <label style={fieldLabelStyle}>
                Notlar
                <input
                  value={current.notes}
                  onChange={(e) => setCurrent((p) => ({ ...p, notes: e.target.value }))}
                />
              </label>
            </div>

            {msg ? <div className="muted" style={{ marginTop: 10 }}>{msg}</div> : null}
          </div>

          <div className="card">
            <div className="title">Toplu Lokasyon İçe Aktar</div>
            <div className="muted" style={{ marginBottom: 8 }}>
              Her satır: <b>İsim;Adres;Lat;Lng;Kişi;Başlangıç(HH:mm);Bitiş(HH:mm);Not</b>
            </div>

            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={4}
              style={{ width: "100%" }}
              placeholder={
                "Merkez;Maslak Kampüs;41.1123;29.0212;12;08:30;09:15;VIP grup\nSalon A;Beşiktaş İskele;41.0422;29.0061;6;09:30;10:00;Sunum ekibi"
              }
            />

            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={replaceFromBulk}>Satırları İçeri Al</button>
              <button type="button" onClick={() => setBulk("")}>Temizle</button>
            </div>
          </div>

          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="title">Lokasyonlar</div>
                <div className="muted">
                  Sıra, kişi sayısı ve saat pencereleri burada yönetilir.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={openAllStops}>Tümünü Aç</button>
                <button type="button" onClick={closeAllStops}>Tümünü Kapat</button>
                <button type="button" onClick={addEmptyStop} style={{ whiteSpace: "nowrap" }}>
                  + Satır Ekle
                </button>
              </div>
            </div>

            <div className="muted" style={{ marginBottom: 10 }}>
              Sürükle-bırak ile lokasyon sırasını değiştirebilirsin.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {current.stops.map((row, idx) => (
                <StopCard
                  key={idx}
                  row={row}
                  index={idx}
                  total={current.stops.length}
                  isOpen={!!openStops[idx]}
                  onToggle={() => toggleStop(idx)}
                  onChange={updateStop}
                  onRemove={removeStop}
                  onMoveUp={(i) => moveStop(i, -1)}
                  onMoveDown={(i) => moveStop(i, 1)}
                  onDragStart={(i) => setDragIndex(i)}
                  onDragOver={() => {}}
                  onDrop={(to) => {
                    moveStopTo(dragIndex, to);
                    setDragIndex(null);
                  }}
                  isDragging={dragIndex === idx}
                />
              ))}
              {!current.stops.length ? <div className="muted">Henüz lokasyon yok.</div> : null}
            </div>
          </div>
        </div>

        <div style={{ position: "sticky", top: 12, alignSelf: "start", display: "grid", gap: 12 }}>
          <SummaryCard
            current={current}
            summary={summary}
            busy={busy}
            onSave={savePlan}
            onPublishShift={publishShift}
            onCreateAgreement={createAgreement}
          />
          <MiniMapPreview stops={current.stops} />
        </div>
      </div>
    </div>
  );
}