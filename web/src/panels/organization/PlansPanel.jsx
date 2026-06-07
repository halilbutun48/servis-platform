import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { ymdTR } from "../../utils/time";
import {
  fieldLabelStyle,
  hmToMin,
  inputStyle,
  MiniMapPreview,
  minToHm,
  PlanListItem,
  StopCard,
  SummaryCard,
} from "./organizationPlansShared";

const emptyPlan = () => ({
  id: null,
  title: "",
  planDate: ymdTR(),
  startMin: 8 * 60,
  endMin: 18 * 60,
  roomId: "",
  notes: "",
  stops: [],
  status: "DRAFT",
  publishedShiftId: null,
  linkedAgreementId: null,
});


function parseBulk(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return lines
    .map((line, idx) => {
      const [name, address, lat, lng, count, ws, we, note] = line
        .split(/[;,\t|]/)
        .map((s) => s.trim());

      return {
        order: idx + 1,
        name,
        address: address || "",
        lat: Number(lat),
        lng: Number(lng),
        passengerCount: Math.max(1, Number(count) || 1),
        windowStartMin: ws ? hmToMin(ws, null) : null,
        windowEndMin: we ? hmToMin(we, null) : null,
        note: note || "",
      };
    })
    .filter((x) => x.name && Number.isFinite(x.lat) && Number.isFinite(x.lng));
}

