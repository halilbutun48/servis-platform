// web/src/components/RoutePreviewModal.jsx
import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";

import { api } from "../api";
import { apiOr404Fallback } from "../utils/apiFallback";

function FitBounds({ bounds }) {
  const map = useMap();

  useEffect(() => {
    // Map is in a modal; make sure Leaflet measures size correctly.
    const t = setTimeout(() => {
      try { map.invalidateSize(); } catch {}
      try {
        if (bounds) map.fitBounds(bounds, { padding: [24, 24] });
      } catch {}
    }, 50);

    return () => clearTimeout(t);
  }, [map, bounds]);

  return null;
}

export default function RoutePreviewModal({ open, onClose, title, shiftId, stops, people }) {
  if (!open) return null;

  const [remote, setRemote] = useState({
    stops: null,
    people: null,
    summary: null,
    pathPoints: null,
    source: null,
    err: "",
  });

  useEffect(() => {
    if (!open) return;
    if (!shiftId) return;

    let alive = true;
    setRemote((s) => ({ ...s, err: "" }));

    (async () => {
      try {
        const data = await apiOr404Fallback(
          async () => await api(`/api/shifts/${shiftId}/route-preview`),
          // 404 fallback: legacy /stops endpoint
          async () => {
            const resp = await api(`/api/shifts/${shiftId}/stops`);
            const list = Array.isArray(resp) ? resp : resp?.items ?? resp?.stops ?? [];
            return { ok: true, people: [], stops: list };
          }
        );

        if (!alive) return;

        if (data && data.ok) {
          const p = Array.isArray(data.people) ? data.people : [];
          const st = Array.isArray(data.stops) ? data.stops : [];

          setRemote({
            stops: st.map((s) => ({
              id: String(s?.id ?? ""),
              title: String(s?.title ?? s?.name ?? ""),
              lat: typeof s?.lat === "number" ? s.lat : (typeof s?.stopLat === "number" ? s.stopLat : null),
              lng: typeof s?.lng === "number" ? s.lng : (typeof s?.stopLng === "number" ? s.stopLng : null),
              count: (s?.assignmentCount ?? s?.count ?? null),
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
            err: "",
          });
        } else {
          setRemote((s) => ({ ...s, stops: null, people: null, summary: null, pathPoints: null, source: null }));
        }
      } catch (e) {
        if (!alive) return;
        setRemote((s) => ({
          ...s,
          stops: null,
          people: null,
          summary: null,
          pathPoints: null,
          source: null,
          err: e?.message || String(e),
        }));
      }
    })();

    return () => { alive = false; };
  }, [open, shiftId]);

  const effStops = remote.stops ?? stops ?? [];
  const effPeople = remote.people ?? people ?? [];

  const stopPts = (effStops || []).filter((s) => typeof s?.lat === "number" && typeof s?.lng === "number");
  const peoplePts = (effPeople || [])
    .filter((p) => typeof p?.lat === "number" && typeof p?.lng === "number")
    .map((p) => ({ lat: p.lat, lng: p.lng }));

  const pathPts = (remote.pathPoints || [])
    .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => ({ lat: p.lat, lng: p.lng }));

  const linePts = useMemo(() => {
    if (pathPts.length >= 2) return pathPts;
    if (stopPts.length >= 2) return stopPts.map((s) => ({ lat: s.lat, lng: s.lng }));
    return [];
  }, [pathPts, stopPts]);

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
          <h3 style={{ margin: 0 }}>{title || "Rota/Durak Önizleme"}</h3>
          <button type="button" onClick={onClose}>Kapat</button>
        </div>

        {remote.err ? <div className="card err" style={{ marginTop: 12 }}>{remote.err}</div> : null}

        <div className="muted" style={{ marginTop: 8 }}>
          Durak: {stopPts.length} • Personel (koordinatlı): {peoplePts.length}
        </div>

        {remote.summary ? (
          <div className="card" style={{ marginTop: 12, padding: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <b>Özet</b>
              <span className="muted">•</span>
              <span className="muted">Tip: {remote.summary.direction}/{remote.summary.pattern}{remote.summary.isLoop ? " (LOOP)" : ""}</span>
              <span className="muted">•</span>
              <span className="muted">Kaynak: {remote.source || "ESTIMATED"}</span>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              <div>Durak: <b>{remote.summary.stopCount ?? stopPts.length}</b></div>
              <div>KM (tahmini): <b>{Number(remote.summary.distanceKmEstimated || 0).toFixed(2)}</b></div>
              <div>Süre (tahmini): <b>{Number(remote.summary.durationMinEstimated || 0)}</b> dk</div>

              {remote.summary.distanceKmLearned != null ? (
                <>
                  <div>KM (learned): <b>{Number(remote.summary.distanceKmLearned || 0).toFixed(2)}</b></div>
                  <div>Süre (learned): <b>{Number(remote.summary.durationMinLearned || 0)}</b> dk</div>
                  <div className="muted">n={remote.summary.learnedSampleCount || 0}</div>
                </>
              ) : null}
            </div>

            {remote.summary.warning ? (
              <div className="muted" style={{ marginTop: 8 }}>
                Uyarı: {String(remote.summary.warning)}
              </div>
            ) : null}
          </div>
        ) : null}

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
          </div>

          {/* Stops list */}
          <div className="card" style={{ margin: 0, overflowX: "auto" }}>
            <h3 style={{ marginTop: 0 }}>Durak Listesi</h3>
            {stopPts.length ? (
              <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Başlık</th>
                    <th>Koordinat</th>
                    <th>Kişi</th>
                  </tr>
                </thead>
                <tbody>
                  {stopPts.map((s, i) => (
                    <tr key={s.id || i}>
                      <td className="muted">{i + 1}</td>
                      <td>{s.title || `Durak ${i + 1}`}</td>
                      <td className="muted">
                        {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                      </td>
                      <td className="muted">{s.count != null ? s.count : "-"}</td>
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
