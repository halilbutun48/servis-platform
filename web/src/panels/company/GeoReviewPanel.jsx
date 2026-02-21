// web/src/panels/company/GeoReviewPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

export default function GeoReviewPanel() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    setBusy(true);
    setErr("");
    try {
      const r = await api("/api/company/personels?geoStatus=NEEDS_REVIEW");
      setItems(Array.isArray(r?.items) ? r.items : []);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => {
      const t = `${p.fullName || ""} ${p.phone || ""} ${p.homeAddress || ""}`.toLowerCase();
      return t.includes(s);
    });
  }, [items, q]);

  async function saveRow(id, lat, lng) {
    setErr("");
    await api(`/api/company/personels/${id}/location`, {
      method: "PUT",
      body: { lat: Number(lat), lng: Number(lng), geoManualOverride: true, geoStatus: "OK" },
    });
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Geocode Review</div>
        <div className="muted">NEEDS_REVIEW personelleri burada düzeltip OK yapabilirsin.</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            placeholder="Ara: ad / tel / adres"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <button onClick={load} disabled={busy}>
            {busy ? "..." : "Yenile"}
          </button>
          <div className="muted">
            Kayıt: <b>{filtered.length}</b>
          </div>
        </div>

        {err ? (
          <div className="card err" style={{ marginTop: 12 }}>
            {err}
          </div>
        ) : null}

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>Adres</th>
                <th>Lat</th>
                <th>Lng</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <GeoRow key={p.id} idx={idx} p={p} onSave={saveRow} setErr={setErr} />
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 12 }}>
                    NEEDS_REVIEW kayıt yok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GeoRow({ idx, p, onSave, setErr }) {
  const [lat, setLat] = useState(p.homeLat ?? "");
  const [lng, setLng] = useState(p.homeLng ?? "");
  const [busy, setBusy] = useState(false);

  const valid = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  return (
    <tr>
      <td>{idx + 1}</td>
      <td>
        <b>{p.fullName}</b>
      </td>
      <td>{p.phone || "-"}</td>
      <td style={{ maxWidth: 360 }}>{p.homeAddress || "-"}</td>
      <td>
        <input value={lat} onChange={(e) => setLat(e.target.value)} style={{ width: 140 }} />
      </td>
      <td>
        <input value={lng} onChange={(e) => setLng(e.target.value)} style={{ width: 140 }} />
      </td>
      <td>
        <button
          disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            setErr("");
            try {
              await onSave(p.id, lat, lng);
            } catch (e) {
              setErr(e?.message || String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "..." : "OK Yap"}
        </button>
      </td>
    </tr>
  );
}
