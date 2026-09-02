import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { formatDateTimeTR } from "../../utils/time";
import { displayStatusLabel } from "../../utils/displayStatus";

function fmt(dt) {
  try {
    return formatDateTimeTR(dt);
  } catch {
    return String(dt || "-");
  }
}

export default function RoomCheckinPanel() {
  const { token, me } = useSession();
  const featureOn = true;
  const [items, setItems] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState({ BOARD: 0, ALIGHT: 0 });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedShift = useMemo(
    () => items.find((x) => String(x.id) === String(selectedShiftId)) || null,
    [items, selectedShiftId]
  );

  const loadShifts = useCallback(async () => {
    if (!featureOn) return;
    const sh = await api("/api/shifts?take=200&status=APPROVED,ACTIVE,DONE&includeOffered=1", { token });
    const list = Array.isArray(sh) ? sh : sh?.items ?? [];
    const filtered = list.filter((x) => x.roomId === me?.roomId);
    filtered.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    setItems(filtered);
    setSelectedShiftId((prev) => {
      if (prev && filtered.some((x) => String(x.id) === String(prev))) return prev;
      const active = filtered.find((x) => x.status === "ACTIVE") || filtered[0] || null;
      return active ? String(active.id) : "";
    });
  }, [featureOn, me?.roomId, token]);

  const loadEvents = useCallback(async (shiftId) => {
    if (!featureOn || !shiftId) {
      setEvents([]);
      setCounts({ BOARD: 0, ALIGHT: 0 });
      return;
    }
    const r = await api(`/api/checkin/shifts/${shiftId}/events`, { token });
    setEvents(r?.items ?? []);
    setCounts(r?.counts ?? { BOARD: 0, ALIGHT: 0 });
  }, [featureOn, token]);

  const loadAll = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      await loadShifts();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [loadShifts]);

  useEffect(() => {
    loadAll();
  }, [loadAll, me?.roomId]);

  useEffect(() => {
    if (!selectedShiftId || !featureOn) return;
    setLoading(true);
    loadEvents(selectedShiftId)
      .catch((e) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, [featureOn, loadEvents, selectedShiftId]);

  useAutoReload("shifts", async () => {
    await loadShifts();
    if (selectedShiftId) await loadEvents(selectedShiftId);
  }, featureOn);

  useAutoReload("checkin", async () => {
    if (selectedShiftId) await loadEvents(selectedShiftId);
  }, featureOn);


  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Taşımacılık Firması biniş kayıtları</h3>
            <div className="muted" style={{ marginTop: 6 }}>
              Taşımacılık Firması tarafı için salt okunur operasyon paneli. Sürücü kayıt oluşturdukça biniş / iniş sayıları ve son olaylar burada görünür.
            </div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="pill" data-status="COUNT">İsteğe bağlı biniş kaydı</span>
            <button type="button" className="btn" onClick={loadAll} disabled={loading}>{loading ? "..." : "Yenile"}</button>
          </div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <div className="row" style={{ gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <label className="col" style={{ minWidth: 320, flex: 1 }}>
            <span className="muted">Vardiya seç</span>
            <select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)}>
              <option value="">Vardiya seç</option>
              {items.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} • {displayStatusLabel(s.status)} • {fmt(s.startAt)}
                </option>
              ))}
            </select>
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="pill" data-status="COUNT">Biniş {counts.BOARD || 0}</span>
            <span className="pill" data-status="COUNT">İniş {counts.ALIGHT || 0}</span>
            {selectedShift ? <span className="pill" data-status={String(selectedShift.status || "").toUpperCase()}>{displayStatusLabel(String(selectedShift.status || "").toUpperCase())}</span> : null}
          </div>
        </div>
        {selectedShift ? (
          <div className="muted" style={{ marginTop: 10 }}>
            Vardiya #{selectedShift.id} • Araç {selectedShift.vehicle?.plate || "-"} • Sürücü {selectedShift.driver?.fullName || "-"}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Son olaylar</h3>
        <table className="tbl" style={{ whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Kişi</th>
              <th>Tür</th>
              <th>Kaynak</th>
              <th>Cihaz</th>
            </tr>
          </thead>
          <tbody>
            {events.length ? events.map((it) => (
              <tr key={it.id}>
                <td>{fmt(it.at)}</td>
                <td>{it.personel?.fullName || `#${it.personelId}`}</td>
                <td><span className="pill" data-status={String(it.eventType || "").toUpperCase()}>{displayStatusLabel(String(it.eventType || "").toUpperCase())}</span></td>
                <td>{it.source || "-"}</td>
                <td>{it.deviceId || "-"}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="muted">Henüz olay yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
