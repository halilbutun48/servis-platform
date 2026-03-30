import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { companyPath } from "../../utils/paths";
import { makeHashLink } from "../../utils/publicBaseUrl";
import { formatDateTimeTR } from "../../utils/time";

function fmt(dt) {
  try {
    return formatDateTimeTR(dt);
  } catch {
    return String(dt || "-");
  }
}

function statusPill(status) {
  return <span className="pill" data-status={status || "COUNT"}>{status || "-"}</span>;
}

export default function SchoolParentInvitePanel() {
  const { token, me } = useSession();
  const [students, setStudents] = useState([]);
  const [items, setItems] = useState([]);
  const [childPersonelId, setChildPersonelId] = useState("");
  const [parentFullName, setParentFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [lastLink, setLastLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const selectedStudent = useMemo(() => students.find((x) => String(x.id) === String(childPersonelId)) || null, [students, childPersonelId]);

  async function loadAll() {
    setErr("");
    try {
      const [s, inv] = await Promise.all([
        api("/api/company/personels?kind=STUDENT", { token }),
        api("/api/school/parent-invites?take=100", { token }),
      ]);
      const sItems = Array.isArray(s?.items) ? s.items : [];
      const invItems = Array.isArray(inv?.items) ? inv.items : [];
      setStudents(sItems);
      setItems(invItems);
      setChildPersonelId((prev) => prev || String(sItems?.[0]?.id || ""));
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    if (!token || me?.companyKind !== "SCHOOL") return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, me?.companyId, me?.companyKind]);

  async function createInvite(e) {
    e?.preventDefault?.();
    if (!childPersonelId) {
      setErr("Önce öğrenci seç.");
      return;
    }
    setBusy(true);
    setErr("");
    setLastLink("");
    try {
      const r = await api("/api/school/parent-invites", {
        method: "POST",
        token,
        body: {
          childPersonelId: Number(childPersonelId),
          parentFullName,
          expiresInDays: Number(expiresInDays || 7),
        },
      });
      const raw = r?.token || "";
      const link = raw ? makeHashLink(`#/accept-parent-invite?token=${encodeURIComponent(raw)}`) : "";
      setLastLink(link);
      await loadAll();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  async function copyLastLink() {
    try {
      if (!lastLink) return;
      await navigator.clipboard.writeText(lastLink);
    } catch {}
  }

  async function revokeInvite(id) {
    try {
      await api(`/api/school/parent-invites/${id}/revoke`, { method: "POST", token, body: {} });
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  if (me?.companyKind !== "SCHOOL") {
    return <div className="card err">Bu panel yalnızca SCHOOL scope için görünür.</div>;
  }

  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Parent Invite Link</h3>
            <div className="muted" style={{ marginTop: 6 }}>
              Okul paneli parent hesabı için ID/şifre vermez. Öğrenci seçilir, tek kullanımlık link üretilir; veli linkten kendi hesabını açar.
            </div>
          </div>
          <button type="button" className="btn" onClick={loadAll}>Yenile</button>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Yeni link üret</h3>
          <form onSubmit={createInvite} style={{ display: "grid", gap: 10 }}>
            <label className="col">
              <span className="muted">Öğrenci</span>
              <select value={childPersonelId} onChange={(e) => setChildPersonelId(e.target.value)}>
                <option value="">Öğrenci seç</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>#{s.id} • {s.fullName}</option>
                ))}
              </select>
            </label>
            {selectedStudent ? <div className="muted">Seçili öğrenci: {selectedStudent.fullName}</div> : null}
            <label className="col">
              <span className="muted">Veli adı (opsiyonel)</span>
              <input value={parentFullName} onChange={(e) => setParentFullName(e.target.value)} placeholder="Ayşe Yılmaz" />
            </label>
            <label className="col">
              <span className="muted">E-posta (opsiyonel kilit)</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="veli@example.com" />
            </label>
            <label className="col">
              <span className="muted">Telefon (opsiyonel)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx..." />
            </label>
            <label className="col">
              <span className="muted">Geçerlilik (gün)</span>
              <select value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)}>
                <option value="7">1 hafta</option>
                <option value="30">1 ay</option>
                <option value="180">6 ay</option>
                <option value="365">1 yıl</option>
              </select>
            </label>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className="btn primary" disabled={busy}>{busy ? "..." : "Link üret"}</button>
              <button type="button" className="secondary" onClick={() => { setParentFullName(""); setEmail(""); setPhone(""); }}>Temizle</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Son üretilen link</h3>
          <div className="muted" style={{ marginBottom: 10 }}>
            Link sadece oluşturulduğu anda ham token ile gösterilir. Yeniden göstermek yerine gerekiyorsa yeni link üret.
          </div>
          <textarea readOnly rows={5} value={lastLink} placeholder="Henüz link üretilmedi." style={{ width: "100%", resize: "vertical", background: "#0c1322", color: "#e7eefc", border: "1px solid #2b3d64", borderRadius: 10, padding: 10 }} />
          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={copyLastLink} disabled={!lastLink}>Linki kopyala</button>
            <button type="button" className="btn" onClick={() => window.open(lastLink || companyPath(me), "_blank")} disabled={!lastLink}>Yeni sekmede aç</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Invite geçmişi</h3>
        <table className="tbl" style={{ whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th>Öğrenci</th>
              <th>Veli</th>
              <th>E-posta</th>
              <th>Telefon</th>
              <th>Durum</th>
              <th>Oluşturma</th>
              <th>Bitiş</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? items.map((it) => (
              <tr key={it.id}>
                <td>{it.child?.fullName || `#${it.childPersonelId}`}</td>
                <td>{it.parentFullName || "-"}</td>
                <td>{it.email || "-"}</td>
                <td>{it.phone || "-"}</td>
                <td>{statusPill(it.status)}</td>
                <td>{fmt(it.createdAt)}</td>
                <td>{fmt(it.expiresAt)}</td>
                <td>
                  {it.status === "CREATED" ? (
                    <button type="button" className="secondary" onClick={() => revokeInvite(it.id)}>Revoke</button>
                  ) : <span className="muted">-</span>}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={8} className="muted">Henüz invite yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
