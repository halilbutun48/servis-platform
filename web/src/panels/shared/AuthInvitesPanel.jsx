import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import BrandMark from "../../components/BrandMark";

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function buildAcceptLink(rawToken) {
  const base = String(import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin || "").replace(/\/$/, "");
  return `${base}/#/accept-invite?token=${encodeURIComponent(rawToken)}`;
}

function isUsableInvite(x) {
  if (!x) return false;
  if (x.revokedAt) return false;
  if (x.consumedAt) return false;
  const exp = x.expiresAt ? new Date(x.expiresAt).getTime() : 0;
  if (exp && exp <= Date.now()) return false;
  return true;
}

export default function AuthInvitesPanel() {
  const { token, me } = useSession();
  const isRoom = me?.role === "ROOM";
  const isCompany = me?.role === "COMPANY";
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [email, setEmail] = useState("");
  const [ttlDays, setTtlDays] = useState("7");
  const [invites, setInvites] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [freshLink, setFreshLink] = useState("");
  const [copied, setCopied] = useState("");

  async function loadProfiles() {
    if (isRoom) {
      const list = await api("/api/drivers", { token });
      const items = Array.isArray(list) ? list : [];
      setProfiles(items);
      if (!profileId && items[0]?.id) setProfileId(String(items[0].id));
      return;
    }
    if (isCompany) {
      const resp = await api("/api/company/personels", { token });
      const items = Array.isArray(resp?.items) ? resp.items : [];
      setProfiles(items);
      if (!profileId && items[0]?.id) setProfileId(String(items[0].id));
    }
  }

  async function loadInvites() {
    const resp = await api("/api/auth/invites?take=200", { token });
    setInvites(Array.isArray(resp?.items) ? resp.items : []);
  }

  useEffect(() => {
    Promise.all([loadProfiles(), loadInvites()]).catch((e) => setErr(String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => profiles.find((x) => String(x.id) === String(profileId)) || null, [profiles, profileId]);

  async function createInvite(e) {
    e.preventDefault();
    if (!profileId || !email.trim()) return;
    setBusy(true);
    setErr("");
    setFreshLink("");
    try {
      const body = isRoom
        ? { role: "DRIVER", driverId: Number(profileId), roomId: Number(me?.roomId || 0), email: email.trim(), ttlDays: Number(ttlDays) || 7 }
        : { role: "PERSONEL", personelId: Number(profileId), companyId: Number(me?.companyId || 0), email: email.trim(), ttlDays: Number(ttlDays) || 7 };
      const res = await api("/api/auth/invites", { method: "POST", token, body });
      if (!res?.token) throw new Error("Token dönmedi");
      const url = buildAcceptLink(res.token);
      setFreshLink(url);
      try {
        await navigator.clipboard.writeText(url);
        setCopied("fresh");
      } catch {}
      await loadInvites();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(id) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/auth/invites/${id}/revoke`, { method: "POST", token });
      await loadInvites();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value, key) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(String(key));
    } catch {}
  }

  return (
    <div className="wrap wrap--fluid">
      <div className="card" style={{ marginBottom: 12 }}>
        <BrandMark subtitle="Giriş davetleri ve erişim akışı" />
      </div>
      <div className="card">
        <div className="title">{isRoom ? "Sürücü Giriş Davetleri" : "Personel Giriş Davetleri"}</div>
        <div className="muted">Şifre dağıtmak yerine doğrulanmış Google hesabıyla giriş aç. Invite yoksa Google login reddedilir.</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="title">Yeni davet üret</div>
        <form onSubmit={createInvite} style={{ display: "grid", gap: 10, marginTop: 10, maxWidth: 680 }}>
          <label className="muted">
            {isRoom ? "Sürücü" : me?.companyKind === "SCHOOL" ? "Öğrenci / Personel" : "Personel"}
            <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              <option value="">Seç…</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>#{p.id} • {p.fullName}{p.phone ? ` • ${p.phone}` : ""}</option>
              ))}
            </select>
          </label>
          <label className="muted">
            Davet e-postası
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@firma.com" />
          </label>
          <label className="muted">
            Link süresi
            <select value={ttlDays} onChange={(e) => setTtlDays(e.target.value)}>
              <option value="7">1 hafta</option>
              <option value="30">1 ay</option>
              <option value="180">6 ay</option>
              <option value="365">1 yıl</option>
            </select>
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="submit" disabled={busy || !selected || !email.trim()}>{busy ? "..." : "Davet linki üret"}</button>
            <button type="button" className="secondary" onClick={() => { setEmail(""); setFreshLink(""); setCopied(""); }}>Temizle</button>
          </div>
        </form>

        {freshLink ? (
          <div style={{ marginTop: 12 }}>
            <div className="muted">Yeni link hazır</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <code style={{ maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>{freshLink}</code>
              <button type="button" onClick={() => copyText(freshLink, "fresh")}>{copied === "fresh" ? "Kopyalandı" : "Kopyala"}</button>
            </div>
          </div>
        ) : null}

        {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="title">Mevcut davetler</div>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Rol</th>
                <th>Profil</th>
                <th>E-posta</th>
                <th>Durum</th>
                <th>Bitiş</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((it) => {
                const usable = isUsableInvite(it);
                return (
                  <tr key={it.id}>
                    <td>#{it.id}</td>
                    <td>{it.role}</td>
                    <td>{it.personel?.fullName || it.driver?.fullName || "-"}</td>
                    <td>{it.email || "-"}</td>
                    <td>
                      {it.revokedAt ? "REVOKED" : it.consumedAt ? "CONSUMED" : usable ? "ACTIVE" : "EXPIRED"}
                    </td>
                    <td>{fmtTR(it.expiresAt)}</td>
                    <td>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        {usable ? <button type="button" onClick={() => revokeInvite(it.id)} disabled={busy}>Revoke</button> : null}
                        {!usable ? <span className="muted">Yeniden paylaşmak için yeni davet üret</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="muted" style={{ marginTop: 10 }}>Ham token güvenlik gereği sadece ilk üretimde gösterilir. Yeniden paylaşmak için yeni davet üret.</div>
      </div>
    </div>
  );
}
