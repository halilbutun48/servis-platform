import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import { useAutoReload } from "../../live/useAutoReload";
import CameraQrScannerCard from "../../components/checkin/CameraQrScannerCard";
import { extractCheckinToken } from "../../utils/checkinToken";
import { formatDateTimeTR } from "../../utils/time";
import { displayStatusLabel } from "../../utils/displayStatus";

function fmt(dt) {
  try {
    return formatDateTimeTR(dt);
  } catch {
    return String(dt || "-");
  }
}

function eventTypeLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  if (key === "BOARD") return "Biniş";
  if (key === "ALIGHT") return "İniş";
  return "Bilinmiyor";
}

function eventSourceLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  if (key === "QR") return "QR";
  if (key === "NFC") return "NFC";
  if (key === "MANUAL") return "Manuel";
  return "Bilinmiyor";
}

export default function DriverCheckinPanel() {
  const { token, me } = useSession();
  const featureOn = true;

  const [shiftData, setShiftData] = useState(null);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState({ BOARD: 0, ALIGHT: 0 });
  const [eventType, setEventType] = useState("BOARD");
  const [source, setSource] = useState("QR");
  const [tokenValue, setTokenValue] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const shifts = useMemo(() => {
    const today = shiftData?.today || [];
    const tomorrow = shiftData?.tomorrow || [];
    return [...today, ...tomorrow];
  }, [shiftData]);

  const selectedShift = useMemo(
    () => shifts.find((x) => String(x.id) === String(selectedShiftId)) || null,
    [shifts, selectedShiftId]
  );

  const loadShifts = useCallback(async () => {
    if (!featureOn) return;
    const r = await api("/api/driver/shifts/today", { token });
    setShiftData(r);
    setSelectedShiftId((prev) => {
      if (prev && [...(r?.today || []), ...(r?.tomorrow || [])].some((x) => String(x.id) === String(prev))) return prev;
      const active = r?.active || r?.today?.[0] || r?.tomorrow?.[0] || null;
      return active ? String(active.id) : "";
    });
  }, [featureOn, token]);

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
  }, [loadAll, me?.driverId]);

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

  async function submitScan(tokenRaw) {
    if (!selectedShiftId) {
      setErr("Önce vardiya seç.");
      return;
    }
    setScanBusy(true);
    setErr("");
    try {
      const r = await api("/api/checkin/scan", {
        method: "POST",
        token,
        body: {
          shiftId: Number(selectedShiftId),
          token: tokenRaw,
          eventType,
          source,
          deviceId: deviceId || undefined,
        },
      });
      setLastResult(r);
      setTokenValue("");
      await loadEvents(selectedShiftId);
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setScanBusy(false);
    }
  }

  async function onScan(e) {
    e?.preventDefault?.();
    await submitScan(tokenValue);
  }

  async function onCameraDetected(rawValue) {
    const parsed = extractCheckinToken(rawValue);
    if (!parsed) {
      setErr("QR içinde geçerli kod bulunamadı.");
      return;
    }
    setTokenValue(parsed);
    setCameraOpen(false);
    if (selectedShiftId) {
      await submitScan(parsed);
    }
  }


  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Sürücü okutma</h3>
            <div className="muted" style={{ marginTop: 6 }}>
              Aktif vardiyada QR/NFC okutarak biniş veya iniş kaydı oluşturur. Vardiya aktif değilse önce Bugün ekranından görevi başlat.
            </div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="pill" data-status="COUNT">Opsiyonel okutma</span>
            <button type="button" className="btn" onClick={loadAll} disabled={loading}>{loading ? "..." : "Yenile"}</button>
          </div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid">
        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Okutma ekranı</h3>
            <div className="row" style={{ gap: 10, alignItems: "end", flexWrap: "wrap" }}>
              <label className="col" style={{ minWidth: 280, flex: 1 }}>
                <span className="muted">Vardiya</span>
                <select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)}>
                  <option value="">Vardiya seç</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} • {displayStatusLabel(s.status)} • {fmt(s.startAt)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col">
                <span className="muted">Kayıt türü</span>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                  <option value="BOARD">Biniş</option>
                  <option value="ALIGHT">İniş</option>
                </select>
              </label>
              <label className="col">
                <span className="muted">Kaynak</span>
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="QR">QR</option>
                  <option value="NFC">NFC</option>
                  <option value="MANUAL">Manuel</option>
                </select>
              </label>
            </div>

            {selectedShift ? (
              <div className="muted" style={{ marginTop: 10 }}>
                Vardiya #{selectedShift.id} • <span className="pill" data-status={String(selectedShift.status || "").toUpperCase()}>{displayStatusLabel(String(selectedShift.status || "").toUpperCase())}</span>
                {selectedShift.status !== "ACTIVE" ? (
                  <button type="button" className="btn sm" style={{ marginLeft: 8 }} onClick={() => navigate("/driver/today")}>Bugün ekranına git</button>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={onScan} style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <label className="col">
                <span className="muted">Okuma kodu</span>
                <input value={tokenValue} onChange={(e) => setTokenValue(e.target.value)} placeholder="Örn. ABC123" />
              </label>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={() => setCameraOpen((p) => !p)}>
                  {cameraOpen ? "Kamerayı kapat" : "Kamera ile tara"}
                </button>
                <span className="muted">Kamera okursa kod otomatik gönderilir.</span>
              </div>
              <label className="col">
                <span className="muted">Cihaz kimliği (isteğe bağlı)</span>
                <input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="scanner-1" />
              </label>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="submit" className="btn primary" disabled={scanBusy || !selectedShiftId || !tokenValue.trim()}>
                  {scanBusy ? "..." : "Okut"}
                </button>
                <span className="pill" data-status="COUNT">Biniş {counts.BOARD || 0}</span>
                <span className="pill" data-status="COUNT">İniş {counts.ALIGHT || 0}</span>
              </div>
            </form>

            {cameraOpen ? (
              <CameraQrScannerCard
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onDetected={onCameraDetected}
              />
            ) : null}

            {lastResult ? (
              <div className="card" style={{ marginTop: 12, marginBottom: 0 }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span className="pill" data-status={lastResult?.deduped ? "REQUESTED" : "APPROVED"}>
                    {lastResult?.deduped ? "Yinelenen kayıt" : "Tamamlandı"}
                  </span>
                  <span className="muted">Son kayıt: {eventTypeLabel(lastResult?.lastEvent?.eventType)} • {fmt(lastResult?.lastEvent?.at)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="card" style={{ overflowX: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Son kayıtlar</h3>
          <table className="tbl" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Kişi</th>
                <th>Tip</th>
                <th>Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {events.length ? events.map((it) => (
                <tr key={it.id}>
                  <td>{fmt(it.at)}</td>
                  <td>{it.personel?.fullName || `#${it.personelId}`}</td>
                  <td><span className="pill" data-status={String(it.eventType || "").toUpperCase()}>{displayStatusLabel(String(it.eventType || "").toUpperCase())}</span></td>
                  <td>{eventSourceLabel(it.source)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="muted">Henüz kayıt yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
