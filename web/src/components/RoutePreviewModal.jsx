// web/src/components/RoutePreviewModal.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { apiOr404Fallback } from "../utils/apiFallback";

function bboxFromPoints(points) {
  if (!points.length) return null;
  let minLat = points[0].lat, maxLat = points[0].lat;
  let minLng = points[0].lng, maxLng = points[0].lng;

  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

function project(p, box, w, h, pad) {
  const { minLat, maxLat, minLng, maxLng } = box;

  const dx = Math.max(1e-9, maxLng - minLng);
  const dy = Math.max(1e-9, maxLat - minLat);

  const x = (p.lng - minLng) / dx;
  const y = (maxLat - p.lat) / dy;

  return {
    x: pad + x * (w - 2 * pad),
    y: pad + y * (h - 2 * pad),
  };
}

export default function RoutePreviewModal({ open, onClose, title, shiftId, stops, people }) {
  if (!open) return null;

  const [remote, setRemote] = useState({ stops: null, people: null, summary: null, pathPoints: null, source: null, err: "" });

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
          // Map backend shape -> UI shape
          const p = Array.isArray(data.people) ? data.people : [];
          const st = Array.isArray(data.stops) ? data.stops : [];
          setRemote({
            stops: st.map((s) => ({
              id: String(s?.id ?? ""),
              title: String(s?.title ?? s?.name ?? ""),
              lat: typeof s?.lat === "number" ? s.lat : (typeof s?.stopLat === "number" ? s.stopLat : null),
              lng: typeof s?.lng === "number" ? s.lng : (typeof s?.stopLng === "number" ? s.stopLng : null),
              // M16.2+: backend may send assignmentCount
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
        setRemote((s) => ({ ...s, stops: null, people: null, summary: null, pathPoints: null, source: null, err: e?.message || String(e) }));
      }
    })();

    return () => { alive = false; };
  }, [open, shiftId]);

  const effStops = remote.stops ?? stops ?? [];
  const effPeople = remote.people ?? people ?? [];

  const stopPts = (effStops || []).filter((s) => typeof s?.lat === "number" && typeof s?.lng === "number");
  const pathPts = (remote.pathPoints || [])
    .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => ({ lat: p.lat, lng: p.lng }));

  const peoplePts = (effPeople || [])
    .filter((p) => typeof p?.lat === "number" && typeof p?.lng === "number")
    .map((p) => ({ lat: p.lat, lng: p.lng }));

  const allPts = [...stopPts.map((s) => ({ lat: s.lat, lng: s.lng })), ...peoplePts, ...pathPts];

  const { w, h, pad } = { w: 760, h: 420, pad: 24 };

  const box = useMemo(() => bboxFromPoints(allPts), [allPts]);

  const polyline = useMemo(() => {
    if (!box) return "";
    const linePts = (pathPts.length >= 2)
      ? pathPts
      : stopPts.map((s) => ({ lat: s.lat, lng: s.lng }));

    if (linePts.length < 2) return "";
    return linePts
      .map((p) => {
        const pt = project({ lat: p.lat, lng: p.lng }, box, w, h, pad);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");
  }, [box, pathPts, stopPts, w, h, pad]);

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
          <button type="button" onClick={onClose}>
            Kapat
          </button>
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
            <h3 style={{ marginTop: 0 }}>Mini Map (SVG)</h3>

            {box ? (
              <svg width={w} height={h} style={{ width: "100%", height: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                {/* polyline */}
                {polyline ? (
                  <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
                ) : null}

                {/* people points */}
                {peoplePts.map((p, i) => {
                  const pt = project(p, box, w, h, pad);
                  return <circle key={`p_${i}`} cx={pt.x} cy={pt.y} r="2" fill="currentColor" opacity="0.35" />;
                })}

                {/* stops */}
                {stopPts.map((s, i) => {
                  const pt = project({ lat: s.lat, lng: s.lng }, box, w, h, pad);
                  return (
                    <g key={s.id || i}>
                      <circle cx={pt.x} cy={pt.y} r="6" fill="currentColor" opacity="0.85" />
                      <text x={pt.x + 10} y={pt.y + 4} fontSize="12" opacity="0.9">
                        {String(i + 1)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>
                Gösterilecek koordinat yok.
              </div>
            )}

            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Bu bir “mini önizleme”. Leaflet/GoogleMap entegrasyonu gelince aynı modal gerçek haritaya bağlanabilir.
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
