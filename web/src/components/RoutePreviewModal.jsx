// web/src/components/RoutePreviewModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";

import { api } from "../api";
import { useSession } from "../state/session";
import { apiOr404Fallback } from "../utils/apiFallback";
import { getShiftRoutePreview } from "../utils/shiftRoutePreview";
import StopTimeline from "./StopTimeline";
import { openFullRouteNavigation } from "../utils/navigation";

function routeSourceLabel(source) {
  if (String(source || "").toUpperCase() === "LEARNED") return "Learned";
  return "Tahmini";
}

function buildRouteQuality(summary, source, stops, people) {
  const stopList = Array.isArray(stops) ? stops : [];
  const peopleList = Array.isArray(people) ? people : [];
  const stopCountWithoutHub = Number(summary?.stopCount ?? stopList.length ?? 0);
  const hubIncluded = String(summary?.startLabel || "") === "HUB" || String(summary?.endLabel || "") === "HUB";
  const stopCountWithHub = stopCountWithoutHub + (hubIncluded ? 1 : 0);
  const singletonCount = stopList.filter((s) => Number(s?.count || 0) === 1).length;
  const reviewCount = peopleList.filter((p) => String(p?.geoStatus || "") === "NEEDS_REVIEW").length;
  const qualityNotes = [];
  if (summary?.warning === "hubMissing") qualityNotes.push("Hub eksik; rota tahmini stop sırasına göre gösteriliyor.");
  if (reviewCount > 0) qualityNotes.push(`${reviewCount} review kaydı rota kalitesini sınırlayabilir.`);
  if (!qualityNotes.length) {
    qualityNotes.push(
      String(source || "").toUpperCase() === "LEARNED"
        ? "Learned rota verisi kullanıldı."
        : String(source || "").toUpperCase() === "SNAPSHOT"
          ? "Kaydedilmiş rota snapshot kullanıldı; preview yeniden OSRM hesaplamadı."
          : "Önizleme DB stop sırası ve tahmini hat üzerinden gösteriliyor; OSRM Step-4 ve dispatch için ayrıldı."
    );
  }
  return {
    stopCountWithoutHub,
    stopCountWithHub,
    singletonCount,
    reviewCount,
    sourceLabel: routeSourceLabel(source),
    qualityNotes,
  };
}

function FitBounds({ bounds }) {
  const map = useMap();

  useEffect(() => {
    // Map is in a modal; make sure Leaflet measures size correctly.
    const t = setTimeout(() => {
      try { map.invalidateSize(); } catch { /* no-op: map may be unmounted */ }
      try {
        if (bounds) map.fitBounds(bounds, { padding: [24, 24] });
      } catch { /* no-op: bounds may be incomplete during modal open */ }
    }, 50);

    return () => clearTimeout(t);
  }, [map, bounds]);

  return null;
}

