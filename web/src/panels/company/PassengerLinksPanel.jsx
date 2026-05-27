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
  return `${base}/#/public/personel-live?token=${encodeURIComponent(rawToken)}`;
}

function isUsableLink(x) {
  if (!x) return false;
  if (x.revokedAt) return false;
  const exp = x.expiresAt ? new Date(x.expiresAt).getTime() : 0;
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  return true;
}

function freshKey(shiftId, personelId) {
  return `${String(shiftId || "")}:${String(personelId || "")}`;
}

function shiftPriority(status) {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") return 0;
  if (s === "APPROVED") return 1;
  return 2;
}

function pickPreferredShift(items, currentShiftId) {
  const current = currentShiftId ? items.find((s) => String(s.id) === String(currentShiftId)) || null : null;
  const active = items.find((s) => String(s.status || "").toUpperCase() === "ACTIVE") || null;
  if (current && String(current.status || "").toUpperCase() === "ACTIVE") return current;
  return active || current || items[0] || null;
}

export default function PassengerLinksPanel() {
  const { token, me } = useSession();
  const [shifts, setShifts] = useState([]);
  const [shiftId, setShiftId] = useState("");
  const [people, setPeople] = useState([]);
  const [links, setLinks] = useState([]);
  const [ttlDays, setTtlDays] = useState("7");
  const [busyId, setBusyId] = useState("");
  const [copied, setCopied] = useState("");
  const [err, setErr] = useState("");
  const [freshLinks, setFreshLinks] = useState({});

  async function loadShifts() {
    const res = await api("/api/shifts?status=APPROVED,ACTIVE&take=100", { token });
    const items = (Array.isArray(res?.items) ? res.items : []).slice().sort((a, b) => {
      const pa = shiftPriority(a?.status);
      const pb = shiftPriority(b?.status);
      if (pa !== pb) return pa - pb;
      const ta = new Date(a?.startAt || 0).getTime();
      const tb = new Date(b?.startAt || 0).getTime();
      if (ta !== tb) return tb - ta;
      return Number(a?.id || 0) - Number(b?.id || 0);
    });
    setShifts(items);
    const preferred = pickPreferredShift(items, shiftId);
    if (preferred?.id && String(preferred.id) !== String(shiftId || "")) setShiftId(String(preferred.id));
    return items;
  }

  async function loadPeople(sid) {
    if (!sid) {
      setPeople([]);
      return [];
    }
    const res = await api(`/api/shifts/${sid}/people`, { token });
    const items = Array.isArray(res?.items) ? res.items : [];
    setPeople(items);
    return items;
  }

  async function loadLinks(sid) {
    if (!sid) {
      setLinks([]);
      return [];
    }
    const res = await api(`/api/company/passenger-links?shiftId=${encodeURIComponent(String(sid))}`, { token });
    const items = Array.isArray(res?.items) ? res.items : [];
    setLinks(items);
    return items;
  }

  async function reloadAll(sid) {
    await Promise.all([loadPeople(sid), loadLinks(sid)]);
  }

  useEffect(() => {
    loadShifts().catch((e) => setErr(String(e?.message || e)));
  }, []); // eslint-disable-line

  useEffect(() => {
    setFreshLinks({});
    setCopied("");
    reloadAll(shiftId).catch((e) => setErr(String(e?.message || e)));
  }, [shiftId]); // eslint-disable-line

  const linkByPersonelId = useMemo(() => {
    const map = new Map();
    for (const x of links || []) {
      if (!x?.personelId) continue;
      if (!isUsableLink(x)) continue;
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
        body: { shiftId: Number(shiftId), personelId: Number(personelId), ttlDays: Number(ttlDays) || 7 },
      });
      if (!res?.token) throw new Error("Token dönmedi");
      const url = buildPublicLink(res.token);
      setFreshLinks((p) => ({ ...p, [freshKey(shiftId, personelId)]: url }));
      try {
        await navigator.clipboard.writeText(url);
        setCopied(String(personelId));
      } catch { /* no-op: clipboard copy is best-effort */ }
      await loadLinks(shiftId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyId("");
    }
  }

  async function revokeLink(id, personelId) {
    setBusyId(`revoke:${id}`);
    setErr("");
    try {
      await api(`/api/company/passenger-links/${id}/revoke`, { method: "POST", token });
      setFreshLinks((p) => {
        const next = { ...p };
        delete next[freshKey(shiftId, personelId)];
        return next;
      });
      if (copied === String(personelId)) setCopied("");
      await loadLinks(shiftId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyId("");
    }
  }

  async function copyText(t, key) {
    try {
      await navigator.clipboard.writeText(t);
      setCopied(String(key));
    } catch { /* no-op: clipboard copy is best-effort */ }
  }

  return (
    <div className="wrap wrap--fluid">
      <div className="card">
        <div className="title">{me?.companyKind === "SCHOOL" ? "Öğrenci Canlı Linkleri" : "Personel Canlı Linkleri"}</div>
        <div className="muted">
          Bu akış hesap aktivasyonu değildir. Login vermeden, tek kişiye özel süreli canlı takip linki üret.
          Link sadece kendi durak + tahmini süre + navigasyon bilgisini gösterir. Süre dolana kadar tekrar açılabilir; vardiya bitmişse ekran ENDED/final durum olarak görünür.
        </div>
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
            <select value={ttlDays} onChange={(e) => setTtlDays(e.target.value)}>
              <option value="7">1 hafta</option>
              <option value="30">1 ay</option>
              <option value="180">6 ay</option>
              <option value="365">1 yıl</option>
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
                  <th>Aktif link</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const active = linkByPersonelId.get(p.id) || null;
                  const fresh = freshLinks[freshKey(shiftId, p.id)] || "";
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
                            <br />Ham token güvenlik gereği tekrar gösterilmez; paylaşmak için <b>Yeniden Üret</b> kullan.
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
                            <button type="button" disabled={busyId === `revoke:${active.id}`} onClick={() => revokeLink(active.id, p.id)}>
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
