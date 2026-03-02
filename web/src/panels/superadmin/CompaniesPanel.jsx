import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

export default function CompaniesPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [regions, setRegions] = useState([]);
  const [regionId, setRegionId] = useState("");
  const [district, setDistrict] = useState("");

  const [name, setName] = useState("");
  const [edit, setEdit] = useState(null); // {id,name,status,regionId,district}
  const [detail, setDetail] = useState(null); // full profile modal
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const url = `/api/companies?all=0${regionId ? `&regionId=${encodeURIComponent(regionId)}` : ""}${
        district.trim() ? `&district=${encodeURIComponent(district.trim())}` : ""
      }`;
      const [rr, res] = await Promise.all([api("/api/admin/regions", { token }), api(url, { token })]);
      setRegions(rr.items || []);
      setItems(res.items || []);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId, district]);

  async function create() {
    setErr("");
    const n = name.trim();
    if (!n) return setErr("Şirket adı gerekli");

    setBusy(true);
    try {
      await api("/api/companies", {
        method: "POST",
        body: { name: n, regionId: regionId || null, district: district.trim() || null },
        token,
      });
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
    setBusy(true);
    setErr("");
    try {
      const body = {
        name: (edit.name || "").trim(),
        status: String(edit.status || "ACTIVE"),
        regionId: edit.regionId ?? null,
        district: (edit.district || "").trim() || null,
      };
      if (!body.name) throw new Error("Şirket adı gerekli");
      await api(`/api/companies/${edit.id}`, { method: "PUT", body, token });
      setEdit(null);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveDetail() {
    if (!detail?.id) return;
    setBusy(true);
    setErr("");
    try {
      const body = {
        legalName: (detail.legalName || "").trim() || null,
        taxNo: (detail.taxNo || "").trim() || null,
        taxOffice: (detail.taxOffice || "").trim() || null,
        addressLine: (detail.addressLine || "").trim() || null,
        contactName: (detail.contactName || "").trim() || null,
        contactPhone: (detail.contactPhone || "").trim() || null,
        contactEmail: (detail.contactEmail || "").trim() || null,
        notes: (detail.notes || "").trim() || null,
      };
      await api(`/api/companies/${detail.id}`, { method: "PUT", body, token });
      setDetail(null);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }


  async function del(id) {
    const ok = window.confirm(`#${id} şirketi silinsin mi? (soft delete)`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/companies/${id}`, { method: "DELETE", token });
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
      <h2 style={{ margin: 0, marginBottom: 8 }}>Şirketler</h2>
      <div style={{ opacity: 0.75, marginBottom: 16 }}>SUPER_ADMIN şirket oluşturur/lister/günceller/siler.</div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          style={{ minWidth: 220, padding: 10, borderRadius: 10, border: "1px solid #2b2f3a" }}
        >
          <option value="">Tüm iller</option>
          {(regions || []).map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.name}
            </option>
          ))}
        </select>

        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="İlçe (opsiyonel)"
          style={{ minWidth: 220, padding: 10, borderRadius: 10, border: "1px solid #2b2f3a" }}
        />

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
            gridTemplateColumns: "80px 1fr 160px 160px 140px 220px 220px",
            padding: "10px 12px",
            background: "#111520",
            fontWeight: 600,
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

        {(items || []).map((c) => (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 160px 160px 140px 220px 220px",
              padding: "10px 12px",
              borderTop: "1px solid #222633",
              alignItems: "center",
            }}
          >
            <div style={{ opacity: 0.85 }}>{c.id}</div>

            <div>
              {edit?.id === c.id ? (
                <input
                  value={edit.name}
                  onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))}
                  style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #2b2f3a" }}
                />
              ) : (
                c.name
              )}
            </div>

            <div>
              {edit?.id === c.id ? (
                <select
                  value={String(edit.regionId || "")}
                  onChange={(e) => setEdit((x) => ({ ...x, regionId: e.target.value ? Number(e.target.value) : null }))}
                  style={{ padding: 8, borderRadius: 10, border: "1px solid #2b2f3a" }}
                >
                  <option value="">-</option>
                  {(regions || []).map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ opacity: 0.9 }}>{c.region?.name || "-"}</span>
              )}
            </div>

            <div>
              {edit?.id === c.id ? (
                <input
                  value={edit.district || ""}
                  onChange={(e) => setEdit((x) => ({ ...x, district: e.target.value }))}
                  placeholder="-"
                  style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #2b2f3a" }}
                />
              ) : (
                <span style={{ opacity: 0.9 }}>{c.district || "-"}</span>
              )}
            </div>

            <div>
              {edit?.id === c.id ? (
                <select
                  value={edit.status}
                  onChange={(e) => setEdit((x) => ({ ...x, status: e.target.value }))}
                  style={{ padding: 8, borderRadius: 10, border: "1px solid #2b2f3a" }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PASSIVE">PASSIVE</option>
                </select>
              ) : (
                <span className="pill">{c.status || "ACTIVE"}</span>
              )}
            </div>

            <div style={{ opacity: 0.75 }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : "-"}</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {edit?.id === c.id ? (
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
                  <button
                    className="btn sm"
                    disabled={busy}
                    onClick={() =>
                      setEdit({
                        id: c.id,
                        name: c.name,
                        status: c.status || "ACTIVE",
                        regionId: c.regionId ?? c.region?.id ?? null,
                        district: c.district || "",
                      })
                    }
                  >
                    Düzenle
                  </button>
                  <button
                    className="btn sm"
                    disabled={busy}
                    onClick={() =>
                      setDetail({
                        id: c.id,
                        legalName: c.legalName || "",
                        taxNo: c.taxNo || "",
                        taxOffice: c.taxOffice || "",
                        addressLine: c.addressLine || "",
                        contactName: c.contactName || "",
                        contactPhone: c.contactPhone || "",
                        contactEmail: c.contactEmail || "",
                        notes: c.notes || "",
                      })
                    }
                  >
                    Detay
                  </button>
                  <button className="btn sm" disabled={busy} onClick={() => del(c.id)}>
                    Sil
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {(!items || items.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>Kayıt yok</div>}
      </div>

      <div className="muted" style={{ marginTop: 10 }}>
        Not: İlçe alanı opsiyonel. Filtreyi kullanırsan listede ilçe içerene göre arar.
      </div>
      {detail ? (
        <div className="modal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 60 }}>
          <div className="card" style={{ width: "min(900px, 94vw)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>Şirket Profili</div>
                <div className="muted">#{detail.id}</div>
              </div>
              <button className="btn sm" onClick={() => setDetail(null)}>
                Kapat
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
              <label className="muted">
                Resmi Ünvan (ops.)
                <input value={detail.legalName} onChange={(e) => setDetail((x) => ({ ...x, legalName: e.target.value }))} />
              </label>
              <label className="muted">
                Vergi No (ops.)
                <input value={detail.taxNo} onChange={(e) => setDetail((x) => ({ ...x, taxNo: e.target.value }))} />
              </label>
              <label className="muted">
                Vergi Dairesi (ops.)
                <input value={detail.taxOffice} onChange={(e) => setDetail((x) => ({ ...x, taxOffice: e.target.value }))} />
              </label>

              <label className="muted">
                Yetkili Adı (ops.)
                <input value={detail.contactName} onChange={(e) => setDetail((x) => ({ ...x, contactName: e.target.value }))} />
              </label>
              <label className="muted">
                Yetkili Tel (ops.)
                <input value={detail.contactPhone} onChange={(e) => setDetail((x) => ({ ...x, contactPhone: e.target.value }))} />
              </label>
              <label className="muted">
                Yetkili Email (ops.)
                <input value={detail.contactEmail} onChange={(e) => setDetail((x) => ({ ...x, contactEmail: e.target.value }))} />
              </label>

              <label className="muted" style={{ gridColumn: "1 / -1" }}>
                Adres (ops.)
                <textarea rows={3} value={detail.addressLine} onChange={(e) => setDetail((x) => ({ ...x, addressLine: e.target.value }))} />
              </label>

              <label className="muted" style={{ gridColumn: "1 / -1" }}>
                Notlar (ops.)
                <textarea rows={3} value={detail.notes} onChange={(e) => setDetail((x) => ({ ...x, notes: e.target.value }))} />
              </label>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" disabled={busy} onClick={saveDetail}>
                Kaydet
              </button>
              <button className="btn" disabled={busy} onClick={() => setDetail(null)}>
                İptal
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
