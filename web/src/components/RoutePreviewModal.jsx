// web/src/components/RoutePreviewModal.jsx
import { useMemo } from "react";

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

export default function RoutePreviewModal({ open, onClose, title, stops, people }) {
  if (!open) return null;

  const stopPts = (stops || []).filter((s) => typeof s?.lat === "number" && typeof s?.lng === "number");
  const peoplePts = (people || [])
    .filter((p) => typeof p?.lat === "number" && typeof p?.lng === "number")
    .map((p) => ({ lat: p.lat, lng: p.lng }));

  const allPts = [...stopPts.map((s) => ({ lat: s.lat, lng: s.lng })), ...peoplePts];

  const { w, h, pad } = { w: 760, h: 420, pad: 24 };

  const box = useMemo(() => bboxFromPoints(allPts), [allPts]);

  const polyline = useMemo(() => {
    if (!box || stopPts.length < 2) return "";
    return stopPts
      .map((s) => {
        const pt = project({ lat: s.lat, lng: s.lng }, box, w, h, pad);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");
  }, [box, stopPts, w, h, pad]);

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

        <div className="muted" style={{ marginTop: 8 }}>
          Durak: {stopPts.length} • Personel (koordinatlı): {peoplePts.length}
        </div>

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
                  return <circle key={`p_${i}`} cx={pt.x} cy={pt.y} r="2" opacity="0.45" />;
                })}

                {/* stops */}
                {stopPts.map((s, i) => {
                  const pt = project({ lat: s.lat, lng: s.lng }, box, w, h, pad);
                  return (
                    <g key={s.id || i}>
                      <circle cx={pt.x} cy={pt.y} r="6" />
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
