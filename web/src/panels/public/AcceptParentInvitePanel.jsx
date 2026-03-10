import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import GoogleLoginButton from "../../components/GoogleLoginButton";

function useInviteToken(path) {
  return useMemo(() => {
    const idx = String(path || "").indexOf("?");
    const search = idx >= 0 ? String(path).slice(idx + 1) : "";
    const qs = new URLSearchParams(search);
    return String(qs.get("token") || "").trim();
  }, [path]);
}

function errCodeOf(e) {
  return String(e?.payload?.error || e?.message || "").trim().toUpperCase();
}

function inviteStateMeta(code) {
  const c = String(code || "").trim().toUpperCase();
  if (c === "INVITE_REVOKED") return { terminal: true, title: "Link iptal edilmiş", body: "Bu invite okul tarafından revoke edilmiş. Bu linkle hesap oluşturulamaz." };
  if (c === "INVITE_CONSUMED") return { terminal: true, title: "Link kullanılmış", body: "Bu invite daha önce kabul edilmiş. Aynı link ikinci kez kullanılamaz." };
  if (c === "INVITE_EXPIRED") return { terminal: true, title: "Link süresi dolmuş", body: "Bu invite artık geçerli değil. Okuldan yeni invite linki iste." };
  if (c === "INVITE_NOT_FOUND") return { terminal: true, title: "Link bulunamadı", body: "Invite token geçersiz veya artık sistemde yok." };
  return { terminal: false, title: "", body: "" };
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
  const [inviteCode, setInviteCode] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);

  useEffect(() => {
    setInfo(null);
    setErr("");
    setInviteCode("");
    if (!inviteToken) {
      setErr("Invite token bulunamadı.");
      setInviteCode("INVITE_NOT_FOUND");
      return;
    }
    let off = false;
    setLoadingInfo(true);
    api(`/api/auth/parent-invite/info?token=${encodeURIComponent(inviteToken)}`)
      .then((r) => {
        if (off) return;
        setInfo(r?.invite || null);
        setFullName(r?.invite?.parentFullName || "");
        setEmail(r?.invite?.email || "");
        setPhone(r?.invite?.phone || "");
      })
      .catch((e) => {
        if (off) return;
        const code = errCodeOf(e);
        setInviteCode(code);
        setErr(code || String(e?.message || e));
      })
      .finally(() => {
        if (!off) setLoadingInfo(false);
      });
    return () => { off = true; };
  }, [inviteToken]);

  const stateMeta = inviteStateMeta(inviteCode);
  const formLocked = busy || loadingInfo || stateMeta.terminal || !inviteToken;

  async function onAccept(e) {
    e.preventDefault();
    if (!inviteToken || formLocked) return;
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
      const code = errCodeOf(e2);
      setInviteCode(code);
      setErr(code || String(e2?.message || e2));
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

      {stateMeta.terminal ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="title">{stateMeta.title}</div>
          <div className="muted" style={{ marginTop: 8 }}>{stateMeta.body}</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="secondary" onClick={() => navigate("/")}>Login ekranına dön</button>
          </div>
        </div>
      ) : null}

      {!stateMeta.terminal ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="title">Hesabını oluştur</div>
          <div className="muted" style={{ marginTop: 8, marginBottom: 12 }}>
            Okul sana ID/şifre vermez. Bu link üzerinden parent hesabını kendin oluşturursun. İstersen doğrulanmış Google hesabınla da devam edebilirsin.
          </div>

          <div style={{ marginBottom: 16 }}>
            <GoogleLoginButton
              inviteToken={inviteToken}
              onSuccess={(r) => {
                setToken(r?.token || "");
                navigate("/parent/live");
              }}
              onError={(e) => {
                const code = errCodeOf(e);
                setInviteCode(code);
                setErr(code || String(e?.message || e));
              }}
            />
          </div>

          <form onSubmit={onAccept} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <label className="muted">
              Ad Soyad
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={formLocked} />
            </label>
            <label className="muted">
              E-posta
              <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={formLocked} />
            </label>
            <label className="muted">
              Telefon (opsiyonel)
              <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={formLocked} />
            </label>
            <label className="muted">
              Şifre
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={formLocked} />
            </label>
            <label className="muted">
              Şifre tekrar
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={formLocked} />
            </label>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="submit" disabled={formLocked}>{busy ? "..." : "Hesabı oluştur ve giriş yap"}</button>
              <button type="button" className="secondary" onClick={() => navigate("/")}>Login ekranına dön</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
