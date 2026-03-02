import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

export default function RegionsPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [edit, setEdit] = useState(null); // {id,name}
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api("/api/admin/regions", { token });
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
    const n = name.trim();
    if (!n) return setErr("İl adı gerekli");

    setBusy(true);
    setErr("");
    try {
      await api("/api/admin/regions", { method: "POST", body: { name: n }, token });
      setName("");
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!edit?.id) return;
    const n = (edit.name || "").trim();
    if (!n) return setErr("İl adı gerekli");

    setBusy(true);
    setErr("");
    try {
      await api(`/api/admin/regions/${edit.id}`, { method: "PUT", body: { name: n }, token });
      setEdit(null);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    const ok = window.confirm(`#${id} ili silinsin mi? (boş olmalı)`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/admin/regions/${id}`, { method: "DELETE", token });
      if (edit?.id === id) setEdit(null);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: 0, marginBottom: 8 }}>İller (Region)</h2>
      <div style={{ opacity: 0.75, marginBottom: 16 }}>
        SUPER_ADMIN illeri tanımlar. Company/Room listelerinde filtre ve atama için kullanılır.
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="İl adı (örn: İstanbul)"
          style={{ minWidth: 260, padding: 10, borderRadius: 10, border: "1px solid #2b2f3a" }}
        />
        <button onClick={create} disabled={busy} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Ekle
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
            gridTemplateColumns: "80px 1fr 240px",
            padding: "10px 12px",
            background: "#111520",
            fontWeight: 600,
          }}
        >
          <div>ID</div>
          <div>Ad</div>
          <div>Aksiyon</div>
        </div>

        {(items || []).map((r) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 240px",
              padding: "10px 12px",
              borderTop: "1px solid #222633",
              alignItems: "center",
            }}
          >
            <div style={{ opacity: 0.85 }}>{r.id}</div>
            <div>
              {edit?.id === r.id ? (
                <input
                  value={edit.name}
                  onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))}
                  style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #2b2f3a" }}
                />
              ) : (
                r.name
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {edit?.id === r.id ? (
                <>
                  <button className="btn sm" disabled={busy} onClick={saveEdit}>
                    Kaydet
                  </button>
                  <button className="btn sm" disabled={busy} onClick={() => setEdit(null)}>
                    İptal
                  </button>
                </>
              ) : (
                <>
                  <button className="btn sm" disabled={busy} onClick={() => setEdit({ id: r.id, name: r.name })}>
                    Düzenle
                  </button>
                  <button className="btn sm" disabled={busy} onClick={() => del(r.id)}>
                    Sil
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {(!items || items.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>Kayıt yok</div>}
      </div>

      <div className="muted" style={{ marginTop: 12 }}>
        Not: Bir ili silebilmek için o ile bağlı ACTIVE/PASSIVE Company/Room olmamalı.
      </div>
    </div>
  );
}
