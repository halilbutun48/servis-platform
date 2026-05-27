import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline from "../../components/StopTimeline";
import { openNextStopNavigation, openFullRouteNavigation, routeStats } from "../../utils/navigation";
import { nowIsoTR } from "../../utils/time";
import PanelChrome from "../../components/PanelChrome";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildMapFacts } from "../../utils/copilotFacts";
import { getEtaDisplay, getGpsAgeText, getGpsReliabilityLabel } from "../../utils/etaSanity";


function isReached(stop) {
  const st = String(stop?.status || stop?.state || "").toUpperCase();
  return st === "REACHED" || st === "DONE" || st === "COMPLETED" || st === "SKIPPED" || Boolean(stop?.reachedAt);
}

function firstPendingStop(stops) {
  return (Array.isArray(stops) ? stops : []).find((s) => s && !isReached(s)) || null;
}

function focusStop(stop) {
  const lat = Number(stop?.lat);
  const lng = Number(stop?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat, lng, zoom: 17 } }));
}

function gpsAgeText(gpsLast) {
  return getGpsAgeText(gpsLast);
}

export default function DriverMapPanel() {
  const { token } = useSession();
  const [vehicles, setVehicles] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [err, setErr] = useState("");

  const loadAll = useCallback(async () => {
    if (!token) return;
    setErr("");
    try {
      const v = await api("/api/live/vehicles", { token });
      setVehicles(Array.isArray(v) ? v : []);

      // driver için doğru endpoint
      const s = await api("/api/shifts/my", { token });
      setShifts(Array.isArray(s) ? s : (s?.items ?? []));

      const firstVeh = Array.isArray(v) && v[0] ? v[0].id : null;
      setSelectedVehicleId((x) => x ?? firstVeh);
    } catch (e) {
      setErr(String(e?.message || e));
      setShifts([]);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => {
      loadAll();
    }, 0);
    return () => clearTimeout(t);
  }, [token, loadAll]);

  // gps:update => HTTP reload yok; sadece state patch
  useAutoReload("gps", (detail) => {
    const m = detail?.payload?.msg;
    if (!m || m._event !== "gps:update") return;

    const vid = Number(m.vehicleId);
    const lat = Number(m.lat);
    const lng = Number(m.lng);
    let atIso = null;
    try {
      if (typeof m.at === "string" && m.at.trim()) {
        const dt = new Date(m.at);
        if (!Number.isNaN(dt.getTime())) atIso = m.at;
      }
    } catch { /* no-op: malformed GPS timestamp falls back to now */ }
    if (!atIso) atIso = nowIsoTR();
    const st = String(m.status || "").toUpperCase();

    if (!Number.isFinite(vid) || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setVehicles((prev) =>
      (Array.isArray(prev) ? prev : []).map((v) => {
        if (Number(v?.id) !== vid) return v;
        return {
          ...v,
          gpsLast: { ...(v?.gpsLast || {}), lat, lng, at: atIso || v?.gpsLast?.at || null },
          gpsState: { ...(v?.gpsState || {}), lastUiStatus: st || v?.gpsState?.lastUiStatus || null },
        };
      })
    );
  });

  // vehicle:status gibi GPS kaynakl? spam'lerde full reload yapma
  useAutoReload("vehicles", (detail) => {
    const ev = detail?.payload?.msg?._event;
    if (ev === "vehicle:status") {
      const m = detail?.payload?.msg;
      const vid = Number(m?.vehicleId);
      const st = String(m?.status || "").toUpperCase();
      if (!Number.isFinite(vid)) return;
      setVehicles((prev) =>
        (Array.isArray(prev) ? prev : []).map((v) => {
          if (Number(v?.id) !== vid) return v;
          return { ...v, gpsState: { ...(v?.gpsState || {}), lastUiStatus: st || v?.gpsState?.lastUiStatus || null } };
        })
      );
      return;
    }
    loadAll();
  });
  useAutoReload("shifts", loadAll);

  // fallback polling (WS koparsa)
  useEffect(() => {
    if (!token) return;
    const t = setInterval(loadAll, 15000);
    return () => clearInterval(t);
  }, [token, selectedVehicleId, loadAll]);

  const activeShift = useMemo(() => {
    return shifts.find((s) => s.status === "ACTIVE" || s.status === "APPROVED") || null;
  }, [shifts]);
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => String(v?.id || "") === String(selectedVehicleId || "")) || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  const stops = useMemo(
    () => (Array.isArray(activeShift?.stops) ? activeShift.stops : []),
    [activeShift]
  );
  const nextStop = useMemo(() => firstPendingStop(stops), [stops]);
  const stats = useMemo(() => routeStats(stops), [stops]);
  const gpsAge = useMemo(() => gpsAgeText(selectedVehicle?.gpsLast), [selectedVehicle?.gpsLast]);
  const gpsStatusText = getGpsReliabilityLabel(selectedVehicle?.gpsState?.lastUiStatus || selectedVehicle?.gpsState?.lastStatus || (selectedVehicle ? "LIVE" : "-"));
  const gpsSourceLabel = selectedVehicle?.gpsState?.lastSource || selectedVehicle?.gpsState?.sourceLabel || selectedVehicle?.gpsLast?.sourceLabel || (selectedVehicle ? "Araç GPS’i" : "GPS bekleniyor");
  const routeProofText = String(activeShift?.operationProofStatus || activeShift?.proofStatus || selectedVehicle?.operationProofStatus || "").trim() || "Belirgin değil";
  const routeEta = Number.isFinite(Number(nextStop?.etaMin))
    ? Number(nextStop.etaMin)
    : Number.isFinite(Number(selectedVehicle?.etaMin))
      ? Number(selectedVehicle.etaMin)
      : Number.isFinite(Number(selectedVehicle?.eta))
        ? Number(selectedVehicle.eta)
        : null;
  const routeEtaText = getEtaDisplay({
    etaMinutes: routeEta,
    gpsStatus: gpsStatusText,
    gpsAge: selectedVehicle?.gpsLast,
    nextStopName: nextStop?.name,
  });
  const copilotFacts = useMemo(() => buildMapFacts({
    selected: selectedVehicle,
    selectedShift: activeShift,
    selectedNext: nextStop,
    selectedEta: routeEta,
    selectedStats: stats,
    gpsStatus: gpsStatusText,
    gpsAge,
    vehicleCount: vehicles.length,
  }), [selectedVehicle, activeShift, nextStop, routeEta, stats, gpsStatusText, gpsAge, vehicles.length]);
  const copilotSelection = useMemo(() => {
    const routeLabel = activeShift?.id ? `Vardiya #${activeShift.id}` : "Canlı rota";
    return {
      scopeKey: "/driver/map",
      entityType: selectedVehicle ? "vehicle" : "shift",
      entityId: Number(selectedVehicle?.id || activeShift?.id || 0) || 0,
      label: `${selectedVehicle?.plate || routeLabel} • Canlı rota`,
      summary: [
        `Seçili araç: ${selectedVehicle?.plate || "-"}`,
        `Durum: ${String(activeShift?.status || "-").toUpperCase()}`,
        `Son GPS: ${gpsAge}`,
        `Sıradaki durak: ${nextStop?.name || "-"}`,
        `Tahmini süre: ${routeEtaText}`,
      ].join(" • "),
      selectedRecordType: selectedVehicle ? "vehicle" : "shift",
      selectedRecordId: Number(selectedVehicle?.id || activeShift?.id || 0) || 0,
      selectedRecordLabel: selectedVehicle?.plate || routeLabel,
      selectedRecordStatus: [
        `Araç: ${selectedVehicle?.plate || "-"}`,
        `Durum: ${String(activeShift?.status || "-").toUpperCase()}`,
        `Son GPS: ${gpsAge}`,
        `GPS durumu: ${gpsStatusText}`,
        `Kaynak: ${gpsSourceLabel}`,
        `Sıradaki durak: ${nextStop?.name || "Yok"}`,
        `Toplam durak: ${stats.total}`,
        `Kalan durak: ${stats.remaining}`,
        `Operasyon kanıtı: ${routeProofText}`,
      ].join(" • "),
      selectedRecordSummary: [
        selectedVehicle?.plate || routeLabel,
        String(activeShift?.status || "-").toUpperCase(),
        `Son GPS ${gpsAge}`,
      ].join(" • "),
      selectedFields: [
        { label: "Araç", value: selectedVehicle?.plate || "-" },
        { label: "Durum", value: String(activeShift?.status || "-").toUpperCase() },
        { label: "Son GPS", value: gpsAge },
        { label: "GPS durumu", value: gpsStatusText },
        { label: "Kaynak", value: gpsSourceLabel },
        { label: "Sıradaki durak", value: nextStop?.name || "-" },
        { label: "Toplam durak", value: String(stats.total) },
        { label: "Kalan durak", value: String(stats.remaining) },
        { label: "Tahmini süre", value: routeEtaText },
        { label: "Operasyon kanıtı", value: routeProofText },
      ],
      fields: [
        { label: "Araç", value: selectedVehicle?.plate || "-" },
        { label: "Durum", value: String(activeShift?.status || "-").toUpperCase() },
        { label: "Son GPS", value: gpsAge },
        { label: "GPS durumu", value: gpsStatusText },
        { label: "Kaynak", value: gpsSourceLabel },
        { label: "Sıradaki durak", value: nextStop?.name || "-" },
        { label: "Toplam durak", value: String(stats.total) },
        { label: "Kalan durak", value: String(stats.remaining) },
        { label: "Tahmini süre", value: routeEtaText },
        { label: "Operasyon kanıtı", value: routeProofText },
      ],
      selectedBadges: [
        { label: "Araç GPS’i", value: gpsStatusText },
        { label: "Sürücünün telefon GPS’i", value: gpsSourceLabel },
      ],
      badges: [
        { label: "Araç GPS’i", value: gpsStatusText },
        { label: "Sürücünün telefon GPS’i", value: gpsSourceLabel },
      ],
      structuredFacts: {
        ...copilotFacts,
        routeEta,
        gpsAge,
        gpsSourceLabel,
        routeProofText,
      },
      facts: copilotFacts,
      uiHints: {
        surface: "driver-map",
      },
    };
  }, [activeShift, selectedVehicle, nextStop, routeEta, routeEtaText, stats, gpsAge, gpsStatusText, gpsSourceLabel, routeProofText, copilotFacts]);

  useEffect(() => {
    if (!selectedVehicle && !activeShift) {
      clearCopilotSelection("/driver/map");
      return undefined;
    }
    setCopilotSelection(copilotSelection);
    return () => clearCopilotSelection("/driver/map");
  }, [copilotSelection, selectedVehicle, activeShift]);

  return (
    <div className="wrap wrap--fluid">
      <PanelChrome
        title="Sürücü - Harita"
        subtitle="Seçili araç + vardiya durakları"
        actions={<button onClick={loadAll} style={{ padding: "8px 12px" }}>Yenile</button>}
      />

      {err ? <div className="card err">{err}</div> : null}

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>Canlı rota özeti</div>
            <div className="muted">Tüm duraklar rota sırası ile, sıradaki durak highlight, canlı araç takibi</div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="pill">Toplam: {stats.total}</span>
            <span className="pill" data-status="OK">Tamamlanan: {stats.completed}</span>
            <span className="pill" data-status="REQUESTED">Kalan: {stats.remaining}</span>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {nextStop?.name ? (
            <>
              <span className="muted">Sıradaki:</span>
              <span className="pill" data-status="NEXT">{nextStop.name}</span>
              <button type="button" onClick={() => openNextStopNavigation(nextStop, vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null)}>Sonraki Durağa Navigasyon</button>
              <button type="button" onClick={() => openFullRouteNavigation(stops, vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null)}>Tam Rotayı Dış Navigasyonda Aç</button>
            </>
          ) : (
            <span className="muted">Sıradaki durak yok.</span>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Adım adım takip</div>
          <StopTimeline stops={stops} nextStopId={nextStop?.id ?? null} compact={false} onSelect={(s) => focusStop(s)} />
        </div>
      </div>

      <MapView
        vehicles={vehicles}
        stops={stops}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={setSelectedVehicleId}
        fitKey={`driver:${vehicles.length}:${stops.length}`}
        height="calc(100vh - 260px)"
      />
    </div>
  );
}

