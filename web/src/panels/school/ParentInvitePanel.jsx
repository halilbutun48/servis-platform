import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { makeHashLink } from "../../utils/publicBaseUrl";
import { formatDateTimeTR } from "../../utils/time";

function fmt(dt) {
  try { return formatDateTimeTR(dt); } catch { return String(dt || "-"); }
}

function statusPill(status) {
  return <span className="pill" data-status={status || "COUNT"}>{status || "-"}</span>;
}

function daysUntil(expiresAt) {
  const ms = new Date(expiresAt || 0).getTime() - Date.now();
  if (!Number.isFinite(ms)) return 7;
  return Math.max(1, Math.ceil(ms / (24 * 3600 * 1000)));
}

export default function SchoolParentInvitePanel() {
  const { token, me } = useSession();
  const [students, setStudents] = useState([]);
  const [items, setItems] = useState([]);
  const [childPersonelId, setChildPersonelId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [lastLink, setLastLink] = useState("");
  const [lastAccessCode, setLastAccessCode] = useState("");
  const [lastPin, setLastPin] = useState("");
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

  async function createAccess({ childId, durationDays }) {
    const r = await api("/api/school/parent-invites", {
      method: "POST",
      token,
      body: {
        childPersonelId: Number(childId),
        expiresInDays: Number(durationDays || 7),
      },
    });
    const raw = r?.token || "";
    const link = raw ? makeHashLink(`#/accept-parent-invite?token=${encodeURIComponent(raw)}`) : "";
    setLastLink(link);
    setLastAccessCode(String(r?.accessCode || ""));
    setLastPin(String(r?.pin || ""));
    return r;
  }

  async function onCreateAccess(e) {
    e?.preventDefault?.();
    if (!childPersonelId) {
      setErr("Önce öğrenci seç.");
      return;
    }
    setBusy(true);
    setErr("");
    setLastLink("");
    setLastAccessCode("");
    setLastPin("");
    try {
      await createAccess({ childId: childPersonelId, durationDays: expiresInDays });
      await loadAll();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text) {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  async function revokeAccess(id) {
    try {
      await api(`/api/school/parent-invites/${id}/revoke`, { method: "POST", token, body: {} });
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  async function renewAccess(item) {
    setBusy(true);
    setErr("");
    setLastLink("");
    setLastAccessCode("");
    setLastPin("");
    try {
      await api(`/api/school/parent-invites/${item.id}/revoke`, { method: "POST", token, body: {} });
      await createAccess({ childId: item.childPersonelId, durationDays: daysUntil(item.expiresAt) });
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (me?.companyKind !== "SCHOOL") return <div className="card err">Bu panel yalnızca SCHOOL scope için görünür.</div>;

  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Veli Erişimi</h3>
            <div className="muted" style={{ marginTop: 6 }}>
              Öğrenci seçilir, süreli erişim linki ve aynı süre kadar geçerli Kod + PIN üretilir. Mail, telefon veya ad soyad gerekmez.
            </div>
          </div>
          <button type="button" className="btn" onClick={loadAll}>Yenile</button>
        </div>
      </div>

      {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div className="grid" style={{ gridTemplateColumns: "minmax(320px, 1.1fr) minmax(340px, 1fr)", gap: 12, marginTop: 12 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Yeni erişim üret</h3>
          <form onSubmit={onCreateAccess} style={{ display: "grid", gap: 10, maxWidth: 620 }}>
            <label className="muted">
              Öğrenci
              <select value={childPersonelId} onChange={(e) => setChildPersonelId(e.target.value)}>
                {students.map((s) => <option key={s.id} value={s.id}>{s.fullName || `#${s.id}`}</option>)}
              </select>
            </label>
            <label className="muted">
              Geçerlilik süresi
              <select value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)}>
                <option value="1">1 gün</option>
                <option value="7">1 hafta</option>
                <option value="30">1 ay</option>
                <option value="180">6 ay</option>
                <option value="365">1 yıl</option>
              </select>
            </label>
            {selectedStudent ? <div className="muted">Seçili öğrenci: <b>{selectedStudent.fullName || `#${selectedStudent.id}`}</b></div> : null}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className="btn primary" disabled={busy}>{busy ? "..." : "Erişim üret"}</button>
              <button type="button" className="secondary" onClick={() => { setLastLink(""); setLastAccessCode(""); setLastPin(""); }}>Temizle</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Son üretilen erişim</h3>
          <div className="muted" style={{ marginBottom: 10 }}>
            Link, Kod ve PIN yalnızca üretim anında ham haliyle gösterilir. Sonradan yeniden göstermek yerine yeni erişim üret veya mevcut erişimi yenile.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <label className="muted">Erişim Linki
              <textarea readOnly rows={4} value={lastLink} placeholder="Henüz link üretilmedi." style={{ width: "100%", resize: "vertical", background: "#0c1322", color: "#e7eefc", border: "1px solid #2b3d64", borderRadius: 10, padding: 10 }} />
            </label>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="muted">Erişim Kodu<input readOnly value={lastAccessCode} placeholder="-" /></label>
              <label className="muted">PIN<input readOnly value={lastPin} placeholder="-" /></label>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={() => copyText(lastLink)} disabled={!lastLink}>Linki kopyala</button>
              <button type="button" className="btn" onClick={() => copyText(lastAccessCode)} disabled={!lastAccessCode}>Kodu kopyala</button>
              <button type="button" className="btn" onClick={() => copyText(lastPin)} disabled={!lastPin}>PIN kopyala</button>
              <button type="button" className="btn" onClick={() => window.open(lastLink || "", "_blank")} disabled={!lastLink}>Yeni sekmede aç</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto", marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Erişim geçmişi</h3>
        <table className="tbl" style={{ whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th>Öğrenci</th>
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
                <td>{statusPill(it.status)}</td>
                <td>{fmt(it.createdAt)}</td>
                <td>{fmt(it.expiresAt)}</td>
                <td>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    {it.status === "ACTIVE" ? <button type="button" className="secondary" onClick={() => revokeAccess(it.id)}>İptal et</button> : null}
                    <button type="button" className="secondary" onClick={() => renewAccess(it)} disabled={busy}>Yenile</button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan={5} className="muted">Henüz erişim yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

