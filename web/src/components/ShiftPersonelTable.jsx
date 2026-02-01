// web/src/components/ShiftPersonelTable.jsx
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
                  onChange={(e) => onUpdate?.(p.id, { lat: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder="lat"
                />
              </td>
              <td style={{ width: 120 }}>
                <input
                  value={p.lng ?? ""}
                  onChange={(e) => onUpdate?.(p.id, { lng: e.target.value === "" ? null : Number(e.target.value) })}
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
