import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";

function useInviteToken(path) {
  return useMemo(() => {
    const idx = String(path || "").indexOf("?");
    const search = idx >= 0 ? String(path).slice(idx + 1) : "";
    const qs = new URLSearchParams(search);
    return String(qs.get("token") || "").trim();
  }, [path]);
}

export default function AcceptParentInvitePanel({ path }) {
  const inviteToken = useInviteToken(path);
  const { setToken } = useSession();
  const [info, setInfo] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!inviteToken) {
      setErr("Invite token bulunamadı.");
      return;
    }
    let off = false;
    api(`/api/auth/parent-invite/info?token=${encodeURIComponent(inviteToken)}`)
      .then((r) => {
        if (off) return;
        setInfo(r?.invite || null);
        setFullName(r?.invite?.parentFullName || "");
        setEmail(r?.invite?.email || "");
        setPhone(r?.invite?.phone || "");
      })
      .catch((e) => { if (!off) setErr(String(e?.message || e)); });
    return () => { off = true; };
  }, [inviteToken]);

  async function onAccept(e) {
    e.preventDefault();
    if (!inviteToken) return;
    if (password !== confirm) {
      setErr("Şifre tekrar alanı eşleşmiyor.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await api("/api/auth/parent-invite/accept", {
        method: "POST",
        body: { token: inviteToken, fullName, email, phone, password },
      });
      setToken(r?.token || "");
      navigate("/parent/live");
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Parent Invite Kabul</div>
        <div className="muted" style={{ marginTop: 8 }}>
          {info ? `${info.company?.name || "Okul"} • ${info.child?.fullName || "Öğrenci"}` : "Invite bilgisi okunuyor..."}
        </div>
      </div>

      {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="title">Hesabını oluştur</div>
        <div className="muted" style={{ marginTop: 8, marginBottom: 12 }}>
          Okul sana ID/şifre vermez. Bu link üzerinden parent hesabını kendin oluşturursun.
        </div>
        <form onSubmit={onAccept} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <label className="muted">
            Ad Soyad
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="muted">
            E-posta
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="muted">
            Telefon (opsiyonel)
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="muted">
            Şifre
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="muted">
            Şifre tekrar
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="submit" disabled={busy}>{busy ? "..." : "Hesabı oluştur ve giriş yap"}</button>
            <button type="button" className="secondary" onClick={() => navigate("/")}>Login ekranına dön</button>
          </div>
        </form>
      </div>
    </div>
  );
}
