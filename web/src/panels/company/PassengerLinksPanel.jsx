import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function buildPublicLink(rawToken) {
  const base = String(import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin || "").replace(/\/$/, "");
  return `${base}/#/public/passenger-live?token=${encodeURIComponent(rawToken)}`;
}

export default function PassengerLinksPanel() {
  const { token, me } = useSession();
  const [shifts, setShifts] = useState([]);
  const [shiftId, setShiftId] = useState("");
  const [people, setPeople] = useState([]);
  const [links, setLinks] = useState([]);
  const [ttlHours, setTtlHours] = useState("12");
  const [busyId, setBusyId] = useState("");
  const [copied, setCopied] = useState("");
  const [err, setErr] = useState("");
  const [freshLinks, setFreshLinks] = useState({});

  async function loadShifts() {
    const res = await api("/api/shifts?status=APPROVED,ACTIVE&take=100", { token });
    const items = Array.isArray(res?.items) ? res.items : [];
    setShifts(items);
    if (!shiftId && items[0]?.id) setShiftId(String(items[0].id));
    return items;
  }

  async function loadPeople(sid) {
    if (!sid) { setPeople([]); return []; }
    const res = await api(`/api/shifts/${sid}/people`, { token });
    const items = Array.isArray(res?.items) ? res.items : [];
    setPeople(items);
    return items;
  }

  async function loadLinks(sid) {
    if (!sid) { setLinks([]); return []; }
    const res = await api(`/api/company/passenger-links?shiftId=${encodeURIComponent(String(sid))}`, { token });
    const items = Array.isArray(res?.items) ? res.items : [];
    setLinks(items);
    return items;
  }

  async function reloadAll(sid) {
    await Promise.all([loadPeople(sid), loadLinks(sid)]);
  }

  useEffect(() => { loadShifts().catch((e) => setErr(String(e?.message || e))); }, []); // eslint-disable-line
  useEffect(() => { reloadAll(shiftId).catch((e) => setErr(String(e?.message || e))); }, [shiftId]); // eslint-disable-line

  const linkByPersonelId = useMemo(() => {
    const map = new Map();
    for (const x of links || []) {
      if (!x?.personelId) continue;
      if (map.has(x.personelId)) continue;
      map.set(x.personelId, x);
    }
    return map;
  }, [links]);

  async function createLink(personelId) {
    setBusyId(String(personelId));
    setErr("");
    try {
      const res = await api("/api/company/passenger-links", {
        method: "POST",
        token,
        body: { shiftId: Number(shiftId), personelId: Number(personelId), ttlHours: Number(ttlHours) || 12 },
      });
      const url = buildPublicLink(res?.token || "");
      setFreshLinks((p) => ({ ...p, [String(personelId)]: url }));
      try { await navigator.clipboard.writeText(url); setCopied(String(personelId)); } catch {}
      await loadLinks(shiftId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyId("");
    }
  }

  async function revokeLink(id) {
    setBusyId(`revoke:${id}`);
    setErr("");
    try {
      await api(`/api/company/passenger-links/${id}/revoke`, { method: "POST", token });
      await loadLinks(shiftId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyId("");
    }
  }

  async function copyText(t, key) {
    try { await navigator.clipboard.writeText(t); setCopied(String(key)); } catch {}
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">{me?.companyKind === "SCHOOL" ? "Öğrenci Canlı Linkleri" : "Personel Canlı Linkleri"}</div>
        <div className="muted">Login vermeden, tek kişiye özel süreli canlı takip linki üret. Link sadece kendi durak + ETA + navigasyon bilgisini gösterir.</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Vardiya
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} style={{ minWidth: 260 }}>
              <option value="">Seç…</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>#{s.id} • {fmtTR(s.startAt)} → {fmtTR(s.endAt)} • {s.status}</option>
              ))}
            </select>
          </label>

          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Link süresi
            <select value={ttlHours} onChange={(e) => setTtlHours(e.target.value)}>
              <option value="6">6 saat</option>
              <option value="12">12 saat</option>
              <option value="24">24 saat</option>
              <option value="48">48 saat</option>
            </select>
          </label>

          <button type="button" onClick={() => reloadAll(shiftId)}>Yenile</button>
        </div>

        {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}

        {!shiftId ? <div className="muted" style={{ marginTop: 12 }}>Önce bir vardiya seç.</div> : null}

        {shiftId ? (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{me?.companyKind === "SCHOOL" ? "Öğrenci" : "Personel"}</th>
                  <th>Telefon</th>
                  <th>Aktif link</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const active = linkByPersonelId.get(p.id) || null;
                  const fresh = freshLinks[String(p.id)] || "";
                  const share = fresh || (active ? buildPublicLink(`token-hidden-${active.id}`) : "");
                  return (
                    <tr key={p.id}>
                      <td>#{p.id}</td>
                      <td>{p.fullName}</td>
                      <td>{p.phone || "-"}</td>
                      <td>
                        {fresh ? (
                          <div>
                            <div className="muted">Yeni link hazır</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                              <code style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>{fresh}</code>
                              <button type="button" onClick={() => copyText(fresh, p.id)}>{copied === String(p.id) ? "Kopyalandı" : "Kopyala"}</button>
                            </div>
                          </div>
                        ) : active ? (
                          <div className="muted">
                            Oluşturuldu: <b>{fmtTR(active.createdAt)}</b><br />
                            Biter: <b>{fmtTR(active.expiresAt)}</b>
                            {active.lastViewedAt ? <><br />Son görüntüleme: <b>{fmtTR(active.lastViewedAt)}</b></> : null}
                          </div>
                        ) : (
                          <span className="muted">Link yok</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" disabled={busyId === String(p.id)} onClick={() => createLink(p.id)}>
                            {busyId === String(p.id) ? "..." : active ? "Yeniden Üret" : "Link Üret"}
                          </button>
                          {active ? (
                            <button type="button" disabled={busyId === `revoke:${active.id}`} onClick={() => revokeLink(active.id)}>
                              {busyId === `revoke:${active.id}` ? "..." : "Revoke"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!people.length ? (
                  <tr><td colSpan="5" className="muted">Bu vardiyada bağlı kişi yok.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