export default function OrganizationPlansPanel() {
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState(emptyPlan());
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [openStops, setOpenStops] = useState({ 0: true });
  const [dragIndex, setDragIndex] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [offerOpen, setOfferOpen] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");

  async function load() {
    const data = await api.get("/api/organization/plans");
    setItems(Array.isArray(data?.items) ? data.items : []);

    const roomRes = await api.get("/api/organization/rooms").catch(() => ({ items: [] }));
    setRooms(Array.isArray(roomRes?.items) ? roomRes.items : []);
  }

  useEffect(() => {
    load().catch((e) => setMsg(String(e?.message || e)));

    try {
      const pid = sessionStorage.getItem("organization:selectedPlanId");
      if (pid) {
        sessionStorage.removeItem("organization:selectedPlanId");
        setTimeout(async () => {
          try {
            const p = await api.get(`/api/organization/plans/${pid}`);
            pick(p);
          } catch { /* no-op */ }
        }, 0);
      }
    } catch { /* no-op */ }
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

  function _resetForm() {
    setCurrent(emptyPlan());
    setBulk("");
    setOpenStops({ 0: true });
    setMsg("");
    setSelectedRoomIds([]);
    setOfferAmount("");
    setOfferNote("");
  }

  async function _savePlan() {
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

  async function _createAgreement() {
    if (!current.id) return;

    setBusy(true);
    setMsg("");

    try {
      const data = await api.post(`/api/organization/plans/${current.id}/create-agreement`, {});
      setMsg(`Sözleşme talebi oluşturuldu. Sözleşme #${data.agreementId}`);
      await load();
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function sendOffers() {
    if (!current.id) return;

    setBusy(true);
    setMsg("");

    try {
      const data = await api.post(`/api/organization/plans/${current.id}/send-offers`, {
        roomIds: selectedRoomIds,
        amountCompany: Number(offerAmount),
        noteCompany: offerNote || null,
      });

      setMsg(`Teklifler gönderildi. Shift #${data.shiftId} • Şirket: ${data.roomIds.length}`);
      setOfferOpen(false);
      await load();

      if (data?.shiftId) {
        setCurrent((p) => ({
          ...p,
          publishedShiftId: data.shiftId,
          status: "SHIFT_PUBLISHED",
        }));
      }
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function _replaceFromBulk() {
    const rows = parseBulk(bulk);
    if (!rows.length) {
      setMsg("İçe aktarılacak geçerli satır bulunamadı.");
      return;
    }

    setCurrent((p) => ({ ...p, stops: rows }));
    setOpenStops(Object.fromEntries(rows.map((_, i) => [i, i === 0])));
    setMsg(`${rows.length} konum içe aktarıldı.`);
  }

  function _addEmptyStop() {
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

  const summary = useMemo(
    () => ({
      count: (current.stops || []).length,
      pax: (current.stops || []).reduce((s, x) => s + Number(x.passengerCount || 0), 0),
    }),
    [current.stops]
  );

  const filteredRooms = useMemo(
    () =>
      rooms.filter((r) =>
        String(r.name || "").toLowerCase().includes(roomSearch.toLowerCase())
      ),
    [rooms, roomSearch]
  );

  return (
    <div className="wrap" style={{ maxWidth: "none", width: "100%", paddingRight: 12, overflowX: "hidden" }}>
      <div className="card" style={{ width: "100%" }}>
        <div className="title">Kurum Planları (Legacy)</div>
        <div className="muted">
          Yeni plan oluşturma akışı <b>Planlama Merkezi</b> ekranına taşındı. Bu sayfa eski
          kurum planlarını görmek için korunur. Yeni iş kurarken <b>Planlama Merkezi</b>
          kullanılmalıdır.
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn primary" onClick={() => navigate("/organization")}>Planlama Merkezi&apos;ne git</button>
          <button type="button" className="btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Bu sayfada kal</button>
        </div>
      </div>

      <div className="organizationPlansLayout" style={{ display: "grid", gap: 12, alignItems: "start", width: "100%" }}>
        <div className="card" style={{ alignSelf: "start", minWidth: 0 }}>
          <div className="title">Kayıtlı Planlar</div>
          <div className="muted" style={{ marginBottom: 10 }}>
            Eski planı seçip inceleyebilirsin. Yeni plan oluşturma artık Planlama Merkezi&apos;ndedir.
          </div>

          <button type="button" onClick={() => navigate("/organization")}>
            Planlama Merkezi&apos;ne git
          </button>

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
                  style={inputStyle}
                  value={current.title}
                  onChange={(e) => setCurrent((p) => ({ ...p, title: e.target.value }))}
                />
              </label>

              <label style={fieldLabelStyle}>
                Tarih
                <input
                  type="date"
                  style={inputStyle}
                  value={current.planDate}
                  onChange={(e) => setCurrent((p) => ({ ...p, planDate: e.target.value }))}
                />
              </label>

              <label style={fieldLabelStyle}>
                Başlangıç
                <input
                  type="time"
                  style={inputStyle}
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
                  style={inputStyle}
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
                Room ID (sadece agreement)
                <input
                  style={inputStyle}
                  value={current.roomId}
                  onChange={(e) => setCurrent((p) => ({ ...p, roomId: e.target.value }))}
                />
              </label>

              <label style={fieldLabelStyle}>
                Notlar
                <input
                  style={inputStyle}
                  value={current.notes}
                  onChange={(e) => setCurrent((p) => ({ ...p, notes: e.target.value }))}
                />
              </label>
            </div>

            {msg ? (
              <div className="muted" style={{ marginTop: 10 }}>
                {msg}
              </div>
            ) : null}
          </div>

          <div className="card">
            <div className="title">Toplu Konum İçe Aktar (Legacy)</div>
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
              <button type="button" onClick={() => setBulk("")}>
                Temizle
              </button>
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
                <div className="title">Konumlar</div>
                <div className="muted">Bu ekran eski planı okumak için tutulur. Yeni konum kurgusu Planlama Merkezi&apos;nde yapılır.</div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={openAllStops}>
                  Tümünü Aç
                </button>
                <button type="button" onClick={closeAllStops}>
                  Tümünü Kapat
                </button>
              </div>
            </div>

            <div className="muted" style={{ marginBottom: 10 }}>
              Sürükle-bırak ile konum sırasını değiştirebilirsin.
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
                  onDrop={(to) => {
                    moveStopTo(dragIndex, to);
                    setDragIndex(null);
                  }}
                  isDragging={dragIndex === idx}
                />
              ))}
              {!current.stops.length ? <div className="muted">Henüz konum yok.</div> : null}
            </div>
          </div>

          {offerOpen ? (
            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <div>
                  <div className="title">Şirketlere Teklif Gönder</div>
                  <div className="muted">
                    Bu akış karşı tarafta <b>Offers</b> bölümüne düşer.
                  </div>
                </div>

                <button type="button" onClick={() => setOfferOpen(false)}>
                  Kapat
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) 180px minmax(0,1fr)",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <label style={fieldLabelStyle}>
                  Şirket ara
                  <input
                    style={inputStyle}
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    placeholder="name contains"
                  />
                </label>

                <label style={fieldLabelStyle}>
                  Tutar (₺)
                  <input
                    style={inputStyle}
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="örn. 25000"
                  />
                </label>

                <label style={fieldLabelStyle}>
                  Not
                  <input
                    style={inputStyle}
                    value={offerNote}
                    onChange={(e) => setOfferNote(e.target.value)}
                    placeholder="örn. sabah giriş"
                  />
                </label>
              </div>

              <div className="muted" style={{ marginBottom: 8 }}>
                Toplam şirket: {filteredRooms.length}
              </div>

              <div className="card" style={{ padding: 10, display: "grid", gap: 8 }}>
                {filteredRooms.map((r) => (
                  <label key={r.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedRoomIds.includes(r.id)}
                      onChange={(e) =>
                        setSelectedRoomIds((prev) =>
                          e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id)
                        )
                      }
                    />
                    {r.name} #{r.id}
                  </label>
                ))}
                {!filteredRooms.length ? <div className="muted">Şirket bulunamadı.</div> : null}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoomIds([]);
                    setOfferAmount("");
                    setOfferNote("");
                  }}
                >
                  Temizle
                </button>

                <button
                  type="button"
                  disabled={!selectedRoomIds.length || !offerAmount || busy}
                  onClick={sendOffers}
                >
                  Toplu Teklifleri Gönder
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="organizationPlansSidebar">
          <SummaryCard
            current={current}
            summary={summary}
            busy={busy}
            onGoPlanning={() => navigate("/organization")}
          />
          <MiniMapPreview stops={current.stops} shiftId={current.publishedShiftId} />
        </div>
      </div>
    </div>
  );
}
