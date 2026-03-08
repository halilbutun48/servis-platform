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
  return <span className="pill" style={{ whiteSpace: "nowrap" }}>{children}</span>;
}

function SummaryCard({ current, summary, busy, onSave, onPublishShift, onCreateAgreement }) {
  return (
    <div className="card">
      <div className="title">Özet ve Aksiyonlar</div>
      <div className="muted" style={{ marginBottom: 10 }}>
        Planın genel durumu, lokasyon sayısı ve operasyon aksiyonları.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Pill>Durum: {statusLabel(current.status)}</Pill>
        <Pill>Lokasyon: {summary.count}</Pill>
        <Pill>Kişi: {summary.pax}</Pill>
        <Pill>Saat: {minToHm(current.startMin)} → {minToHm(current.endMin)}</Pill>
        {current.publishedShiftId ? <Pill>Shift #{current.publishedShiftId}</Pill> : null}
        {current.linkedAgreementId ? <Pill>Agreement #{current.linkedAgreementId}</Pill> : null}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={busy} onClick={onSave}>{busy ? "Kaydediliyor..." : "Kaydet"}</button>
        <button type="button" disabled={busy || !current.id} onClick={onPublishShift}>Talep Vardiyası Oluştur</button>
        <button type="button" disabled={busy || !current.id} onClick={onCreateAgreement}>Sözleşme Talebi Oluştur</button>
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
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.title || `Plan #${item.id}`}</div>
      <div className="muted">{String(item.planDate || "").slice(0, 10)} • {statusLabel(item.status)}</div>
      <div className="muted">{(item.stops || []).length} lokasyon</div>
    </button>
  );
}

function StopCard({ row, index, onChange, onRemove, onMoveUp, onMoveDown, total }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill>#{index + 1}</Pill>
          <span style={{ fontWeight: 700 }}>{row.name || `Lokasyon ${index + 1}`}</span>
          <span className="muted">{row.passengerCount || 1} kişi</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" disabled={index === 0} onClick={() => onMoveUp(index)}>↑</button>
          <button type="button" disabled={index === total - 1} onClick={() => onMoveDown(index)}>↓</button>
          <button type="button" onClick={() => onRemove(index)}>Sil</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr .8fr", gap: 8, marginBottom: 8 }}>
        <label className="muted">İsim
          <input value={row.name || ""} onChange={(e) => onChange(index, { ...row, name: e.target.value })} />
        </label>
        <label className="muted">Adres
          <input value={row.address || ""} onChange={(e) => onChange(index, { ...row, address: e.target.value })} />
        </label>
        <label className="muted">Kişi
          <input type="number" min="1" value={row.passengerCount ?? 1} onChange={(e) => onChange(index, { ...row, passengerCount: e.target.value })} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr .7fr .7fr 1.2fr", gap: 8 }}>
        <label className="muted">Lat
          <input value={row.lat ?? ""} onChange={(e) => onChange(index, { ...row, lat: e.target.value })} />
        </label>
        <label className="muted">Lng
          <input value={row.lng ?? ""} onChange={(e) => onChange(index, { ...row, lng: e.target.value })} />
        </label>
        <label className="muted">Pencere Baş.
          <input placeholder="08:30" value={row.windowStartMin == null ? "" : minToHm(row.windowStartMin)} onChange={(e) => onChange(index, { ...row, windowStartMin: e.target.value ? hmToMin(e.target.value, null) : null })} />
        </label>
        <label className="muted">Pencere Bit.
          <input placeholder="09:15" value={row.windowEndMin == null ? "" : minToHm(row.windowEndMin)} onChange={(e) => onChange(index, { ...row, windowEndMin: e.target.value ? hmToMin(e.target.value, null) : null })} />
        </label>
        <label className="muted">Not
          <input value={row.note || ""} onChange={(e) => onChange(index, { ...row, note: e.target.value })} />
        </label>
      </div>
    </div>
  );
}

