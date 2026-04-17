import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { formatDateTimeTR } from "../../utils/time";
import PanelKvkkHint from "../shared/PanelKvkkHint";

function copyText(s) {
  const v = String(s ?? "");
  if (!v) return;
  if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(v).catch(() => {});
  else window.prompt("Kopyala:", v);
}

function normStr(x) {
  const v = (x ?? "").toString().trim();
  return v ? v : "";
}

export default function RoomsPanel() {
  const { token } = useSession();

  const [items, setItems] = useState([]);
  const [regions, setRegions] = useState([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [regionId, setRegionId] = useState("");
  const [district, setDistrict] = useState("");

  const [newName, setNewName] = useState("");

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", regionId: "", district: "", status: "ACTIVE" });

  const [prof, setProf] = useState(null);
  const [profForm, setProfForm] = useState({
    addressLine: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    notes: "",
  });

  const regionNameById = useMemo(() => {
    const m = new Map();
    (regions || []).forEach((r) => m.set(String(r.id), r.name));
    return m;
  }, [regions]);

  function getRegionName(it) {
    if (it?.region?.name) return it.region.name;
    if (it?.regionName) return it.regionName;
    const rid = it?.regionId != null ? String(it.regionId) : "";
    return rid ? regionNameById.get(rid) || "-" : "-";
  }

  async function loadRegions() {
    try {
      const r = await api("/api/admin/regions", { token });
      setRegions(r.items || []);
    } catch {
      // ignore
    }
  }

  async function load() {
    setBusy(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("take", "500");
      if (q.trim()) qs.set("q", q.trim());
      if (regionId) qs.set("regionId", regionId);
      if (district.trim()) qs.set("district", district.trim());
      const r = await api(`/api/rooms?${qs.toString()}`, { token });
      const list = Array.isArray(r) ? r : r.items || [];
      setItems(list);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadRegions();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    const n = normStr(newName);
    if (!n) return setErr("Room adı gerekli");
    setBusy(true);
    setErr("");
    try {
      const body = { name: n };
      if (regionId) body.regionId = Number(regionId);
      if (district.trim()) body.district = district.trim();
      await api("/api/rooms", { method: "POST", body, token });
      setNewName("");
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(r) {
    setEditId(r.id);
    setEditForm({
      name: r.name || "",
      regionId: r.regionId != null ? String(r.regionId) : "",
      district: r.district || "",
      status: r.status || "ACTIVE",
    });
  }

  async function saveEdit(id) {
    setBusy(true);
    setErr("");
    try {
      const body = {
        name: normStr(editForm.name),
        district: normStr(editForm.district) || null,
        status: editForm.status || "ACTIVE",
        regionId: editForm.regionId ? Number(editForm.regionId) : null,
      };
      await api(`/api/rooms/${id}`, { method: "PUT", body, token });
      setEditId(null);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    if (!window.confirm("Silinsin mi? (soft delete)")) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/rooms/${id}`, { method: "DELETE", token });
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function openProfile(r) {
    setProf(r);
    setProfForm({
      addressLine: r.addressLine || "",
      contactName: r.contactName || "",
      contactPhone: r.contactPhone || "",
      contactEmail: r.contactEmail || "",
      notes: r.notes || "",
    });
  }

  async function saveProfile() {
    if (!prof) return;
    setBusy(true);
    setErr("");
    try {
      const body = {
        addressLine: normStr(profForm.addressLine) || null,
        contactName: normStr(profForm.contactName) || null,
        contactPhone: normStr(profForm.contactPhone) || null,
        contactEmail: normStr(profForm.contactEmail) || null,
        notes: normStr(profForm.notes) || null,
      };
      await api(`/api/rooms/${prof.id}`, { method: "PUT", body, token });
      setProf(null);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const filteredCount = (items || []).length;

  return (
    <>
      <div style={{ padding: 16 }}>
        <div className="topbar">
          <div>
            <div className="title">Room’lar</div>
            <div className="muted">Room = servis sağlayan (operator) şirket. Company ile bağ sözleşme üzerinden kurulur.</div>
          </div>
          <div className="pill">{filteredCount} kayıt</div>
        </div>

        <PanelKvkkHint panelKey="rooms" />

        <div className="card toolbar">
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">Tüm iller</option>
            {(regions || []).map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </select>

          <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="İlçe filtresi (opsiyonel)" style={{ minWidth: 220 }} />

          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara (id / ad)" style={{ minWidth: 220 }} />

          <div style={{ flex: 1 }} />

          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Yeni room adı" style={{ minWidth: 220 }} />
          <button className="btn primary" disabled={busy} onClick={create}>
            Oluştur
          </button>
          <button className="btn" disabled={busy} onClick={load}>
            Yenile
          </button>
        </div>

        {err ? <div style={{ color: "#ff7b7b", marginBottom: 10, whiteSpace: "pre-wrap" }}>{err}</div> : null}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1.2fr 1fr 1fr 120px 190px 260px",
              padding: "10px 12px",
              fontWeight: 700,
              opacity: 0.9,
              borderBottom: "1px solid #22314f",
            }}
          >
            <div>ID</div>
            <div>Ad</div>
            <div>İl</div>
            <div>İlçe</div>
            <div>Durum</div>
            <div>Oluşturma</div>
            <div>Aksiyon</div>
          </div>

          {(items || []).map((r) => {
            const editing = editId === r.id;
            return (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px 1.2fr 1fr 1fr 120px 190px 260px",
                  padding: "10px 12px",
                  borderBottom: "1px solid #16203a",
                  alignItems: "center",
                }}
              >
                <div style={{ opacity: 0.85 }}>{r.id}</div>

                <div>
                  {editing ? (
                    <input value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
                  ) : (
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                  )}
                </div>

                <div>
                  {editing ? (
                    <select value={editForm.regionId} onChange={(e) => setEditForm((s) => ({ ...s, regionId: e.target.value }))}>
                      <option value="">-</option>
                      {(regions || []).map((rg) => (
                        <option key={rg.id} value={String(rg.id)}>
                          {rg.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>{getRegionName(r)}</div>
                  )}
                </div>

                <div>
                  {editing ? (
                    <input value={editForm.district} onChange={(e) => setEditForm((s) => ({ ...s, district: e.target.value }))} />
                  ) : (
                    <div>{r.district || "-"}</div>
                  )}
                </div>

                <div>
                  {editing ? (
                    <select value={editForm.status} onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value }))}>
                      <option value="ACTIVE">Aktif</option>
                      <option value="DELETED">DELETED</option>
                    </select>
                  ) : (
                    <span className="pill">{String(r.status || "ACTIVE") === "ACTIVE" ? "Aktif" : String(r.status || "ACTIVE") === "PASSIVE" ? "Pasif" : (r.status || "-")}</span>
                  )}
                </div>

                <div style={{ opacity: 0.8 }}>{r.createdAt ? formatDateTimeTR(r.createdAt) : "-"}</div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button className="btn sm" disabled={busy} onClick={() => copyText(r.id)}>
                    ID Kopyala
                  </button>

                  {editing ? (
                    <>
                      <button className="btn sm primary" disabled={busy} onClick={() => saveEdit(r.id)}>
                        Kaydet
                      </button>
                      <button className="btn sm" disabled={busy} onClick={() => setEditId(null)}>
                        İptal
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn sm" disabled={busy} onClick={() => startEdit(r)}>
                        Düzenle
                      </button>
                      <button className="btn sm" disabled={busy} onClick={() => openProfile(r)}>
                        Profil
                      </button>
                      <button className="btn sm" disabled={busy} onClick={() => del(r.id)}>
                        Sil
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {(!items || items.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>Kayıt yok</div>}
        </div>

        <div className="muted" style={{ fontSize: 12 }}>
          Not: İlçe alanı opsiyonel. Filtreyi kullanırsan listede ilçe içerenlere göre arar.
        </div>
      </div>

      {prof ? (
        <div className="modal-backdrop" onClick={() => !busy && setProf(null)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 10, borderBottom: "1px solid #22314f" }}>
              <div style={{ fontWeight: 800 }}>Room Profili — #{prof.id} {prof.name}</div>
              <button className="btn sm" disabled={busy} onClick={() => setProf(null)}>
                Kapat
              </button>
            </div>

            <div className="grid" style={{ marginTop: 12 }}>
              <label className="col muted">
                Yetkili Ad Soyad
                <input value={profForm.contactName} onChange={(e) => setProfForm((s) => ({ ...s, contactName: e.target.value }))} />
              </label>
              <label className="col muted">
                Telefon
                <input value={profForm.contactPhone} onChange={(e) => setProfForm((s) => ({ ...s, contactPhone: e.target.value }))} />
              </label>
              <label className="col muted">
                E-posta
                <input value={profForm.contactEmail} onChange={(e) => setProfForm((s) => ({ ...s, contactEmail: e.target.value }))} />
              </label>
            </div>

            <label className="col muted" style={{ marginTop: 12 }}>
              Adres
              <textarea rows={3} value={profForm.addressLine} onChange={(e) => setProfForm((s) => ({ ...s, addressLine: e.target.value }))} />
            </label>

            <label className="col muted" style={{ marginTop: 12 }}>
              Notlar
              <textarea rows={3} value={profForm.notes} onChange={(e) => setProfForm((s) => ({ ...s, notes: e.target.value }))} />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button className="btn" disabled={busy} onClick={() => setProf(null)}>
                İptal
              </button>
              <button className="btn primary" disabled={busy} onClick={saveProfile}>
                Kaydet
              </button>
            </div>

            {err ? <div style={{ marginTop: 10, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}


