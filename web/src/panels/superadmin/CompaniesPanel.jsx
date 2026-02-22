import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

export default function CompaniesPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api("/api/companies?take=200", { token });
      setItems(res.items || []);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    setErr("");
    const n = name.trim();
    if (!n) return setErr("Şirket adı gerekli");
    setBusy(true);
    try {
      await api("/api/companies", { method: "POST", body: { name: n }, token });
      setName("");
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: 0, marginBottom: 8 }}>Şirketler</h2>
      <div style={{ opacity: 0.75, marginBottom: 16 }}>
        SUPER_ADMIN sadece şirket oluşturur/lister (M21). Güncelleme/silme backend eklenince gelir.
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Şirket adı"
          style={{ minWidth: 260, padding: 10, borderRadius: 10, border: "1px solid #2b2f3a" }}
        />
        <button onClick={create} disabled={busy} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Oluştur
        </button>
        <button onClick={load} disabled={busy} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Yenile
        </button>
      </div>

      {err ? <div style={{ color: "#ff7b7b", marginBottom: 12, whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ border: "1px solid #222633", borderRadius: 14, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 220px",
            padding: "10px 12px",
            background: "#111520",
            fontWeight: 600,
          }}
        >
          <div>ID</div>
          <div>Ad</div>
          <div>Oluşturma</div>
        </div>

        {(items || []).map((c) => (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 220px",
              padding: "10px 12px",
              borderTop: "1px solid #222633",
            }}
          >
            <div style={{ opacity: 0.85 }}>{c.id}</div>
            <div>{c.name}</div>
            <div style={{ opacity: 0.75 }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : "-"}</div>
          </div>
        ))}

        {(!items || items.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>Kayıt yok</div>}
      </div>
    </div>
  );
}