export default function RoutePreviewModal({ open, onClose, title, subtitle = "", shiftId, stops, people, previewSummary = null, previewPathPoints = null, previewSource = null, previewShift = null }) {
  const { token } = useSession();

  const [remote, setRemote] = useState({
    shiftId: null,
    loadedAt: 0,
    stops: null,
    people: null,
    summary: null,
    pathPoints: null,
    source: null,
    shift: null,
    err: "",
  });

  const [selectedStopId, setSelectedStopId] = useState(null);
  const lastRequestRef = useRef({ shiftId: null, startedAt: 0 });

  useEffect(() => {
    if (!open) return;
    if (!shiftId) return;

    const isFresh = Number(remote?.shiftId || 0) === Number(shiftId || 0)
      && Number(remote?.loadedAt || 0) > 0
      && (Date.now() - Number(remote.loadedAt || 0) < 15000)
      && !remote?.err;
    if (isFresh) return;

    let alive = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setRemote((s) => ({ ...s, err: "" }));
      lastRequestRef.current = { shiftId: Number(shiftId || 0) || null, startedAt: Date.now() };

      (async () => {
        try {
          const data = await apiOr404Fallback(
            async () => await getShiftRoutePreview(token, shiftId, { signal: controller.signal, ttlMs: 30000, delayMs: 120 }),
            async () => {
              const resp = await api(`/api/shifts/${shiftId}/stops`, { token, signal: controller.signal });
              const list = Array.isArray(resp) ? resp : resp?.items ?? resp?.stops ?? [];
              return { ok: true, people: [], stops: list };
            }
          );

          if (!alive) return;

          if (data && data.ok) {
            const p = Array.isArray(data.people) ? data.people : [];
            const st = Array.isArray(data.stops) ? data.stops : [];

            setRemote({
              shiftId: Number(shiftId || 0) || null,
              loadedAt: Date.now(),
              stops: st.map((s) => ({
                id: String(s?.id ?? ""),
                title: String(s?.title ?? s?.name ?? ""),
                lat: typeof s?.lat === "number" ? s.lat : (typeof s?.stopLat === "number" ? s.stopLat : null),
                lng: typeof s?.lng === "number" ? s.lng : (typeof s?.stopLng === "number" ? s.stopLng : null),
                count: (s?.previewCount ?? s?.assignmentCount ?? s?.passengerCount ?? s?.count ?? null),
                assignmentCount: (s?.assignmentCount ?? null),
                passengerCount: (s?.passengerCount ?? null),
              })),
              people: p.map((x) => ({
                id: String(x?.id ?? ""),
                name: String(x?.fullName ?? ""),
                lat: typeof x?.homeLat === "number" ? x.homeLat : null,
                lng: typeof x?.homeLng === "number" ? x.homeLng : null,
              })),
              summary: data?.summary ?? null,
              pathPoints: Array.isArray(data?.path?.points) ? data.path.points : null,
              source: data?.path?.source ?? null,
              shift: data?.shift ?? null,
              err: "",
            });
          } else {
            setRemote((s) => ({ ...s, shiftId: Number(shiftId || 0) || null, loadedAt: Date.now(), stops: null, people: null, summary: null, pathPoints: null, source: null, shift: null }));
          }
        } catch (e) {
          if (!alive) return;
          setRemote((s) => ({
            ...s,
            shiftId: Number(shiftId || 0) || null,
            loadedAt: Date.now(),
            stops: null,
            people: null,
            summary: null,
            pathPoints: null,
            source: null,
            shift: null,
            err: e?.message || String(e),
          }));
        }
      })();
    }, 220);

    return () => { alive = false; controller.abort(); clearTimeout(timer); };
  }, [open, shiftId, token, remote?.shiftId, remote?.loadedAt, remote?.err]);

  const effStops = useMemo(() => remote.stops ?? stops ?? [], [remote.stops, stops]);
  const effPeople = useMemo(() => remote.people ?? people ?? [], [remote.people, people]);
  const effSummary = remote.summary ?? previewSummary ?? null;
  const effPathPoints = remote.pathPoints ?? previewPathPoints ?? null;
  const effSource = remote.source ?? previewSource ?? null;
  const effShift = remote.shift ?? previewShift ?? null;

  const stopPts = (effStops || []).filter((s) => typeof s?.lat === "number" && typeof s?.lng === "number");

const stopsForTimeline = useMemo(() => {
  return (stopPts || []).map((s, i) => ({
    ...s,
    order: Number(s?.order || 0) || (i + 1),
    name: s?.title || `Durak ${i + 1}`,
    state: s?.state || "PENDING",
  }));
}, [stopPts]);

const nextStopId = stopsForTimeline?.[0]?.id ?? null;

