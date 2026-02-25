// web/src/components/ShiftPersonelTable.jsx
function normalizeCoord(v, kind) {
  if (v === null || v === undefined) return null;
  let n = null;
  if (typeof v === "number") n = v;
  else {
    const s0 = String(v).trim();
    if (!s0) return null;
    const s = s0.replace(",", ".");
    const nn = Number(s);
    if (Number.isFinite(nn)) n = nn;
    else {
      const pf = parseFloat(s);
      if (Number.isFinite(pf)) n = pf;
    }
  }

  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs > 1000) {
    let scaled = n / 1e6;
    if (Math.abs(scaled) > 180) scaled = n / 1e5;
    if (Math.abs(scaled) > 180) scaled = n / 1e4;
    n = scaled;
  }
  if (kind === "lat" && Math.abs(n) > 90) return null;
  if (kind === "lng" && Math.abs(n) > 180) return null;
  return n;
}

export default function ShiftPersonelTable({ people, onRemove, onUpdate }) {
  const list = Array.isArray(people) ? people : [];

  return (
    <table className="tbl" style={{ whiteSpace: "nowrap" }}>
      <thead>
        <tr>
          <th>Ad Soyad</th>
          <th>Tel</th>
          <th>Adres</th>
          <th>Lat</th>
          <th>Lng</th>
          <th>Geo</th>
          <th>Aksiyon</th>
        </tr>
      </thead>
      <tbody>
        {list.length ? (
          list.map((p) => (
            <tr key={p.id}>
              <td>
                <input
                  value={p.name || ""}
                  onChange={(e) => onUpdate?.(p.id, { name: e.target.value })}
                  placeholder="Ad Soyad"
                />
              </td>
              <td>
                <input
                  value={p.phone || ""}
                  onChange={(e) => onUpdate?.(p.id, { phone: e.target.value })}
                  placeholder="05xx..."
                />
              </td>
              <td style={{ minWidth: 320 }}>
                <input
                  value={p.address || ""}
                  onChange={(e) => onUpdate?.(p.id, { address: e.target.value })}
                  placeholder="Adres"
                />
              </td>
              <td style={{ width: 120 }}>
                <input
                  value={p.lat ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const lat = raw === "" ? null : normalizeCoord(raw, "lat");
                    onUpdate?.(p.id, { lat });
                  }}
                  placeholder="lat"
                />
              </td>
              <td style={{ width: 120 }}>
                <input
                  value={p.lng ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const lng = raw === "" ? null : normalizeCoord(raw, "lng");
                    onUpdate?.(p.id, { lng });
                  }}
                  placeholder="lng"
                />
              </td>
              <td className="muted">{p.geoStatus || "-"}</td>
              <td>
                <button type="button" className="btn" onClick={() => onRemove?.(p.id)}>
                  Sil
                </button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={7} className="muted">
              Henüz personel yok.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
