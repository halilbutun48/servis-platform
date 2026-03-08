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

function StopEditorRow({ row, index, onChange, onRemove }) {
  return (
    <tr>
      <td>{index + 1}</td>
      <td><input value={row.name || ""} onChange={(e) => onChange(index, { ...row, name: e.target.value })} /></td>
      <td><input value={row.address || ""} onChange={(e) => onChange(index, { ...row, address: e.target.value })} /></td>
      <td><input value={row.lat ?? ""} onChange={(e) => onChange(index, { ...row, lat: e.target.value })} /></td>
      <td><input value={row.lng ?? ""} onChange={(e) => onChange(index, { ...row, lng: e.target.value })} /></td>
      <td><input value={row.passengerCount ?? 1} onChange={(e) => onChange(index, { ...row, passengerCount: e.target.value })} /></td>
      <td><input placeholder="08:30" value={row.windowStartMin == null ? "" : minToHm(row.windowStartMin)} onChange={(e) => onChange(index, { ...row, windowStartMin: e.target.value ? hmToMin(e.target.value, null) : null })} /></td>
      <td><input placeholder="09:15" value={row.windowEndMin == null ? "" : minToHm(row.windowEndMin)} onChange={(e) => onChange(index, { ...row, windowEndMin: e.target.value ? hmToMin(e.target.value, null) : null })} /></td>
      <td><input value={row.note || ""} onChange={(e) => onChange(index, { ...row, note: e.target.value })} /></td>
      <td><button type="button" onClick={() => onRemove(index)}>Sil</button></td>
    </tr>
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

  const summary = useMemo(() => {
    const count = (current.stops || []).length;
    const pax = (current.stops || []).reduce((s, x) => s + Number(x.passengerCount || 0), 0);
    return { count, pax };
  }, [current.stops]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Organizasyon Planları</div>
        <div className="muted">Gerçek veri modeli: lokasyon listesi, saat penceresi, plan → vardiya / sözleşme.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, marginTop: 12 }}>
        <div className="card">
          <div className="title">Kayıtlı Planlar</div>
          <div className="muted" style={{ marginBottom: 8 }}>Demo organization için plan listesi</div>
          <button type="button" onClick={resetForm}>+ Yeni Plan</button>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => pick(it)}
                style={{ textAlign: "left", padding: 10, border: "1px solid #ddd", borderRadius: 10, background: current.id === it.id ? "#f3f6ff" : "#fff" }}
              >
                <div style={{ fontWeight: 600 }}>{it.title}</div>
                <div className="muted">{String(it.planDate || "").slice(0, 10)} • {it.status}</div>
                <div className="muted">{(it.stops || []).length} lokasyon</div>
              </button>
            ))}
            {!items.length ? <div className="muted">Henüz plan yok.</div> : null}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div className="card">
            <div className="title">{current.id ? `Plan #${current.id}` : "Yeni Plan"}</div>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 1fr 1fr 1fr", marginTop: 10 }}>
              <label className="muted">Başlık<input value={current.title} onChange={(e) => setCurrent((p) => ({ ...p, title: e.target.value }))} /></label>
              <label className="muted">Tarih<input type="date" value={current.planDate} onChange={(e) => setCurrent((p) => ({ ...p, planDate: e.target.value }))} /></label>
              <label className="muted">Başlangıç<input type="time" value={minToHm(current.startMin)} onChange={(e) => setCurrent((p) => ({ ...p, startMin: hmToMin(e.target.value, 480) }))} /></label>
              <label className="muted">Bitiş<input type="time" value={minToHm(current.endMin)} onChange={(e) => setCurrent((p) => ({ ...p, endMin: hmToMin(e.target.value, 1080) }))} /></label>
            </div>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "160px 1fr", marginTop: 8 }}>
              <label className="muted">Room ID (opsiyonel)<input value={current.roomId} onChange={(e) => setCurrent((p) => ({ ...p, roomId: e.target.value }))} /></label>
              <label className="muted">Not<input value={current.notes} onChange={(e) => setCurrent((p) => ({ ...p, notes: e.target.value }))} /></label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" disabled={busy} onClick={savePlan}>{busy ? "..." : "Kaydet"}</button>
              <button type="button" disabled={busy || !current.id} onClick={publishShift}>Talep Vardiyası Oluştur</button>
              <button type="button" disabled={busy || !current.id} onClick={createAgreement}>Sözleşme Talebi Oluştur</button>
              <span className="muted">Lokasyon: {summary.count} • Kişi: {summary.pax}</span>
              {current.publishedShiftId ? <span className="muted">Shift #{current.publishedShiftId}</span> : null}
              {current.linkedAgreementId ? <span className="muted">Agreement #{current.linkedAgreementId}</span> : null}
            </div>
            {msg ? <div className="muted" style={{ marginTop: 10 }}>{msg}</div> : null}
          </div>

          <div className="card">
            <div className="title">Toplu Lokasyon İçe Aktar</div>
            <div className="muted">Her satır: İsim;Adres;Lat;Lng;Kişi;Başlangıç(HH:mm);Bitiş(HH:mm);Not</div>
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={7}
              style={{ width: "100%", marginTop: 8 }}
              placeholder={"Merkez;Maslak Kampüs;41.1123;29.0212;12;08:30;09:15;VIP grup\nSalon A;Beşiktaş İskele;41.0422;29.0061;6;09:30;10:00;Sunum ekibi"}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={replaceFromBulk}>Satırları İçeri Al</button>
              <button type="button" onClick={() => setBulk("")}>Temizle</button>
            </div>
          </div>

          <div className="card">
            <div className="title">Lokasyonlar</div>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={{ width: "100%", minWidth: 980 }}>
                <thead>
                  <tr>
                    <th>#</th><th>İsim</th><th>Adres</th><th>Lat</th><th>Lng</th><th>Kişi</th><th>Pencere Baş.</th><th>Pencere Bit.</th><th>Not</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {current.stops.map((row, idx) => (
                    <StopEditorRow
                      key={idx}
                      index={idx}
                      row={row}
                      onChange={(i, next) => setCurrent((p) => ({ ...p, stops: p.stops.map((x, xi) => (xi === i ? next : x)) }))}
                      onRemove={(i) => setCurrent((p) => ({ ...p, stops: p.stops.filter((_, xi) => xi !== i) }))}
                    />
                  ))}
                  {!current.stops.length ? <tr><td colSpan={10} className="muted">Henüz lokasyon yok.</td></tr> : null}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={addEmptyStop}>+ Satır Ekle</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