function scrollToStopRow(stopId) {
  try {
    const id = `stoprow-${String(stopId)}`;
    const el = document.getElementById(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setSelectedStopId(stopId);
  } catch { /* no-op: selected stop may not exist in DOM yet */ }
}
  const peoplePts = (effPeople || [])
    .filter((p) => typeof p?.lat === "number" && typeof p?.lng === "number")
    .map((p) => ({ lat: p.lat, lng: p.lng }));

  const pathPts = (effPathPoints || [])
    .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => ({ lat: p.lat, lng: p.lng }));

  const linePts = useMemo(() => {
    if (pathPts.length >= 2) return pathPts;
    if (stopPts.length >= 2) return stopPts.map((s) => ({ lat: s.lat, lng: s.lng }));
    return [];
  }, [pathPts, stopPts]);

  const routeQuality = useMemo(
    () => buildRouteQuality(effSummary, effSource, stopPts, effPeople),
    [effSummary, effSource, stopPts, effPeople]
  );
  const allStopCountsZero = useMemo(
    () => (stopPts || []).every((s) => Math.max(0, Number(s?.count || 0)) === 0),
    [stopPts]
  );

  const effectiveRequiredPax = useMemo(
    () => Math.max(0, Number(effSummary?.totalPassengerCount || 0), Number(effShift?.requiredPaxOverride || 0)),
    [effSummary, effShift]
  );

  const organizationLikePreview = useMemo(
    () => effectiveRequiredPax > 0 && stopPts.length > 0 && allStopCountsZero,
    [effectiveRequiredPax, stopPts.length, allStopCountsZero]
  );


  const bounds = useMemo(() => {
    const pts = (linePts.length ? linePts : stopPts.map((s) => ({ lat: s.lat, lng: s.lng })));
    if (!pts.length) return null;
    return latLngBounds(pts.map((p) => [p.lat, p.lng]));
  }, [linePts, stopPts]);

  const center = useMemo(() => {
    const p = (linePts[0] ?? stopPts[0]);
    return p ? [p.lat, p.lng] : [41.015, 28.979];
  }, [linePts, stopPts]);

  const startPt = linePts.length ? linePts[0] : null;
  const endPt = linePts.length ? linePts[linePts.length - 1] : null;
  const showEnd = endPt && startPt && (Math.abs(endPt.lat - startPt.lat) > 1e-9 || Math.abs(endPt.lng - startPt.lng) > 1e-9);

  const previewNavStops = useMemo(() => {
    const baseStops = (stopPts || []).map((s) => ({
      ...s,
      lat: Number(s.lat),
      lng: Number(s.lng),
    })).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && !(Math.abs(s.lat) < 1e-9 && Math.abs(s.lng) < 1e-9));

    const hubLat = Number(effShift?.hubLat);
    const hubLng = Number(effShift?.hubLng);
    const hasHub = Number.isFinite(hubLat) && Number.isFinite(hubLng) && !(Math.abs(hubLat) < 1e-9 && Math.abs(hubLng) < 1e-9);
    const hubStop = hasHub ? { id: '__hub__', title: 'Hub', lat: hubLat, lng: hubLng } : null;

    const direction = String(effSummary?.direction || effShift?.direction || '').toUpperCase();
    const pattern = String(effSummary?.pattern || effShift?.pattern || '').toUpperCase();

    if (!hubStop) return baseStops;
    if (pattern === 'LOOP') return [hubStop, ...baseStops, hubStop];
    if (direction === 'OUTBOUND') return [hubStop, ...baseStops];
    return [...baseStops, hubStop];
  }, [stopPts, effShift, effSummary]);

  const canOpenExternalNav = previewNavStops.length >= 2;

  function openPreviewExternalNavigation() {
    if (!canOpenExternalNav) return;
    openFullRouteNavigation(previewNavStops, null);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 60,
        background: "rgba(0,0,0,0.55)",
      }}
    >
      <div className="card" style={{ width: "min(1200px, 96vw)", maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>{title || "Rota/Durak Önizleme"}</h3>
            {subtitle ? <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose}>Kapat</button>
        </div>

        {remote.err ? <div className="card err" style={{ marginTop: 12 }}>{remote.err}</div> : null}

        <div className="muted" style={{ marginTop: 8 }}>
          Durak: {stopPts.length}
          {effectiveRequiredPax > 0 ? ` • ${organizationLikePreview ? "Tahmini Kişi" : "Toplam Kişi"}: ${effectiveRequiredPax}` : ""}
          {peoplePts.length ? ` • Personel (koordinatlı): ${peoplePts.length}` : ""}
          {organizationLikePreview ? " • Ziyaret noktası önizlemesi" : ""}
        </div>

        {effSummary ? (
          <div className="card" style={{ marginTop: 12, padding: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <b>Özet</b>
              <span className="muted">•</span>
              <span className="muted">Tip: {effSummary.direction}/{effSummary.pattern}{effSummary.isLoop ? " (LOOP)" : ""}</span>
              <span className="muted">•</span>
              <span className="muted">Kaynak: {routeQuality.sourceLabel}</span>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              <div>Durak (hub hariç): <b>{routeQuality.stopCountWithoutHub}</b></div>
              <div>Durak (hub dahil): <b>{routeQuality.stopCountWithHub}</b></div>
              <div>{organizationLikePreview ? "Tahmini kişi" : "Kişi"}: <b>{effectiveRequiredPax || Number(stopPts.reduce((sum, s) => sum + Number(s.count ?? 0), 0))}</b></div>
              <div>KM (tahmini): <b>{Number(effSummary?.distanceKmEstimated || 0).toFixed(2)}</b></div>
              <div>Süre (tahmini): <b>{Number(effSummary?.durationMinEstimated || 0)}</b> dk</div>

              {effSummary?.distanceKmLearned != null ? (
                <>
                  <div>KM (learned): <b>{Number(effSummary?.distanceKmLearned || 0).toFixed(2)}</b></div>
                  <div>Süre (learned): <b>{Number(effSummary?.durationMinLearned || 0)}</b> dk</div>
                  <div className="muted">n={effSummary?.learnedSampleCount || 0}</div>
                </>
              ) : null}
            </div>

            <div className="card" style={{ marginTop: 10, padding: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <b>Rota Kalitesi</b>
                <span className="muted">•</span>
                <span className="muted">Kaynak: {routeQuality.sourceLabel}</span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                <div>Tekil durak: <b>{routeQuality.singletonCount}</b></div>
                <div>Review etkisi: <b>{routeQuality.reviewCount}</b></div>
                <div>Başlangıç: <b>{effSummary?.startLabel || "-"}</b></div>
                <div>Bitiş: <b>{effSummary?.endLabel || "-"}</b></div>
              </div>
              <div className="muted" style={{ marginTop: 8 }}>
                {routeQuality.qualityNotes.join(" • ")}
              </div>
            </div>

            {effSummary?.warning ? (
              <div className="muted" style={{ marginTop: 8 }}>
                Uyarı: {String(effSummary?.warning)}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button
            type="button"
            className="btn sm"
            onClick={openPreviewExternalNavigation}
            disabled={!canOpenExternalNav}
            title={!canOpenExternalNav ? "Navigasyon için en az 2 nokta gerekir." : ""}
          >
            Tam Rotayı Dış Navigasyonda Aç
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, alignItems: "start", marginTop: 12 }}>
          {/* Mini-map */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>Mini Map</h3>

            {bounds ? (
              <div style={{ width: "100%", height: 420, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%" }} scrollWheelZoom={false}>
                  <FitBounds bounds={bounds} />
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {linePts.length >= 2 ? (
                    <Polyline positions={linePts.map((p) => [p.lat, p.lng])} />
                  ) : null}

                  {/* Stops */}
                  {stopPts.map((s, i) => (
                    <CircleMarker key={s.id || i} center={[s.lat, s.lng]} radius={8}>
                      <Tooltip permanent direction="right" offset={[10, 0]} opacity={0.9}>
                        {i + 1}
                      </Tooltip>
                    </CircleMarker>
                  ))}

                  {/* Start / End */}
                  {startPt ? (
                    <CircleMarker center={[startPt.lat, startPt.lng]} radius={10}>
                      <Tooltip permanent direction="left" offset={[-10, 0]} opacity={0.9}>
                        S
                      </Tooltip>
                    </CircleMarker>
                  ) : null}

                  {showEnd ? (
                    <CircleMarker center={[endPt.lat, endPt.lng]} radius={10}>
                      <Tooltip permanent direction="left" offset={[-10, 0]} opacity={0.9}>
                        E
                      </Tooltip>
                    </CircleMarker>
                  ) : null}
                </MapContainer>
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>
                Gösterilecek koordinat yok.
              </div>
            )}

            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Leaflet mini-harita: Duraklar (1..N) ve rota çizgisi. S=Start, E=End.
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Not: Bu önizleme kuş uçuşu/mini görünüm mantığındadır. Kesin rota, km ve dönüşler için “Tam Rotayı Dış Navigasyonda Aç” kullanın.
            </div>
          </div>

          
{/* Mini Timeline (M74.3) */}
<div className="card" style={{ margin: 0, marginBottom: 12, padding: 10 }}>
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    <b>Mini Timeline</b>
    <span className="muted" style={{ fontSize: 12 }}>Chip'e tıkla → listede o durağa git</span>
  </div>
  <div style={{ marginTop: 8 }}>
    <StopTimeline
      stops={stopsForTimeline}
      nextStopId={nextStopId}
      selectedStopId={selectedStopId}
      compact
      onSelect={(s) => scrollToStopRow(s?.id)}
    />
  </div>
</div>          {/* Stops list */}
          <div className="card" style={{ margin: 0, overflowX: "auto" }}>
            <h3 style={{ marginTop: 0 }}>Durak Listesi</h3>
            {stopPts.length ? (
              <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Başlık</th>
                    <th>Koordinat</th>
                    <th>{organizationLikePreview ? "Not" : "Kişi"}</th>
                  </tr>
                </thead>
                <tbody>
                  {stopPts.map((s, i) => (
                    <tr key={s.id || i} id={`stoprow-${s.id || i}`} style={selectedStopId && String(selectedStopId) === String(s.id || i) ? { outline: "2px solid rgba(245,158,11,.55)" } : undefined}>
                      <td className="muted">{i + 1}</td>
                      <td>{s.title || `Durak ${i + 1}`}</td>
                      <td className="muted">
                        {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                      </td>
                      <td className="muted">{organizationLikePreview ? "Ziyaret noktası" : (s.count != null ? s.count : "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted">Durak yok.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
