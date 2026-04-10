import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

export default function RegionsPanel() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null); // {id,name}
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api("/api/admin/regions", {});
      setItems(res.items || []);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const view = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items || [];
    return (items || []).filter((r) => String(r?.name || "").toLowerCase().includes(qq) || String(r?.id || "").includes(qq));
  }, [items, q]);

  async function create() {
    const n = name.trim();
    if (!n) return setErr("İl adı gerekli");

    setBusy(true);
    setErr("");
    try {
      await api("/api/admin/regions", { method: "POST", body: { name: n } });
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
      await api(`/api/admin/regions/${edit.id}`, { method: "PUT", body: { name: n } });
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
      await api(`/api/admin/regions/${id}`, { method: "DELETE" });
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 6 }}>İller (Region)</h2>
          <div style={{ opacity: 0.75 }}>SUPER_ADMIN illeri tanımlar. Company/Room listelerinde filtre ve atama için kullanılır.</div>
        </div>
        <div className="saActions">
          <span className="pill" data-status="COUNT">
            {view.length} kayıt
          </span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="toolbar">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="İl adı (örn: İstanbul)" style={{ minWidth: 260 }} />
          <button className="btn" onClick={create} disabled={busy}>
            Ekle
          </button>

          <div style={{ flex: 1 }} />

          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara (id / ad)" style={{ minWidth: 260 }} />
          <button className="btn" onClick={load} disabled={busy}>
            Yenile
          </button>
        </div>

        {err ? <div style={{ color: "#ff7b7b", marginTop: 12, whiteSpace: "pre-wrap" }}>{err}</div> : null}
      </div>

      <div className="saTable">
        <div className="saHead" style={{ display: "grid", gridTemplateColumns: "80px 1fr 240px", padding: "10px 12px" }}>
          <div>ID</div>
          <div>Ad</div>
          <div>Aksiyon</div>
        </div>

        {(view || []).map((r) => (
          <div key={r.id} className="saRow" style={{ display: "grid", gridTemplateColumns: "80px 1fr 240px", padding: "10px 12px", alignItems: "center" }}>
            <div style={{ opacity: 0.85 }}>{r.id}</div>
            <div>
              {edit?.id === r.id ? (
                <input value={edit.name} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} style={{ width: "100%" }} />
              ) : (
                r.name
              )}
            </div>

            <div className="saActions">
              {edit?.id === r.id ? (
                <>
                  <button className="btn sm primary" disabled={busy} onClick={saveEdit}>
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

        {(!view || view.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>Kayıt yok</div>}
      </div>

      <div className="muted" style={{ marginTop: 12 }}>
        Not: Bir ili silebilmek için o ile bağlı ACTIVE/PASSIVE Company/Room olmamalı.
      </div>
    </div>
  );
}