export default function OrganizationPlansPanel() {
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState(emptyPlan());
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

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
    setMsg("");
  }

  function resetForm() {
    setCurrent(emptyPlan());
    setBulk("");
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
    setMsg(`${rows.length} lokasyon içe aktarıldı.`);
  }

  function addEmptyStop() {
    setCurrent((p) => ({
      ...p,
      stops: [
        ...p.stops,
        { name: "", address: "", lat: "", lng: "", passengerCount: 1, windowStartMin: null, windowEndMin: null, note: "" },
      ],
    }));
  }

  function updateStop(index, next) {
    setCurrent((p) => ({ ...p, stops: p.stops.map((x, xi) => (xi === index ? next : x)) }));
  }

  function removeStop(index) {
    setCurrent((p) => ({ ...p, stops: p.stops.filter((_, xi) => xi !== index) }));
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
  }

  const summary = useMemo(() => {
    const count = (current.stops || []).length;
    const pax = (current.stops || []).reduce((s, x) => s + Number(x.passengerCount || 0), 0);
    return { count, pax };
  }, [current.stops]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Organizasyon Planları</div>
        <div className="muted">
          Gerçek veri modeli: lokasyon listesi, saat penceresi, plan → vardiya / sözleşme.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0,1fr)", gap: 12, marginTop: 12, alignItems: "start" }}>
        <div className="card" style={{ position: "sticky", top: 12 }}>
          <div className="title">Kayıtlı Planlar</div>
          <div className="muted" style={{ marginBottom: 10 }}>Hazır planı seç veya yeni plan başlat.</div>
          <button type="button" onClick={resetForm}>+ Yeni Plan</button>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {items.map((it) => (
              <PlanListItem key={it.id} item={it} active={current.id === it.id} onClick={() => pick(it)} />
            ))}
            {!items.length ? <div className="muted">Henüz plan yok.</div> : null}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12 }}>
            <div className="card">
              <div className="title">{current.id ? `Plan #${current.id}` : "Yeni Plan"}</div>
              <div className="muted" style={{ marginBottom: 10 }}>Plan başlığı, tarih, saat aralığı ve operasyon notları.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr .8fr .7fr .7fr", gap: 8, marginBottom: 8 }}>
                <label className="muted">Başlık
                  <input value={current.title} onChange={(e) => setCurrent((p) => ({ ...p, title: e.target.value }))} />
                </label>
                <label className="muted">Tarih
                  <input type="date" value={current.planDate} onChange={(e) => setCurrent((p) => ({ ...p, planDate: e.target.value }))} />
                </label>
                <label className="muted">Başlangıç
                  <input type="time" value={minToHm(current.startMin)} onChange={(e) => setCurrent((p) => ({ ...p, startMin: hmToMin(e.target.value, 480) }))} />
                </label>
                <label className="muted">Bitiş
                  <input type="time" value={minToHm(current.endMin)} onChange={(e) => setCurrent((p) => ({ ...p, endMin: hmToMin(e.target.value, 1080) }))} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr)", gap: 8 }}>
                <label className="muted">Room ID (opsiyonel)
                  <input value={current.roomId} onChange={(e) => setCurrent((p) => ({ ...p, roomId: e.target.value }))} />
                </label>
                <label className="muted">Notlar
                  <input value={current.notes} onChange={(e) => setCurrent((p) => ({ ...p, notes: e.target.value }))} />
                </label>
              </div>
              {msg ? <div className="muted" style={{ marginTop: 10 }}>{msg}</div> : null}
            </div>

            <SummaryCard
              current={current}
              summary={summary}
              busy={busy}
              onSave={savePlan}
              onPublishShift={publishShift}
              onCreateAgreement={createAgreement}
            />
          </div>

          <div className="card">
            <div className="title">Toplu Lokasyon İçe Aktar</div>
            <div className="muted" style={{ marginBottom: 8 }}>
              Her satır: <b>İsim;Adres;Lat;Lng;Kişi;Başlangıç(HH:mm);Bitiş(HH:mm);Not</b>
            </div>
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={5}
              style={{ width: "100%" }}
              placeholder={"Merkez;Maslak Kampüs;41.1123;29.0212;12;08:30;09:15;VIP grup\nSalon A;Beşiktaş İskele;41.0422;29.0061;6;09:30;10:00;Sunum ekibi"}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={replaceFromBulk}>Satırları İçeri Al</button>
              <button type="button" onClick={() => setBulk("")}>Temizle</button>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <div>
                <div className="title">Lokasyonlar</div>
                <div className="muted">Sıra, kişi sayısı ve saat pencereleri burada yönetilir.</div>
              </div>
              <button type="button" onClick={addEmptyStop}>+ Satır Ekle</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {current.stops.map((row, idx) => (
                <StopCard
                  key={idx}
                  row={row}
                  index={idx}
                  total={current.stops.length}
                  onChange={updateStop}
                  onRemove={removeStop}
                  onMoveUp={(i) => moveStop(i, -1)}
                  onMoveDown={(i) => moveStop(i, 1)}
                />
              ))}
              {!current.stops.length ? <div className="muted">Henüz lokasyon yok.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
