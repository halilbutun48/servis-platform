import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

export default function UsersPanel() {
  const { token } = useSession();

  const [companies, setCompanies] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [createForm, setCreateForm] = useState({
    role: "COMPANY",
    email: "",
    fullName: "",
    phone: "",
    companyId: "",
    roomId: "",
    password: "",
  });

  const [edit, setEdit] = useState(null); // {id, fullName, phone, companyId, roomId}
  const [lastPw, setLastPw] = useState(null); // {email, password}

  async function loadRefs() {
    const [c, r] = await Promise.all([api("/api/companies?all=0", { token }), api("/api/rooms?take=500", { token })]);
    setCompanies(c.items || []);
    setRooms(r.items || []);
  }

  async function loadUsers() {
    setErr("");
    setBusy(true);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (role) qs.set("role", role);
      qs.set("take", "300");
      const res = await api(`/api/admin/users?${qs.toString()}`, { token });
      setItems(res.items || []);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadRefs();
        await loadUsers();
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scopeLabel = useMemo(() => {
    const cMap = new Map((companies || []).map((x) => [Number(x.id), x.name]));
    const rMap = new Map((rooms || []).map((x) => [Number(x.id), x.name]));
    return (u) => {
      if (u.role === "COMPANY") return `Company #${u.companyId} ${cMap.get(Number(u.companyId)) || ""}`.trim();
      if (u.role === "ROOM") return `Room #${u.roomId} ${rMap.get(Number(u.roomId)) || ""}`.trim();
      if (u.role === "DRIVER") return u.roomId ? `Room #${u.roomId}` : "-";
      if (u.role === "PERSONEL") return u.companyId ? `Company #${u.companyId}` : "-";
      return "-";
    };
  }, [companies, rooms]);

  async function createUser() {
    setErr("");
    setBusy(true);
    try {
      const body = {
        role: createForm.role,
        email: String(createForm.email || "").trim().toLowerCase(),
        fullName: String(createForm.fullName || "").trim(),
        phone: String(createForm.phone || "").trim() || undefined,
        password: String(createForm.password || "").trim() || undefined,
      };

      if (body.role === "COMPANY") {
        const cid = Number(createForm.companyId);
        if (!cid) throw new Error("Company seç");
        body.companyId = cid;
      }
      if (body.role === "ROOM") {
        const rid = Number(createForm.roomId);
        if (!rid) throw new Error("Room seç");
        body.roomId = rid;
      }

      const r = await api("/api/admin/users", { method: "POST", body, token });
      setLastPw({ email: r?.user?.email || body.email, password: r?.tempPassword || "" });
      setCreateForm({ role: "COMPANY", email: "", fullName: "", phone: "", companyId: "", roomId: "", password: "" });
      await loadUsers();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function disableUser(id) {
    const ok = window.confirm(`#${id} kullanıcı disable edilsin mi?`);
    if (!ok) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/admin/users/${id}/disable`, { method: "POST", token });
      await loadUsers();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function enableUser(id) {
    const ok = window.confirm(`#${id} kullanıcı enable edilsin mi?`);
    if (!ok) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/admin/users/${id}/enable`, { method: "POST", token });
      await loadUsers();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }


  async function resetPw(id) {
    const ok = window.confirm(`#${id} için şifre resetlensin mi? Yeni şifre 1 kez gösterilecek.`);
    if (!ok) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api(`/api/admin/users/${id}/reset-password`, { method: "POST", token });
      setLastPw({ email: r?.user?.email || `#${id}`, password: r?.tempPassword || "" });
      await loadUsers();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!edit?.id) return;
    setBusy(true);
    setErr("");
    try {
      const body = {
        fullName: String(edit.fullName || "").trim(),
        phone: String(edit.phone || "").trim() || null,
      };
      if (edit.role === "COMPANY") body.companyId = edit.companyId ? Number(edit.companyId) : null;
      if (edit.role === "ROOM") body.roomId = edit.roomId ? Number(edit.roomId) : null;
      await api(`/api/admin/users/${edit.id}`, { method: "PUT", body, token });
      setEdit(null);
      await loadUsers();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: 0, marginBottom: 8 }}>Kullanıcılar</h2>
      <div style={{ opacity: 0.75, marginBottom: 16 }}>
        SUPER_ADMIN → Room/Company login hesaplarını oluşturur; gerektiğinde şifre reset/disable yapar.
      </div>

      {err ? <div style={{ color: "#ff7b7b", marginBottom: 12, whiteSpace: "pre-wrap" }}>{err}</div> : null}

      {lastPw ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Yeni şifre (1 kez göster)</div>
          <div className="muted">{lastPw.email}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ padding: "6px 10px", borderRadius: 10, background: "#111520" }}>{lastPw.password || "-"}</code>
            <button
              className="btn sm"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(String(lastPw.password || ""));
                } catch {}
              }}
            >
              Kopyala
            </button>
            <button className="btn sm" onClick={() => setLastPw(null)}>
              Kapat
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Yeni kullanıcı oluştur</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <label className="muted">
            Rol
            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((x) => ({
                  ...x,
                  role: e.target.value,
                  companyId: "",
                  roomId: "",
                }))
              }
            >
              <option value="COMPANY">COMPANY</option>
              <option value="ROOM">ROOM</option>
            </select>
          </label>

          {createForm.role === "COMPANY" ? (
            <label className="muted">
              Company
              <select value={createForm.companyId} onChange={(e) => setCreateForm((x) => ({ ...x, companyId: e.target.value }))}>
                <option value="">Seç</option>
                {(companies || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="muted">
              Room
              <select value={createForm.roomId} onChange={(e) => setCreateForm((x) => ({ ...x, roomId: e.target.value }))}>
                <option value="">Seç</option>
                {(rooms || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="muted">
            Ad Soyad
            <input value={createForm.fullName} onChange={(e) => setCreateForm((x) => ({ ...x, fullName: e.target.value }))} />
          </label>
          <label className="muted">
            Email
            <input value={createForm.email} onChange={(e) => setCreateForm((x) => ({ ...x, email: e.target.value }))} />
          </label>
          <label className="muted">
            Telefon (ops.)
            <input value={createForm.phone} onChange={(e) => setCreateForm((x) => ({ ...x, phone: e.target.value }))} />
          </label>
          <label className="muted">
            Şifre (boşsa otomatik üretir)
            <input type="text" value={createForm.password} onChange={(e) => setCreateForm((x) => ({ ...x, password: e.target.value }))} />
          </label>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" disabled={busy} onClick={createUser}>
            Oluştur
          </button>
          <button className="btn" disabled={busy} onClick={loadRefs}>
            Refs Yenile
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ara (email / ad)"
            style={{ minWidth: 260, padding: 10, borderRadius: 10, border: "1px solid #2b2f3a" }}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #2b2f3a" }}>
            <option value="">Tüm roller</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ROOM">ROOM</option>
            <option value="COMPANY">COMPANY</option>
            <option value="DRIVER">DRIVER</option>
            <option value="PERSONEL">PERSONEL</option>
          </select>
          <button className="btn" disabled={busy} onClick={loadUsers}>
            Yenile
          </button>
        </div>

        <div style={{ marginTop: 12, border: "1px solid #222633", borderRadius: 14, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1.2fr 120px 1fr 1fr 120px 240px",
              padding: "10px 12px",
              background: "#111520",
              fontWeight: 600,
            }}
          >
            <div>ID</div>
            <div>Email</div>
            <div>Rol</div>
            <div>Ad Soyad</div>
            <div>Scope</div>
            <div>Durum</div>
            <div>Aksiyon</div>
          </div>

          {(items || []).map((u) => (
            <div
              key={u.id}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1.2fr 120px 1fr 1fr 120px 240px",
                padding: "10px 12px",
                borderTop: "1px solid #222633",
                alignItems: "center",
              }}
            >
              <div style={{ opacity: 0.85 }}>{u.id}</div>
              <div style={{ wordBreak: "break-word" }}>{u.email}</div>
              <div>
                <Pill>{u.role}</Pill>
              </div>
              <div>{u.fullName}</div>
              <div style={{ opacity: 0.9 }}>{scopeLabel(u)}</div>
              <div>{u.disabled ? <span style={{ color: "#ff7b7b" }}>DISABLED</span> : <span style={{ color: "#7bffb3" }}>ACTIVE</span>}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn sm" disabled={busy} onClick={() => resetPw(u.id)}>
                  Reset PW
                </button>
                {u.disabled ? (
                <button className="btn sm" disabled={busy} onClick={() => enableUser(u.id)}>
                  Enable
                </button>
              ) : (
                <button className="btn sm" disabled={busy} onClick={() => disableUser(u.id)}>
                  Disable
                </button>
              )}
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() =>
                    setEdit({
                      id: u.id,
                      role: u.role,
                      fullName: u.fullName || "",
                      phone: u.phone || "",
                      companyId: u.companyId || "",
                      roomId: u.roomId || "",
                    })
                  }
                >
                  Düzenle
                </button>
              </div>
            </div>
          ))}

          {(!items || items.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>Kayıt yok</div>}
        </div>
      </div>

      {edit ? (
        <div className="modal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div className="card" style={{ width: "min(720px, 92vw)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>Kullanıcı Düzenle</div>
                <div className="muted">#{edit.id} • {edit.role}</div>
              </div>
              <button className="btn sm" onClick={() => setEdit(null)}>
                Kapat
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <label className="muted">
                Ad Soyad
                <input value={edit.fullName} onChange={(e) => setEdit((x) => ({ ...x, fullName: e.target.value }))} />
              </label>
              <label className="muted">
                Telefon
                <input value={edit.phone} onChange={(e) => setEdit((x) => ({ ...x, phone: e.target.value }))} />
              </label>

              {edit.role === "COMPANY" ? (
                <label className="muted">
                  Company
                  <select value={edit.companyId} onChange={(e) => setEdit((x) => ({ ...x, companyId: e.target.value }))}>
                    <option value="">Seç</option>
                    {(companies || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {edit.role === "ROOM" ? (
                <label className="muted">
                  Room
                  <select value={edit.roomId} onChange={(e) => setEdit((x) => ({ ...x, roomId: e.target.value }))}>
                    <option value="">Seç</option>
                    {(rooms || []).map((r) => (
                      <option key={r.id} value={r.id}>
                        #{r.id} {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" disabled={busy} onClick={saveEdit}>
                Kaydet
              </button>
              <button className="btn" disabled={busy} onClick={() => setEdit(null)}>
                İptal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
