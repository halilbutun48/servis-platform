import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import FlowSummaryStrip from "../../components/FlowSummaryStrip";
import ParentChildMiniPanel from "./ParentChildMiniPanel";
import PanelKvkkHint from "../shared/PanelKvkkHint";

function Pill({ children, status }) {
  return (
    <span className="pill" data-status={status || "ROLE"}>
      {children}
    </span>
  );
}

function getRegionContext(item) {
  if (!item) return null;
  const ro = item.regionOwnership || {};
  const regionName = ro.regionName || item.region?.name || null;
  const district = ro.district || item.district || null;
  const regionId = ro.regionId ?? item.regionId ?? null;
  if (regionId == null && !regionName && !district) return null;
  return { regionId, regionName, district, regionKey: ro.regionKey || null };
}

function formatRegionContext(item) {
  const ctx = getRegionContext(item);
  if (!ctx) return "-";
  const parts = [];
  if (ctx.regionName) parts.push(ctx.regionName);
  if (ctx.district) parts.push(ctx.district);
  return parts.length ? parts.join(" / ") : "-";
}

function roleLabel(role) {
  const r = String(role || "-").trim().toUpperCase();
  if (r === "SUPER_ADMIN") return "Süper yönetici";
  if (r === "ROOM") return "Oda";
  if (r === "COMPANY") return "Şirket";
  if (r === "DRIVER") return "Sürücü";
  if (r === "PERSONEL") return "Personel";
  if (r === "PARENT") return "Veli";
  return r;
}

export default function UsersPanel() {
  const { token } = useSession();

  const [companies, setCompanies] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | ACTIVE | DISABLED
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [createForm, setCreateForm] = useState({
    role: "COMPANY",
    username: "",
    email: "",
    fullName: "",
    phone: "",
    companyId: "",
    roomId: "",
    password: "",
  });

  const [edit, setEdit] = useState(null); // {id, role, username, fullName, phone, companyId, roomId}
  const [lastPw, setLastPw] = useState(null); // {login, password}

  const loadRefs = useCallback(async () => {
    const [c, r] = await Promise.all([api("/api/companies?all=0", { token }), api("/api/rooms?take=500", { token })]);
    setCompanies(c.items || []);
    setRooms(r.items || []);
  }, [token]);

  const loadUsers = useCallback(async () => {
    setErr("");
    setBusy(true);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (role) qs.set("role", role);
      qs.set("take", "300");
      const res = await api(`/api/admin/users?${qs.toString()}`, { token });
      setItems(res.items || []);
    } catch {
      setErr("Kullanıcı listesi şu anda okunamadı. Yenileyip tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }, [q, role, token]);

  const loadAll = useCallback(async () => {
    try {
      await loadRefs();
      await loadUsers();
    } catch {
      setErr("Kullanıcı paneli şu anda okunamadı. Yenileyip tekrar deneyin.");
    }
  }, [loadRefs, loadUsers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const companyById = useMemo(() => new Map((companies || []).map((x) => [Number(x.id), x])), [companies]);
  const roomById = useMemo(() => new Map((rooms || []).map((x) => [Number(x.id), x])), [rooms]);

  const scopeLabel = useMemo(() => {
    const cMap = new Map((companies || []).map((x) => [Number(x.id), x.name]));
    const rMap = new Map((rooms || []).map((x) => [Number(x.id), x.name]));
    return (u) => {
      if (u.role === "COMPANY") {
        const company = companyById.get(Number(u.companyId));
        const base = `Company #${u.companyId} ${cMap.get(Number(u.companyId)) || ""}`.trim();
        return company ? `${base} • ${formatRegionContext(company)}` : base;
      }
      if (u.role === "ROOM") {
        const room = roomById.get(Number(u.roomId));
        const base = `Room #${u.roomId} ${rMap.get(Number(u.roomId)) || ""}`.trim();
        return room ? `${base} • ${formatRegionContext(room)}` : base;
      }
      if (u.role === "DRIVER") {
        const room = roomById.get(Number(u.roomId));
        const base = u.roomId ? `Room #${u.roomId}` : "-";
        return room ? `${base} • ${formatRegionContext(room)}` : base;
      }
      if (u.role === "PERSONEL") {
        const company = companyById.get(Number(u.companyId));
        const base = u.companyId ? `Company #${u.companyId}` : "-";
        return company ? `${base} • ${formatRegionContext(company)}` : base;
      }
      if (u.role === "PARENT") return "Parent";
      return "-";
    };
  }, [companies, rooms, companyById, roomById]);

  function userRegionLabel(u) {
    if (u.role === "COMPANY") return formatRegionContext(companyById.get(Number(u.companyId)));
    if (u.role === "ROOM") return formatRegionContext(roomById.get(Number(u.roomId)));
    if (u.role === "DRIVER") return formatRegionContext(roomById.get(Number(u.roomId)));
    if (u.role === "PERSONEL") return formatRegionContext(companyById.get(Number(u.companyId)));
    return "-";
  }

  const view = useMemo(() => {
    const list = items || [];
    if (!statusFilter) return list;
    if (statusFilter === "DISABLED") return list.filter((u) => !!u.disabled);
    if (statusFilter === "ACTIVE") return list.filter((u) => !u.disabled);
    return list;
  }, [items, statusFilter]);

  const summary = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const activeCount = list.filter((u) => !u.disabled).length;
    const disabledCount = list.filter((u) => !!u.disabled).length;
    const rolesCount = new Set(list.map((u) => String(u.role || "-").trim().toUpperCase()).filter(Boolean)).size;
    return {
      total: list.length,
      activeCount,
      disabledCount,
      rolesCount,
    };
  }, [items]);

  async function createUser() {
    setErr("");
    setBusy(true);
    try {
      const body = {
        role: createForm.role,
        username: String(createForm.username || "").trim().toLowerCase(),
        email: String(createForm.email || "").trim().toLowerCase(),
        fullName: String(createForm.fullName || "").trim(),
        phone: String(createForm.phone || "").trim() || undefined,
        password: String(createForm.password || "").trim() || undefined,
      };

      if (!body.username) throw new Error("Kullanıcı adı gir");

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
      // PARENT: scope yok

      const r = await api("/api/admin/users", { method: "POST", body, token });
      setLastPw({ login: r?.user?.username || body.username, password: r?.tempPassword || "" });
      setCreateForm({ role: "COMPANY", username: "", email: "", fullName: "", phone: "", companyId: "", roomId: "", password: "" });
      await loadUsers();
    } catch {
      setErr("Kullanıcı oluşturma işlemi şu anda tamamlanamadı. Yenileyip tekrar deneyin.");
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
    } catch {
      setErr("Kullanıcı pasifleştirme işlemi şu anda tamamlanamadı. Yenileyip tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function enableUser(id) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/admin/users/${id}/enable`, { method: "POST", token });
      await loadUsers();
    } catch {
      setErr("Kullanıcı aktifleştirme işlemi şu anda tamamlanamadı. Yenileyip tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPw(user) {
    const ok = window.confirm(`#${user?.id} için şifre resetlensin mi? Yeni şifre 1 kez gösterilecek.`);
    if (!ok) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api(`/api/admin/users/${user.id}/reset-password`, { method: "POST", token });
      setLastPw({ login: r?.user?.username || user?.username || `#${user.id}`, password: r?.tempPassword || "" });
      await loadUsers();
    } catch {
      setErr("Şifre sıfırlama işlemi şu anda tamamlanamadı. Yenileyip tekrar deneyin.");
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
        username: String(edit.username || "").trim().toLowerCase(),
        fullName: String(edit.fullName || "").trim(),
        phone: String(edit.phone || "").trim() || null,
      };
      if (edit.role === "COMPANY") body.companyId = edit.companyId ? Number(edit.companyId) : null;
      if (edit.role === "ROOM") body.roomId = edit.roomId ? Number(edit.roomId) : null;
      await api(`/api/admin/users/${edit.id}`, { method: "PUT", body, token });
      setEdit(null);
      await loadUsers();
    } catch {
      setErr("Kullanıcı güncelleme işlemi şu anda tamamlanamadı. Yenileyip tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  function copyText(t) {
    try {
      navigator.clipboard.writeText(String(t || ""));
    } catch { /* no-op */ }
  }

  return (
    <div style={{ padding: 16 }}>
      <div className="card" style={{ marginBottom: 12 }}>
        <FlowSummaryStrip
          title="Kullanıcılar"
          description="Süper yönetici kullanıcı hesabı açar, kullanıcı adı tanımlar, gerektiğinde geçici şifre üretir, hesabı pasif eder veya yeniden açar. Reset sonrası ilk girişte şifre değişimi zorunludur."
          statusText={busy ? "Yükleniyor" : err ? "Bağlantı okunamadı" : `${summary.total} kayıt`}
          tone={summary.total ? "success" : "warning"}
          steps={[
            `Aktif ${summary.activeCount}`,
            `Pasif ${summary.disabledCount}`,
            `Roller ${summary.rolesCount}`,
          ]}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 12 }}>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Kayıt sayısı</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{summary.total}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Aktif kullanıcı</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{summary.activeCount}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Pasif kullanıcı</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{summary.disabledCount}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Rol sayısı</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{summary.rolesCount}</div>
          </div>
        </div>
      </div>

      {err ? <div style={{ color: "#ff7b7b", marginTop: 12, marginBottom: 12, whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <PanelKvkkHint panelKey="users" />

      {lastPw ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Geçici şifre (1 kez gösterilir)</div>
          <div className="muted">{lastPw.login}</div>
          <div style={{ marginTop: 8 }} className="saActions">
            <code style={{ padding: "6px 10px", borderRadius: 10, background: "#111520" }}>{lastPw.password || "-"}</code>
            <button className="btn sm" onClick={() => copyText(lastPw.password || "")}>
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
              <option value="PARENT">PARENT</option>
            </select>
          </label>

          <label className="muted">
            Kullanıcı Adı
            <input value={createForm.username} onChange={(e) => setCreateForm((x) => ({ ...x, username: e.target.value.toLowerCase() }))} placeholder="ornek: oda_merkez" />
          </label>

          {createForm.role === "COMPANY" ? (
            <label className="muted">
              Company
              <select value={createForm.companyId} onChange={(e) => setCreateForm((x) => ({ ...x, companyId: e.target.value }))}>
                <option value="">Seç</option>
                {(companies || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} {c.name} • {formatRegionContext(c)}
                  </option>
                ))}
              </select>
            </label>
          ) : createForm.role === "ROOM" ? (
            <label className="muted">
              Room
              <select value={createForm.roomId} onChange={(e) => setCreateForm((x) => ({ ...x, roomId: e.target.value }))}>
                <option value="">Seç</option>
                {(rooms || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} {r.name} • {formatRegionContext(r)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="muted">
            Ad Soyad
            <input value={createForm.fullName} onChange={(e) => setCreateForm((x) => ({ ...x, fullName: e.target.value }))} />
          </label>
          <label className="muted">
            E-posta (opsiyonel)
            <input value={createForm.email} onChange={(e) => setCreateForm((x) => ({ ...x, email: e.target.value }))} placeholder="Giriş için şart değil" />
          </label>
          <label className="muted">
            Telefon (ops.)
            <input value={createForm.phone} onChange={(e) => setCreateForm((x) => ({ ...x, phone: e.target.value }))} />
          </label>
          <label className="muted">
            Geçici şifre (boşsa otomatik üretir)
            <input type="text" value={createForm.password} onChange={(e) => setCreateForm((x) => ({ ...x, password: e.target.value }))} />
          </label>
        </div>

        <div style={{ marginTop: 10 }} className="saActions">
          <button className="btn" disabled={busy} onClick={createUser}>
            Oluştur
          </button>
          <button className="btn" disabled={busy} onClick={loadRefs}>
            Referansları Yenile
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara (kullanıcı adı / e-posta / ad)" style={{ minWidth: 260 }} />

          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Tüm roller</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ROOM">ROOM</option>
            <option value="COMPANY">COMPANY</option>
            <option value="DRIVER">DRIVER</option>
            <option value="PERSONEL">PERSONEL</option>
            <option value="PARENT">PARENT</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tüm durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="DISABLED">Devre Dışı</option>
          </select>

          <button className="btn" disabled={busy} onClick={loadUsers}>
            Yenile
          </button>
        </div>

        <div className="saTable" style={{ marginTop: 12 }}>
          <div
            className="saHead"
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 120px 1fr 1fr 120px 320px",
              padding: "10px 12px",
            }}
          >
            <div>ID</div>
            <div>Kullanıcı Girişi</div>
            <div>Rol</div>
            <div>Ad Soyad</div>
            <div>Scope</div>
            <div>Durum</div>
            <div>Aksiyon</div>
          </div>

          {(view || []).map((u) => (
            <div
              key={u.id}
              className="saRow"
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr 120px 1fr 1fr 120px 320px",
                padding: "10px 12px",
                alignItems: "center",
              }}
            >
              <div style={{ opacity: 0.85 }}>{u.id}</div>

              <div style={{ wordBreak: "break-word" }}>
                <div style={{ fontWeight: 700 }}>{u.username || "-"}</div>
                <div className="muted" style={{ marginTop: 4 }}>{u.email || "E-posta yok"}</div>
                <button className="btn sm" style={{ marginTop: 6 }} onClick={() => copyText(u.username || "")} disabled={busy}>
                  Kullanıcı adını kopyala
                </button>
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Bölge: {userRegionLabel(u)}
                </div>
              </div>

              <div>
                <Pill>{roleLabel(u.role)}</Pill>
              </div>

              <div>{u.fullName}</div>
              <div style={{ opacity: 0.9 }}>{scopeLabel(u)}</div>

              <div>
                {u.disabled ? (
                  <span className="pill" data-status="DISABLED">
                    PASİF
                  </span>
                ) : (
                  <span className="pill" data-status="ACTIVE">
                    AKTİF
                  </span>
                )}
              </div>

              <div className="saActions">
                <button className="btn sm" disabled={busy} onClick={() => resetPw(u)}>
                  Şifreyi Sıfırla
                </button>

                {u.disabled ? (
                  <button className="btn sm" disabled={busy} onClick={() => enableUser(u.id)}>
                    Aktifleştir
                  </button>
                ) : (
                  <button className="btn sm" disabled={busy} onClick={() => disableUser(u.id)}>
                    Pasifleştir
                  </button>
                )}

                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() =>
                    setEdit({
                      id: u.id,
                      role: u.role,
                      username: u.username || "",
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

          {(!view || view.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>Kayıt yok</div>}
        </div>
      </div>

      {edit ? (
        <div className="modal-backdrop" onClick={() => setEdit(null)}>
          <div className="card modal" style={{ width: "min(720px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>Kullanıcı Düzenle</div>
                <div className="muted">
                  #{edit.id} • {edit.role} • {edit.username || "-"}
                </div>
              </div>
              <button className="btn sm" onClick={() => setEdit(null)}>
                Kapat
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <label className="muted">
                Kullanıcı Adı
                <input value={edit.username} onChange={(e) => setEdit((x) => ({ ...x, username: e.target.value.toLowerCase() }))} />
              </label>
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
                        #{c.id} {c.name} • {formatRegionContext(c)}
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
                        #{r.id} {r.name} • {formatRegionContext(r)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {edit.role === "PARENT" ? (
              <div style={{ marginTop: 12 }}>
                <ParentChildMiniPanel token={token} parentUserId={edit.id} />
              </div>
            ) : null}

            <div style={{ marginTop: 12 }} className="saActions">
              <button className="btn primary" disabled={busy} onClick={saveEdit}>
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
